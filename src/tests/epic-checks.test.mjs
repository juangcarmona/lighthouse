import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureEpicChecks } from '../packages/sdlc/src/epic-checks.mjs';

const repository = 'owner/repo', sourceRevision = 'a'.repeat(40), head = 'b'.repeat(40), candidate = 'c'.repeat(40);
const branch = `lighthouse/verification-7-${candidate}`;
function fixture(options = {}) {
  const target = options.subject === 'head' ? head : candidate;
  const branch = `lighthouse/verification-7-${target}`;
  let receipt = { state: 'linked', resource: { id: 70, number: 7 }, correlation: { kind: 'pull-request' }, publication: { head } };
  let ref = null, authorized = true, status = 'unavailable';
  const mutations = [], snapshots = [], runs = [];
  const profile = { schemaVersion: 1, profileVersion: 1, repository, intake: 'collaborators', requiredChecks: [{ context: 'repository', integrationId: 15368 }], requiredApprovals: 0, evidenceBranch: 'process/retrospectives', releaseWorkflowReady: true, completion: { publishEvidence: true, postMergeWorkflows: ['ci.yml'] } };
  const api = async (path, method = 'GET') => {
    assert.equal(method, 'GET', 'GITHUB_TOKEN must not create verification refs or dispatch CI');
    if (path.startsWith('contents/.lighthouse/github.json?')) return { content: Buffer.from(JSON.stringify(profile)).toString('base64') };
    if (path.startsWith('contents/.github/workflows/')) return { type: 'file', sha: options.changedWorkflow && path.endsWith(target) ? head : sourceRevision };
    if (path === `git/ref/heads/${branch}`) return ref;
    if (path.startsWith('actions/workflows/ci.yml/runs?')) {
      if (options.moveReference) ref.object.sha = head;
      return { total_count: options.incompleteInventory ? runs.length + 1 : runs.length, workflow_runs: runs };
    }
    throw Error(`Unexpected ${method} ${path}`);
  };
  const ciTrigger = async input => {
    assert.equal(snapshots.at(-1)[options.subject === 'head' ? 'headChecks' : 'checks'].reference, 'requested');
    await input.beforeWrite();
    mutations.push({ branch: input.branch, head: input.head });
    if (options.setupFailure) throw Object.assign(Error('App setup failed'), { referenceAttempted: false });
    if (!options.unobservedCreate) ref = { ref: 'refs/heads/' + input.branch, object: { sha: input.head } };
    if (!options.noRun) runs.push({ id: 101, head_sha: target, head_branch: branch, path: '.github/workflows/ci.yml', event: options.event ?? 'push', repository: { full_name: options.foreignRun ? 'other/repo' : repository } });
    if (!options.pending) status = 'passed';
    if (options.revokeAfterCreate) authorized = false;
    if (options.lostCreate) throw Object.assign(Error('lost create acknowledgement'), { referenceAttempted: true });
  };
  const args = { api, repository, sourceRevision, ciTrigger, ...(options.subject ? { subject: options.subject } : {}), observation: { pr: { id: 70, number: 7, head: { sha: head } }, base: sourceRevision, candidate }, key: 'key',
    journal: { readReceipt: async () => structuredClone(receipt), writeReceipt: async (_key, value) => { receipt = structuredClone(value); snapshots.push(structuredClone(value)); } },
    recheck: async () => authorized, checks: async () => [{ status }], wait: async () => {}, polls: 2 };
  return { args, mutations, snapshots, runs, run: () => ensureEpicChecks(args), setStatus: value => { status = value; } };
}

test('App push checks the exact integration commit with unchanged workflows and durable intent', async () => {
  const f = fixture();
  await f.run();
  assert.deepEqual(f.mutations, [{ branch, head: candidate }]);
  assert.equal(f.snapshots.at(-1).checks.identity.head, head);
  assert.equal(f.snapshots.at(-1).checks.identity.base, sourceRevision);
  assert.equal(f.snapshots.at(-1).checks.requests['ci.yml'].run, 101);
  await f.run();
  assert.equal(f.mutations.length, 1);
});

test('successful push is not successful validation and fresh readiness cannot repeat it', async () => {
  const f = fixture({ pending: true });
  await assert.rejects(f.run(), /checks remain pending/);
  f.setStatus('passed');
  await f.run();
  assert.equal(f.mutations.length, 1);
});

test('changed workflows, failed checks and absent App setup cannot write a reference', async () => {
  const changed = fixture({ changedWorkflow: true });
  await assert.rejects(changed.run(), /changed a trusted verification workflow/);
  const failed = fixture(); failed.setStatus('failed');
  await assert.rejects(failed.run(), /candidate CI failed/);
  const missing = fixture(); delete missing.args.ciTrigger;
  await assert.rejects(missing.run(), /LIGHTHOUSE_CI_APP_CLIENT_ID and LIGHTHOUSE_CI_APP_PRIVATE_KEY/);
  for (const f of [changed, failed, missing]) assert.equal(f.mutations.length, 0);
});

test('lost reference response reconciles the observed native push without another effect', async () => {
  const f = fixture({ lostCreate: true, pending: true });
  await assert.rejects(f.run(), /checks remain pending/);
  await assert.rejects(f.run(), /checks remain pending/);
  assert.equal(f.snapshots.at(-1).checks.requests['ci.yml'].run, 101);
  assert.equal(f.mutations.length, 1);
});

test('an unobserved reference write stops across fresh readiness requests', async () => {
  const f = fixture({ lostCreate: true, unobservedCreate: true, noRun: true, pending: true });
  await assert.rejects(f.run(), /lost create acknowledgement/);
  await assert.rejects(f.run(), /creation is unconfirmed/);
  assert.equal(f.mutations.length, 1);
});

test('a known App setup failure does not falsely consume the reference effect', async () => {
  const f = fixture({ setupFailure: true });
  await assert.rejects(f.run(), /App setup failed/);
  assert.equal(f.snapshots.at(-1).checks.reference, 'not-sent');
});

test('a pause after reference creation prevents readiness', async () => {
  const f = fixture({ revokeAfterCreate: true });
  await assert.rejects(f.run(), /authority changed while observing/);
  assert.equal(f.mutations.length, 1);
});

test('moved references, foreign runs and incomplete inventories cannot establish readiness', async () => {
  for (const options of [{ moveReference: true }, { incompleteInventory: true }, { foreignRun: true }]) {
    const f = fixture(options);
    await assert.rejects(f.run(), /reference changed|inventory is incomplete|checks remain pending/);
    assert.equal(f.mutations.length, 1);
  }
});

test('green workflow_dispatch cannot substitute for the verification push event', async () => {
  const f = fixture({ event: 'workflow_dispatch' });
  await assert.rejects(f.run(), /checks remain pending/);
  assert.equal(f.snapshots.at(-1).checks.requests['ci.yml'], undefined);
});

test('disappearing push evidence stops without repeating the effect', async () => {
  const f = fixture({ pending: true });
  await assert.rejects(f.run(), /checks remain pending/);
  f.runs.length = 0;
  await assert.rejects(f.run(), /evidence disappeared/);
  assert.equal(f.mutations.length, 1);
});

test('head and integration CI retain separate intents and never repeat a pending head push', async () => {
  const integration = fixture(), currentHead = fixture({ subject: 'head', pending: true, lostCreate: true });
  await integration.run();
  currentHead.args.journal = { readReceipt: integration.args.journal.readReceipt, writeReceipt: async (key, value) => { await integration.args.journal.writeReceipt(key, value); currentHead.snapshots.push(structuredClone(value)); } };
  await assert.rejects(currentHead.run(), /checks remain pending/);
  await assert.rejects(currentHead.run(), /checks remain pending/);
  assert.deepEqual(currentHead.mutations, [{ branch: `lighthouse/verification-7-${head}`, head }]);
  const receipt = await integration.args.journal.readReceipt('key');
  assert.equal(receipt.headChecks.identity.candidate, head);
  assert.equal(receipt.checks.identity.candidate, candidate);
  currentHead.setStatus('passed');
  await currentHead.run();
  assert.equal(currentHead.mutations.length, 1);
});

test('PR-head CI retains the same workflow, push-event, uncertainty and pause gates', async () => {
  for (const [options, message] of [
    [{ changedWorkflow: true }, /changed a trusted verification workflow/],
    [{ event: 'workflow_dispatch', pending: true }, /checks remain pending/],
    [{ revokeAfterCreate: true }, /authority changed/],
    [{ lostCreate: true, unobservedCreate: true, noRun: true, pending: true }, /lost create acknowledgement/],
  ]) {
    const f = fixture({ ...options, subject: 'head' });
    await assert.rejects(f.run(), message);
    const writes = f.mutations.length;
    await assert.rejects(f.run());
    assert.equal(f.mutations.length, writes);
  }
});
