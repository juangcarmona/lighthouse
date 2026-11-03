import { crc32, deflateRawSync } from 'node:zlib';

export function zip(entries, { zip64 = false } = {}) {
  const localParts = [], centralParts = [];
  let offset = 0;
  for (const { name: filename, content = '{}', method = 0, descriptor = false, advertisedSize } of entries) {
    const name = Buffer.from(filename), raw = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const data = method === 8 ? deflateRawSync(raw) : raw, checksum = crc32(raw), size = advertisedSize ?? raw.length;
    const flags = 0x800 | (descriptor ? 8 : 0);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(flags, 6); local.writeUInt16LE(method, 8);
    if (!descriptor) { local.writeUInt32LE(checksum, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(size, 22); }
    local.writeUInt16LE(name.length, 26);
    const trailer = Buffer.alloc(descriptor ? 16 : 0);
    if (descriptor) { trailer.writeUInt32LE(0x08074b50); trailer.writeUInt32LE(checksum, 4); trailer.writeUInt32LE(data.length, 8); trailer.writeUInt32LE(size, 12); }
    const central = Buffer.alloc(46), extra = Buffer.alloc(zip64 ? 28 : 0);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(flags, 8); central.writeUInt16LE(method, 10); central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(zip64 ? 0xffffffff : data.length, 20); central.writeUInt32LE(zip64 ? 0xffffffff : size, 24); central.writeUInt16LE(name.length, 28); central.writeUInt16LE(extra.length, 30); central.writeUInt32LE(zip64 ? 0xffffffff : offset, 42);
    if (zip64) { extra.writeUInt16LE(1); extra.writeUInt16LE(24, 2); extra.writeBigUInt64LE(BigInt(size), 4); extra.writeBigUInt64LE(BigInt(data.length), 12); extra.writeBigUInt64LE(BigInt(offset), 20); }
    localParts.push(local, name, data, trailer); centralParts.push(central, name, extra);
    offset += local.length + name.length + data.length + trailer.length;
  }
  const central = Buffer.concat(centralParts), end = Buffer.alloc(22), extended = [];
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(zip64 ? 0xffff : entries.length, 8); end.writeUInt16LE(zip64 ? 0xffff : entries.length, 10); end.writeUInt32LE(zip64 ? 0xffffffff : central.length, 12); end.writeUInt32LE(zip64 ? 0xffffffff : offset, 16);
  if (zip64) {
    const record = Buffer.alloc(56), locator = Buffer.alloc(20);
    record.writeUInt32LE(0x06064b50); record.writeBigUInt64LE(44n, 4); record.writeUInt16LE(45, 12); record.writeUInt16LE(45, 14); record.writeBigUInt64LE(BigInt(entries.length), 24); record.writeBigUInt64LE(BigInt(entries.length), 32); record.writeBigUInt64LE(BigInt(central.length), 40); record.writeBigUInt64LE(BigInt(offset), 48);
    locator.writeUInt32LE(0x07064b50); locator.writeBigUInt64LE(BigInt(offset + central.length), 8); locator.writeUInt32LE(1, 16);
    extended.push(record, locator);
  }
  return Buffer.concat([...localParts, central, ...extended, end]);
}
