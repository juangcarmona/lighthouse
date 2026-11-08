import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

test('an isolated packed consumer imports the public SDK, parser and schema without ambient credentials', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-issue-sdk-'));
  try {
    const packed = spawnSync('npm', ['pack', '--workspace', '@juangcarmona/lighthouse-sdlc', '--pack-destination', directory, '--json'], { encoding: 'utf8' });
    assert.equal(packed.status, 0, packed.stderr);
    const [artifact] = JSON.parse(packed.stdout);
    for (const required of ['issue-control.md', 'schemas/issue-control-intent.schema.json', 'src/issue-control.mjs', 'src/issue-control-actions.mjs', 'src/issue-control-native.mjs'])
      assert.ok(artifact.files.some(file => file.path === required), required);
    const target = join(directory, 'node_modules/@juangcarmona/lighthouse-sdlc'); await mkdir(target, { recursive: true });
    const unpacked = spawnSync('tar', ['-xzf', join(directory, artifact.filename), '--strip-components=1', '-C', target]);
    assert.equal(unpacked.status, 0);
    await writeFile(join(directory, 'consumer.mjs'), `
import assert from 'node:assert/strict';
globalThis.fetch = () => { throw Error('Ambient network forbidden'); };
const { createIssueControl, parseIssueComment, parseIssueIntent, validateIssueIntent } = await import('@juangcarmona/lighthouse-sdlc/issue-control');
const { default: schema } = await import('@juangcarmona/lighthouse-sdlc/schemas/issue-control-intent.schema.json', { with: { type: 'json' } });
assert.equal(schema.oneOf.length, 4);
assert.equal(parseIssueComment({ body: 'A plain GitHub comment' }).kind, 'legacy');
assert.equal(parseIssueComment({ body: '<!-- lighthouse-issue-control:v99:unsupported -->' }).kind, 'invalid');
assert.throws(() => createIssueControl({ repository: 'owner/repo' }), /explicit authenticated/);
assert.throws(() => parseIssueIntent('{}'), /unsupported/);
assert.throws(() => validateIssueIntent({ version: 2 }), /unsupported/);
const calls = [];
const sdk = createIssueControl({ repository: 'owner/repo', transport: async request => { calls.push(request); return request.scope === 'account' ? { id: 11, type: 'User', login: 'owner' } : { id: 22, full_name: 'foreign/repo', owner: { id: 11, type: 'User' } }; }, readArtifact: async () => { throw Error('No artifact read is authorized'); }, readAuthority: async () => null });
assert.equal((await sdk.observe({ number: 7 })).availability, 'unavailable');
assert.equal(calls.length, 2); assert.ok(calls.every(call => call.method === 'GET'));
`);
    const run = spawnSync(process.execPath, ['consumer.mjs'], { cwd: directory, encoding: 'utf8', env: { PATH: process.env.PATH } });
    assert.equal(run.status, 0, run.stderr);
    const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
    assert.equal(manifest.exports['./issue-control'], './src/issue-control.mjs');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
