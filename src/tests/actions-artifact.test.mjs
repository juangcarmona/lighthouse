import test from 'node:test';
import assert from 'node:assert/strict';
import { readActionsJson } from '../packages/sdlc/src/actions-artifact.mjs';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { readZipJson } from '../packages/sdlc/src/zip-json.mjs';
import { zip } from './fixtures/zip.mjs';

test('optional recovery evidence distinguishes confirmed absence from incomplete or expired inventories', async () => {
  assert.equal(await readActionsJson(async () => ({ total_count: 0, artifacts: [] }), 'owner/repo', 100, 'result', 'envelope.json', true), null);
  for (const inventory of [
    { total_count: 1, artifacts: [] },
    { total_count: 101, artifacts: [] },
    { total_count: 1, artifacts: [{ name: 'result', expired: true, size_in_bytes: 10 }] },
    { total_count: 2, artifacts: [{ name: 'result', size_in_bytes: 10 }, { name: 'result', size_in_bytes: 10 }] },
  ]) await assert.rejects(readActionsJson(async () => inventory, 'owner/repo', 100, 'result', 'envelope.json', true), /inventory|bound|unavailable/);
});

test('production archive reader distinguishes an absent envelope from empty, null and malformed members without another interpreter', async t => {
  let bytes;
  t.mock.method(childProcess, 'execFileSync', (command, args, options) => {
    assert.equal(command, 'gh');
    assert.deepEqual(args, ['api', 'repos/owner/repo/actions/artifacts/1/zip']);
    assert.equal(options.maxBuffer, 2 * 1024 * 1024);
    return bytes;
  });
  syncBuiltinESMExports();
  try {
    const api = async () => ({ total_count: 1, artifacts: [{ id: 1, name: 'result', expired: false, size_in_bytes: 1024 }] });
    for (const content of [undefined, '', 'null', '{', '{"status":"blocked"}']) {
      bytes = zip([{ name: content === undefined ? 'runtime.json' : 'envelope.json', content: content ?? '{}' }]);
      const read = () => readActionsJson(api, 'owner/repo', 100, 'result', 'envelope.json', true);
      if (content === undefined) assert.equal(await read(), null);
      else if (content === '{"status":"blocked"}') assert.deepEqual(await read(), { status: 'blocked' });
      else await assert.rejects(read());
    }
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
});

test('ZIP reader accepts stored, deflated, streaming descriptors and ZIP64 members', () => {
  for (const method of [0, 8]) for (const descriptor of [false, true]) for (const zip64 of [false, true]) {
    const bytes = zip([{ name: 'request.json', content: '{"message":"á🙂"}', method, descriptor }], { zip64 });
    assert.deepEqual(readZipJson(bytes, 'request.json'), { message: 'á🙂' });
  }
  const exact = JSON.stringify('x'.repeat(127998));
  assert.equal(Buffer.byteLength(exact), 128000);
  assert.equal(readZipJson(zip([{ name: 'request.json', content: exact, method: 8 }]), 'request.json').length, 127998);
});

test('ZIP reader preserves absence semantics and rejects duplicates and invalid JSON', () => {
  const bytes = zip([{ name: 'runtime.json' }]);
  assert.equal(readZipJson(bytes, 'request.json', true), null);
  assert.throws(() => readZipJson(bytes, 'request.json'), /absent/);
  for (const content of ['', '{', 'null']) assert.throws(() => readZipJson(zip([{ name: 'request.json', content }]), 'request.json', true));
  assert.equal(readZipJson(zip([{ name: 'request.json', content: 'null' }]), 'request.json'), null);
  assert.throws(() => readZipJson(zip([{ name: 'request.json' }, { name: 'request.json' }]), 'request.json', true), /Duplicate/);
});

test('ZIP reader bounds archives and decompression and verifies integrity', () => {
  const entry = { name: 'request.json', content: '{"safe":true}', method: 8 };
  const bytes = zip([entry]);
  assert.throws(() => readZipJson(Buffer.alloc(2 * 1024 * 1024 + 1), entry.name));
  for (const cut of [1, 10, 30]) assert.throws(() => readZipJson(bytes.subarray(0, bytes.length - cut), entry.name));
  for (const advertisedSize of [128001, 1]) assert.throws(() => readZipJson(zip([{ ...entry, advertisedSize }]), entry.name));
  assert.throws(() => readZipJson(zip([{ ...entry, content: JSON.stringify('x'.repeat(130000)), advertisedSize: 10 }]), entry.name));
  const corrupt = Buffer.from(bytes), central = corrupt.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  corrupt.writeUInt32LE(0, central + 16);
  assert.throws(() => readZipJson(corrupt, entry.name), /CRC/);
  const encrypted = Buffer.from(bytes); encrypted.writeUInt16LE(0x801, central + 8);
  assert.throws(() => readZipJson(encrypted, entry.name));
  const unsupported = zip([{ ...entry, method: 12 }]);
  assert.throws(() => readZipJson(unsupported, entry.name));
  const invalidUtf8 = zip([{ ...entry, method: 0, content: Buffer.from([0x22, 0xff, 0x22]) }]);
  assert.throws(() => readZipJson(invalidUtf8, entry.name));
  const traversal = Buffer.from(bytes); traversal[30] = 46;
  assert.throws(() => readZipJson(traversal, entry.name));
  const bad64 = zip([entry], { zip64: true }); bad64.writeBigUInt64LE(2n ** 60n, bad64.length - 34);
  assert.throws(() => readZipJson(bad64, entry.name));
});
