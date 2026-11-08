import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createIssueControlManifest, readIssueControlCapability, readIssueControlPolicy } from '../packages/sdlc/src/issue-control-contract.mjs';

const router = '# lighthouse-issue-control:v1\n' + readFileSync(new URL('../packages/sdlc/workflows/lighthouse-sdlc-router.yml', import.meta.url), 'utf8')
  .replace('  client-control:\n    if: >-\n      false &&', '  client-control:\n    if: >-\n      true &&')
  .replace('LIGHTHOUSE_ENABLED_STAGES: triage,refine,propose,implement,integrate,review', 'LIGHTHOUSE_ENABLED_STAGES: triage,refine,propose')
  .replace('LIGHTHOUSE_AUTO_IMPLEMENT: true', 'LIGHTHOUSE_AUTO_IMPLEMENT: false').replaceAll('LIGHTHOUSE_COMPLETION_ENABLED: true', 'LIGHTHOUSE_COMPLETION_ENABLED: false');
function file(text) {
  const bytes = Buffer.from(text);
  return { type: 'file', size: bytes.length, encoding: 'base64', content: bytes.toString('base64'),
    sha: createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') };
}
function fixture() {
  const state = { router, manifest: JSON.stringify(createIssueControlManifest(router)), calls: [] };
  const api = async (path, method = 'GET') => { state.calls.push({ path, method }); return file(path.includes('issue-control.json') ? state.manifest : state.router); };
  return { state, api, sourceRevision: 'a'.repeat(40) };
}

test('installed source advertises only the exact committed official router configuration', async () => {
  const f = fixture(); const result = await readIssueControlCapability(f);
  assert.equal(result.availability, 'available'); assert.deepEqual(result.stages, ['triage', 'refine', 'propose']); assert.equal(result.autoImplement, false);
  assert.ok(f.state.calls.every(call => call.method === 'GET' && call.path.endsWith('ref=' + f.sourceRevision)));
  f.state.router = router.replace('AUTO_IMPLEMENT: false', 'AUTO_IMPLEMENT: true');
  assert.equal((await readIssueControlCapability(f)).availability, 'unsupported');
});

test('wrong version, added fields, symlinks and provider content tampering are unsupported', async () => {
  const f = fixture();
  for (const change of [{ contractVersion: 2 }, { extra: 'unknown' }, { stages: ['refine'] }]) {
    f.state.manifest = JSON.stringify({ ...createIssueControlManifest(router), ...change });
    assert.equal((await readIssueControlCapability(f)).availability, 'unsupported');
  }
  for (const delta of [{ type: 'symlink' }, { sha: '0'.repeat(40) }, { content: 'not-base64' }])
    assert.equal((await readIssueControlCapability({ ...f, api: async () => ({ ...file('{}'), ...delta }) })).availability, 'unsupported');
});

test('capability byte limits reject excess instead of truncating source evidence', async () => {
  const f = fixture(); const base = f.state.manifest;
  f.state.manifest = base + ' '.repeat(16384 - Buffer.byteLength(base));
  assert.equal((await readIssueControlCapability(f)).availability, 'available');
  f.state.manifest += ' '; assert.equal((await readIssueControlCapability(f)).availability, 'unsupported');
  for (const extra of [0, 1]) {
    f.state.router = router + '#'.repeat(128 * 1024 + extra - Buffer.byteLength(router));
    f.state.manifest = JSON.stringify(createIssueControlManifest(f.state.router));
    assert.equal((await readIssueControlCapability(f)).availability, extra ? 'unsupported' : 'available');
  }
});

test('injected provider facts and source environment yield identical policy without ambient network', async () => {
  const f = fixture(); const original = globalThis.fetch; globalThis.fetch = () => { throw Error('Ambient network is forbidden'); };
  try {
    const capability = await readIssueControlCapability(f);
    const variables = { LIGHTHOUSE_AUTOMATION_ENABLED: 'true', LIGHTHOUSE_EPIC_ENABLED: 'false' };
    const source = await readIssueControlPolicy({ capability, variables });
    const user = await readIssueControlPolicy({ capability, api: async (path, method) => {
      assert.equal(method, 'GET'); const name = path.split('/').at(-1); return { name, value: variables[name] };
    } });
    assert.deepEqual(user, source); assert.equal(user.automationEnabled, true);
    assert.equal((await readIssueControlPolicy({ capability, api: async () => null })).automationEnabled, false);
    await assert.rejects(readIssueControlPolicy({ capability, api: async () => ({ name: 'wrong', value: 'true' }) }), /Policy source/);
  } finally { globalThis.fetch = original; }
});

test('disabled or missing source admission cannot advertise the client contract', () => {
  for (const altered of [router.replace('true && github.actor', 'false && github.actor'), router.replace('issue-control-actions.mjs admit', 'missing-script.mjs admit')])
    assert.throws(() => createIssueControlManifest(altered), /entry contract/);
});
