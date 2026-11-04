import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureEpicChecks } from '../packages/sdlc/src/epic-checks.mjs';

const repository = 'owner/repo', sourceRevision = 'a'.repeat(40), head = 'b'.repeat(40), candidate = 'c'.repeat(40);
const branch = `lighthouse/verification-7-${candidate}`;
function fixture(options = {}) {
  let receipt = { state: 'linked', resource: { id: 70, number: 7 }, correlation: { kind: 'pull-request' }, publication: { head } };
  let ref = null, authorized = true, status = 'unavailable';
  const mutations = [], snapshots = [], runs = [];
  const profile = { schemaVersion: 1, profileVersion: 1, repository, intake: 'collaborators', requiredChecks: [{ context: 'repository', integrationId: 15368 }], requiredApprovals: 0, evidenceBranch: 'process/retrospectives', releaseWorkflowReady: true, completion: { publishEvidence: true, postMergeWorkflows: ['ci.yml'] } };
  const api = async (path, method = 'GET', body) => {
    if (method !== 'GET') mutations.push({ path, method, body });
    if (path.startsWith('contents/.lighthouse/github.json?')) return { content: Buffer.from(JSON.stringify(profile)).toString('base64') };
    if (path.startsWith('contents/.github/workflows/')) return { type: 'file', sha: options.changedWorkflow && path.endsWith(candidate) ? head : sourceRevision };
    if (path === `git/ref/heads/${branch}`) return ref;
    if (path === 'git/refs' && method === 'POST') {
      assert.equal(snapshots.at(-1).checks.reference, 'requested');
      ref = { ref: body.ref, object: { sha: body.sha } };
      if (options.revokeAfterCreate) authorized = false;
      if (options.lostCreate) throw Error('lost create acknowledgement');
      return ref;
    }
    if (path.startsWith('actions/workflows/ci.yml/runs?')) return { total_count: runs.length, workflow_runs: runs };
    if (path === 'actions/workflows/ci.yml/dispatches' && method === 'POST') {
      assert.equal(snapshots.at(-1).checks.requests['ci.yml'].state, 'requested');
      assert.equal(body.ref, branch);
      if (!options.unobservedDispatch) runs.push({ id: 101, head_sha: candidate, head_branch: branch, path: '.github/workflows/ci.yml', event: 'workflow_dispatch', repository: { full_name: repository } });
      if (!options.pending) status = 'passed';
      if (options.lostDispatch) throw Error('lost dispatch acknowledgement');
      return null;
    }
    throw Error(`Unexpected ${method} ${path}`);
  };
  const args = { api, repository, sourceRevision, observation: { pr: { id: 70, number: 7, head: { sha: head } }, base: sourceRevision, candidate }, key: 'key',
    journal: { readReceipt: async () => structuredClone(receipt), writeReceipt: async (_key, value) => { receipt = structuredClone(value); snapshots.push(structuredClone(value)); } },
    recheck: async () => authorized, checks: async () => [{ status }], wait: async () => {}, polls: 2 };
  return { args, mutations, snapshots, run: () => ensureEpicChecks(args), setStatus: value => { status = value; } };
}

test('CI checks the exact integration commit with unchanged trusted workflows and durable effect intent', async () => {
  const f = fixture();
  await f.run();
  assert.deepEqual(f.mutations.map(value => value.path), ['git/refs', 'actions/workflows/ci.yml/dispatches']);
  assert.equal(f.mutations[0].body.sha, candidate);
  assert.equal(f.snapshots.at(-1).checks.identity.head, head);
  assert.equal(f.snapshots.at(-1).checks.identity.base, sourceRevision);
  await f.run();
  assert.equal(f.mutations.length, 2);
});

test('successful dispatch is not successful validation', async () => {
  const f = fixture({ pending: true });
  await assert.rejects(f.run(), /checks remain pending/);
  assert.equal(f.mutations.length, 2);
  f.setStatus('passed');
  await f.run();
  assert.equal(f.mutations.length, 2);
});

test('a changed validation workflow or failed checks cannot request a new CI effect', async () => {
  const f = fixture({ changedWorkflow: true });
  await assert.rejects(f.run(), /changed a trusted verification workflow/);
  assert.equal(f.mutations.length, 0);
  const failed = fixture(); failed.setStatus('failed');
  await assert.rejects(failed.run(), /candidate CI failed/);
  assert.equal(failed.mutations.length, 0);
});

test('a lost reference response reconciles its immutable SHA without a second creation', async () => {
  const f = fixture({ lostCreate: true });
  await f.run();
  assert.equal(f.mutations.filter(value => value.path === 'git/refs').length, 1);
});

test('lost CI acknowledgement reconciles an observed run without redispatch', async () => {
  const f = fixture({ lostDispatch: true, pending: true });
  await assert.rejects(f.run(), /lost dispatch acknowledgement/);
  await assert.rejects(f.run(), /checks remain pending/);
  assert.equal(f.snapshots.at(-1).checks.requests['ci.yml'].run, 101);
  assert.equal(f.mutations.filter(value => value.path.endsWith('/dispatches')).length, 1);
});

test('unobserved CI dispatch remains stopped across a fresh readiness request', async () => {
  const f = fixture({ lostDispatch: true, unobservedDispatch: true, pending: true });
  await assert.rejects(f.run(), /lost dispatch acknowledgement/);
  await assert.rejects(f.run(), /dispatch is unconfirmed/);
  assert.equal(f.mutations.filter(value => value.path.endsWith('/dispatches')).length, 1);
});

test('a pause after reference creation prevents dependent CI dispatch', async () => {
  const f = fixture({ revokeAfterCreate: true });
  await assert.rejects(f.run(), /authority changed before CI dispatch/);
  assert.deepEqual(f.mutations.map(value => value.path), ['git/refs']);
});
