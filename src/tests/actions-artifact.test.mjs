import test from 'node:test';
import assert from 'node:assert/strict';
import { readActionsJson } from '../packages/sdlc/src/actions-artifact.mjs';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { readZipJson } from '../packages/sdlc/src/zip-json.mjs';
import { zip } from './fixtures/zip.mjs';

const artifactValue = { runId: 100, repository: 'owner/repo', status: 'blocked' };
const artifactZip = () => zip([{ name: 'envelope.json', content: JSON.stringify(artifactValue) }]);
const httpFailure = (status, stderr = `gh: Service response (HTTP ${status})\n`) => Object.assign(Error(`Command failed: gh api artifact GET\n${stderr}`), {
  status: 1, signal: null, stderr: Buffer.from(stderr), stdout: Buffer.alloc(0),
});

async function exerciseDownload(t, outcomes, { error, invalid = false, optional = false, value = artifactValue } = {}) {
  let gets = 0, inventories = 0;
  const token = ['synthetic', 'artifact', 'credential'].join('-');
  const originalToken = process.env.GH_TOKEN;
  process.env.GH_TOKEN = token;
  t.mock.method(childProcess, 'execFileSync', (command, args, options) => {
    assert.equal(command, 'gh');
    assert.deepEqual(args, ['api', 'repos/owner/repo/actions/artifacts/27/zip']);
    assert.deepEqual(options, { maxBuffer: 2 * 1024 * 1024, timeout: 30000 });
    assert.equal(process.env.GH_TOKEN, token);
    assert.ok(gets < outcomes.length, 'no extra GET after success, validation or terminal failure');
    const outcome = outcomes[gets++];
    if (outcome instanceof Error) throw outcome;
    return outcome;
  });
  syncBuiltinESMExports();
  try {
    const api = async path => {
      inventories++;
      assert.equal(path, 'actions/runs/100/artifacts?per_page=100');
      return { total_count: 2, artifacts: [
        { id: 26, name: 'other', size_in_bytes: 10 },
        { id: 27, name: 'result', expired: false, size_in_bytes: 1024 },
      ] };
    };
    const read = readActionsJson(api, 'owner/repo', 100, 'result', 'envelope.json', optional);
    if (error) {
      const diagnostic = error.stderr;
      await assert.rejects(read, actual => actual === error && actual.stderr === diagnostic);
    } else if (invalid) await assert.rejects(read);
    else assert.deepEqual(await read, value);
    assert.equal(gets, outcomes.length);
    assert.equal(inventories, 1);
  } finally {
    if (originalToken === undefined) delete process.env.GH_TOKEN;
    else process.env.GH_TOKEN = originalToken;
    t.mock.restoreAll(); syncBuiltinESMExports();
  }
}

test('immutable artifact GET retries only confirmed transients, with identical identity, credentials and limits', async t => {
  await exerciseDownload(t, [artifactZip()]);
  for (const status of [502, 503, 504]) {
    await exerciseDownload(t, [httpFailure(status), artifactZip()]);
    await exerciseDownload(t, [httpFailure(status, `gh: HTTP ${status}\n`), artifactZip()]);
  }
  await exerciseDownload(t, [httpFailure(502), httpFailure(504), artifactZip()]);
  const stringStderr = Object.assign(httpFailure(503), { stderr: 'gh: Service Unavailable (HTTP 503)\n' });
  await exerciseDownload(t, [stringStderr, artifactZip()]);
});

test('transient exhaustion preserves the exact final command failure', async t => {
  for (const status of [502, 503, 504]) {
    for (const diagnostic of [`gh: Service response (HTTP ${status})\n`, `gh: HTTP ${status}\n`]) {
      const errors = Array.from({ length: 3 }, () => httpFailure(status, diagnostic));
      await exerciseDownload(t, errors, { error: errors[2] });
    }
  }
});

test('terminal and uncertain command failures never retry, initially or following a transient', async t => {
  const errors = [
    ...[400, 401, 403, 404, 408, 429, 500, 501, 505].flatMap(status => [httpFailure(status), httpFailure(status, `gh: HTTP ${status}\n`)]),
    Error('unknown download failure'),
    ...[502, 503, 504].flatMap(status => [
      Object.assign(Error(String(status)), { status }),
      httpFailure(status, String(status)),
      httpFailure(status, `HTTP ${status}`),
      httpFailure(status, `gh: Service response (HTTP ${status}0)`),
    ]),
    httpFailure(503, 'gh: Service Unavailable (HTTP 503)\ngh: Forbidden (HTTP 403)\n'),
    httpFailure(503, 'gh: HTTP 403 (HTTP 503)'),
    httpFailure(503, 'gh: HTTP 503\ngh: HTTP 403\n'),
    httpFailure(503, 'gh: HTTP 503 trailing text'),
    httpFailure(503, 'proxy: Service Unavailable (HTTP 503)'),
    httpFailure(503, 'gh: Service Unavailable (HTTP 503) trailing text'),
    Object.assign(httpFailure(503), { status: 0 }),
    Object.assign(httpFailure(503), { status: null }),
    Object.assign(httpFailure(503), { status: '1' }),
    Object.assign(httpFailure(503), { stderr: undefined }),
    Object.assign(Error('gh: Service Unavailable (HTTP 503)'), { status: 1, stdout: Buffer.from('gh: Service Unavailable (HTTP 503)') }),
    ...['ENOENT', 'ETIMEDOUT', 'ENOBUFS', 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', 'EIO'].map(code => Object.assign(httpFailure(503), { code })),
    Object.assign(httpFailure(503), { signal: 'SIGTERM' }),
    Object.assign(httpFailure(503), { killed: true }),
  ];
  for (const error of errors) for (const prefix of [[], [httpFailure(502)]]) {
    await exerciseDownload(t, [...prefix, error], { error });
  }
});

test('inventory failures and selection boundaries do not retry inventory or download', async t => {
  const inventoryError = httpFailure(503);
  let gets = 0;
  t.mock.method(childProcess, 'execFileSync', () => { gets++; throw Error('unexpected GET'); });
  syncBuiltinESMExports();
  try {
    for (const inventory of [
      inventoryError,
      { total_count: 0, artifacts: [] },
      { total_count: 1, artifacts: [] },
      { total_count: 1, artifacts: null },
      { total_count: 101, artifacts: [] },
      { total_count: 1, artifacts: [{ name: 'result', expired: true }] },
      { total_count: 2, artifacts: [{ name: 'result' }, { name: 'result' }] },
      { total_count: 1, artifacts: [{ name: 'result', size_in_bytes: 2 * 1024 * 1024 + 1 }] },
    ]) for (const optional of [false, true]) {
      let calls = 0;
      const read = readActionsJson(async () => {
        calls++;
        if (inventory instanceof Error) throw inventory;
        return inventory;
      }, 'owner/repo', 100, 'result', 'envelope.json', optional);
      if (optional && inventory.total_count === 0) assert.equal(await read, null);
      else if (inventory === inventoryError) await assert.rejects(read, error => error === inventoryError);
      else await assert.rejects(read);
      assert.equal(calls, 1);
      assert.equal(gets, 0);
    }
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
});

test('archive validation and optional absence stay outside retries, including after transient GETs', async t => {
  const member = { name: 'envelope.json', content: '{"safe":true}', method: 8 };
  const corrupt = zip([member]);
  corrupt.writeUInt32LE(0, corrupt.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02])) + 16);
  const badDeflate = zip([member]);
  badDeflate[30 + Buffer.byteLength(member.name)] = 0x07;
  const invalidArchives = [
    Buffer.from('not a ZIP'),
    Buffer.alloc(2 * 1024 * 1024 + 1),
    artifactZip().subarray(0, -10),
    zip([{ name: 'runtime.json' }]),
    zip([member, member]),
    ...['', '{'].map(content => zip([{ ...member, content }])),
    zip([{ ...member, method: 0, content: Buffer.from([0x22, 0xff, 0x22]) }]),
    ...[1, 2 * 1024 * 1024 + 1].map(advertisedSize => zip([{ ...member, advertisedSize }])),
    zip([{ ...member, content: JSON.stringify('x'.repeat(2 * 1024 * 1024 + 1)), advertisedSize: 10 }]),
    corrupt, badDeflate,
  ];
  for (const prefix of [[], [httpFailure(503)]]) {
    for (const bytes of invalidArchives) await exerciseDownload(t, [...prefix, bytes], { invalid: true });
    await exerciseDownload(t, [...prefix, zip([{ name: 'runtime.json' }])], { optional: true, value: null });
    await exerciseDownload(t, [...prefix, zip([{ ...member, content: 'null' }])], { optional: true, invalid: true });
    await exerciseDownload(t, [...prefix, zip([{ ...member, content: 'null' }])], { value: null });
    for (const method of [0, 8]) for (const descriptor of [false, true]) for (const zip64 of [false, true]) {
      await exerciseDownload(t, [...prefix, zip([{ ...member, content: JSON.stringify(artifactValue), method, descriptor }], { zip64 })]);
    }
  }
});

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
  const limit = 2 * 1024 * 1024;
  const exact = JSON.stringify('x'.repeat(limit - 2));
  assert.equal(Buffer.byteLength(exact), limit);
  assert.equal(readZipJson(zip([{ name: 'candidate.json', content: exact, method: 8 }]), 'candidate.json').length, limit - 2);
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
  for (const advertisedSize of [2 * 1024 * 1024 + 1, 1]) assert.throws(() => readZipJson(zip([{ ...entry, advertisedSize }]), entry.name));
  assert.throws(() => readZipJson(zip([{ ...entry, content: JSON.stringify('x'.repeat(130000)), advertisedSize: 10 }]), entry.name));
  for (const advertisedSize of [10, 2 * 1024 * 1024 + 3]) assert.throws(() => readZipJson(zip([{ ...entry, content: JSON.stringify('x'.repeat(2 * 1024 * 1024 + 1)), advertisedSize }]), entry.name));
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
