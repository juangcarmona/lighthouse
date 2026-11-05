import { crc32, inflateRawSync } from 'node:zlib';

const ARCHIVE_LIMIT = 2 * 1024 * 1024;
// Match the bounded JSON files accepted by the execution artifact producer.
const MEMBER_LIMIT = ARCHIVE_LIMIT;
const invalid = () => Error('Invalid or unsupported artifact ZIP');

function range(bytes, offset, length) {
  if (!Number.isSafeInteger(offset) || offset < 0 || length < 0 || offset + length > bytes.length) throw invalid();
}

function integer64(bytes, offset) {
  range(bytes, offset, 8);
  const value = bytes.readBigUInt64LE(offset);
  if (value > BigInt(ARCHIVE_LIMIT)) throw invalid();
  return Number(value);
}

function directory(bytes) {
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50 && offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length) { end = offset; break; }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) throw invalid();
  let count = bytes.readUInt16LE(end + 10), size = bytes.readUInt32LE(end + 12), start = bytes.readUInt32LE(end + 16), boundary = end;
  if (bytes.readUInt16LE(end + 8) !== count) throw invalid();
  if (count === 0xffff || size === 0xffffffff || start === 0xffffffff) {
    range(bytes, end - 20, 20);
    if (bytes.readUInt32LE(end - 20) !== 0x07064b50 || bytes.readUInt32LE(end - 16) || bytes.readUInt32LE(end - 4) !== 1) throw invalid();
    const record = integer64(bytes, end - 12);
    range(bytes, record, 56);
    const recordSize = integer64(bytes, record + 4);
    if (bytes.readUInt32LE(record) !== 0x06064b50 || recordSize < 44 || record + 12 + recordSize !== end - 20 || bytes.readUInt32LE(record + 16) || bytes.readUInt32LE(record + 20)) throw invalid();
    count = integer64(bytes, record + 32);
    if (integer64(bytes, record + 24) !== count) throw invalid();
    size = integer64(bytes, record + 40); start = integer64(bytes, record + 48); boundary = record;
  }
  range(bytes, start, size);
  if (count > 4096 || start + size !== boundary) throw invalid();
  return { count, start, size };
}

function extendedEntry(extra, values) {
  let position = 0, zip64;
  while (position < extra.length) {
    range(extra, position, 4);
    const id = extra.readUInt16LE(position), length = extra.readUInt16LE(position + 2);
    range(extra, position + 4, length);
    if (id === 1) { if (zip64) throw invalid(); zip64 = extra.subarray(position + 4, position + 4 + length); }
    position += 4 + length;
  }
  let index = 0;
  return values.map(value => {
    if (value !== 0xffffffff) return value;
    if (!zip64) throw invalid();
    const actual = integer64(zip64, index); index += 8;
    return actual;
  });
}

export function readZipJson(bytes, file, optional = false) {
  if (!Buffer.isBuffer(bytes) || bytes.length > ARCHIVE_LIMIT || typeof file !== 'string' || !file) throw invalid();
  const { count, start, size } = directory(bytes);
  let offset = start, selected;
  for (let index = 0; index < count; index++) {
    range(bytes, offset, 46);
    if (bytes.readUInt32LE(offset) !== 0x02014b50 || bytes.readUInt16LE(offset + 34)) throw invalid();
    const nameLength = bytes.readUInt16LE(offset + 28), extraLength = bytes.readUInt16LE(offset + 30), commentLength = bytes.readUInt16LE(offset + 32);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > start + size) throw invalid();
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength);
    if (name.equals(Buffer.from(file))) {
      if (selected) throw Error('Duplicate artifact member');
      const extra = bytes.subarray(offset + 46 + nameLength, offset + 46 + nameLength + extraLength);
      const [uncompressed, compressed, local] = extendedEntry(extra, [bytes.readUInt32LE(offset + 24), bytes.readUInt32LE(offset + 20), bytes.readUInt32LE(offset + 42)]);
      selected = { name, uncompressed, compressed, local, flags: bytes.readUInt16LE(offset + 8), method: bytes.readUInt16LE(offset + 10), checksum: bytes.readUInt32LE(offset + 16) };
    }
    offset = next;
  }
  if (offset !== start + size) throw invalid();
  if (!selected) { if (optional) return null; throw Error('Required artifact member is absent'); }
  const { uncompressed, compressed, local, flags, method, checksum, name } = selected;
  if (!uncompressed || uncompressed > MEMBER_LIMIT || flags & 0x41 || ![0, 8].includes(method)) throw invalid();
  range(bytes, local, 30);
  if (bytes.readUInt32LE(local) !== 0x04034b50 || bytes.readUInt16LE(local + 6) !== flags || bytes.readUInt16LE(local + 8) !== method) throw invalid();
  const nameLength = bytes.readUInt16LE(local + 26), extraLength = bytes.readUInt16LE(local + 28);
  const dataStart = local + 30 + nameLength + extraLength;
  range(bytes, local + 30, nameLength + extraLength);
  if (dataStart + compressed > start || !bytes.subarray(local + 30, local + 30 + nameLength).equals(name)) throw invalid();
  const data = bytes.subarray(dataStart, dataStart + compressed);
  const content = method === 0 ? data : inflateRawSync(data, { maxOutputLength: MEMBER_LIMIT });
  if (content.length !== uncompressed || crc32(content) !== checksum) throw Error('Artifact member size or CRC mismatch');
  const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(content));
  if (optional && value === null) throw Error('Artifact member contains no result object');
  return value;
}
