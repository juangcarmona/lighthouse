import test from 'node:test';
import assert from 'node:assert/strict';
import { scanHousekeeping, inspectHousekeepingItem, publishHousekeepingSummary, readHousekeepingSummary, housekeepingFreshness, observeDailyCoverage, housekeepingReconciler } from '../packages/sdlc/src/repository-housekeeping.mjs';
import { dispatchId } from '../packages/sdlc/src/stage-dispatch.mjs';
import { housekeepingScope } from '../packages/sdlc/src/worker-maintenance.mjs';

const now = Date.parse('2026-11-15T12:00:00.000Z');
const options = { api: async () => { throw Error('Unexpected effect'); }, repository: 'owner/repo', owner: 'owner', run: { id: 10, attempt: 1 }, now: () => now };
const inspected = async (_api, _repo, _owner, issue) => ({ issue, url: `https://github.com/owner/repo/issues/${issue}`, status: 'inspected', nextActions: [] });

test('repository inspection requires explicit opt-in and preserves the recovery issue restriction', () => {
  const recovery = [53, 119];
  assert.equal(housekeepingScope({}, recovery), recovery);
  assert.equal(housekeepingScope({ LIGHTHOUSE_HOUSEKEEPING_REPOSITORY: 'false' }, recovery), recovery);
  assert.equal(housekeepingScope({ LIGHTHOUSE_HOUSEKEEPING_REPOSITORY: 'true' }, recovery), null);
  assert.deepEqual(recovery, [53, 119]);
});

function retirementFixture() {
  const receipt = { schemaVersion: 1, id: dispatchId('owner/repo', 11, 'implement'), digest: 'b'.repeat(64), stage: 'implement', routerRunId: '11', routerAttempt: 1, workerRunId: '22', status: 'failed' };
  const decision = { schemaVersion: 1, repository: 'owner/repo', issue: 1, requestCommentId: 3, requestId: receipt.id, requestDigest: receipt.digest, workerRunId: 22, runAttempt: 2, disposition: 'retire', reason: 'Reviewed both terminal attempts and retained the existing candidate. Original dispatch bytes are unavailable.', evidence: ['https://github.com/owner/repo/pull/4'] };
  const comment = { id: 5, user: { login: 'owner', type: 'User' }, issue_url: 'https://api.github.com/repos/owner/repo/issues/99', created_at: '2026-11-15T11:00:00Z', updated_at: '2026-11-15T11:00:00Z' };
  const run = { id: 22, run_attempt: 2, path: '.github/workflows/lighthouse-sdlc-implement.lock.yml', repository: { full_name: 'owner/repo' }, status: 'completed', updated_at: '2026-11-15T10:00:00Z' };
  const worker = { issue: 1, rootId: receipt.id, observedRunId: '22', state: 'uncertain', code: 'dispatch-origin-unavailable', outcome: 'unknown', nextAction: 'Inspect missing origin.' };
  const item = { issue: 1, status: 'incomplete', workers: [worker], dependencies: [], nextActions: [worker.nextAction] };
  const api = async (path, method = 'GET') => {
    assert.equal(method, 'GET');
    if (path === '') return { full_name: 'owner/repo', id: 42 };
    if (path === 'issues/99') return { number: 99, state: 'open', user: { login: 'owner' } };
    if (path === 'issues/99/comments?per_page=100&page=1') return [{ ...comment, body: `Reviewed; no retry authorized.\n<!-- lighthouse-housekeeping-reconciliation:${JSON.stringify(decision)} -->` }];
    if (path === 'issues/comments/3') return { id: 3, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: 'https://api.github.com/repos/owner/repo/issues/1', body: `<!-- lighthouse-dispatch:${JSON.stringify(receipt)} -->` };
    if (path === 'actions/runs/22') return run;
    throw Error(`Unexpected ${path}`);
  };
  return { receipt, decision, comment, run, worker, item, api };
}

test('retirement after a rename requires the original identifier and the same current numeric repository', async () => {
  const setup = () => {
    const f = retirementFixture();
    f.receipt.id = f.worker.rootId = f.decision.requestId = dispatchId('owner/old-name', 11, 'implement');
    Object.assign(f.decision, { requestRepository: 'owner/old-name', repositoryId: 42 });
    Object.assign(f.worker, { code: 'receipt-invalid', requestCommentId: 3 });
    f.run.repository.id = 42;
    return f;
  };
  const f = setup();
  const result = await housekeepingReconciler(f.api, 'owner/repo', 'owner', 99)(f.item);
  assert.equal(result.status, 'inspected');
  assert.equal(result.workers[0].original.code, 'receipt-invalid');
  assert.equal(result.workers[0].outcome, 'unknown');
  for (const change of [f => { f.decision.requestRepository = 'owner/another-name'; }, f => { f.decision.requestRepository = 'other/old-name'; }, f => { f.decision.repositoryId = 43; }, f => { f.run.repository.id = 43; }, f => { delete f.decision.requestRepository; }]) {
    const bad = setup(); change(bad);
    await assert.rejects(housekeepingReconciler(bad.api, 'owner/repo', 'owner', 99)(bad.item));
  }
});

test('owner retirement completes inspection while preserving unknown outcome, receipts and recovery authority', async () => {
  const f = retirementFixture();
  const result = await housekeepingReconciler(f.api, 'owner/repo', 'owner', 99)(f.item);
  assert.equal(result.status, 'inspected');
  assert.equal(result.workers[0].code, 'owner-retired');
  assert.equal(result.workers[0].outcome, 'unknown');
  assert.deepEqual(result.workers[0].original, f.worker);
  assert.equal(f.worker.state, 'uncertain');
  assert.match(result.nextActions[0], /no retry or lifecycle transition is authorized/);
  const blocked = await housekeepingReconciler(f.api, 'owner/repo', 'owner', 99)({ ...f.item, dependencies: [{ state: 'unknown' }] });
  assert.equal(blocked.status, 'incomplete');
});

test('edited, foreign and bot decisions cannot retire historical monitoring', async () => {
  for (const change of [f => { f.comment.updated_at = '2026-11-15T11:01:00Z'; }, f => { f.comment.user.login = 'other'; }, f => { f.comment.user.type = 'Bot'; }, f => { f.comment.issue_url = 'https://api.github.com/repos/other/repo/issues/99'; }]) {
    const f = retirementFixture(); change(f);
    assert.equal((await housekeepingReconciler(f.api, 'owner/repo', 'owner', 99)(f.item)).status, 'incomplete');
  }
});

test('stale, mismatched, active and malformed retirement stays incomplete and retains observed history', async () => {
  for (const change of [f => { f.decision.requestDigest = 'c'.repeat(64); }, f => { f.decision.repository = 'other/repo'; }, f => { f.run.run_attempt = 3; }, f => { f.run.status = 'in_progress'; }, f => { f.run.updated_at = '2026-11-15T11:01:00Z'; }, f => { f.run.path = 'foreign.yml'; }, f => { f.decision.evidence = ['https://example.com/forged']; }]) {
    const f = retirementFixture(); change(f);
    const scan = await scanHousekeeping({ ...options, discover: async () => [1], inspect: async () => f.item, reconcile: housekeepingReconciler(f.api, 'owner/repo', 'owner', 99) });
    assert.equal(scan.complete, false);
    assert.deepEqual(scan.items[0].workers, [f.worker]);
    assert.equal(scan.completedAt, null);
  }
});

test('native freshness authenticates actual complete-scan evidence and rejects dry-run, skipped and partial coverage', async () => {
  const scan = await scanHousekeeping({ ...options, run: { ...options.run, revision: 'a'.repeat(40) }, dryRun: false, discover: async () => [1], inspect: inspected });
  const summary = { complete: true, lastComplete: { completedAt: scan.completedAt, scope: 'repository', run: scan.run } };
  const run = { id: 10, run_attempt: 1, head_sha: 'a'.repeat(40), status: 'completed', path: '.github/workflows/lighthouse-worker-maintenance.yml', repository: { full_name: 'owner/repo' }, event: 'schedule', actor: { login: 'owner' }, triggering_actor: { login: 'owner' } };
  const verify = (receipt = scan, native = run) => observeDailyCoverage(async () => native, 'owner/repo', 'owner', summary, { now, readArtifact: async () => receipt });
  assert.equal((await verify()).status, 'passed');
  for (const receipt of [{ ...scan, complete: false }, { ...scan, mode: 'dry-run' }, { ...scan, scope: 'selected-issues' }, { ...scan, failures: [{}] }, { ...scan, run: { ...scan.run, attempt: 2 } }, { ...scan, items: [] }]) assert.equal((await verify(receipt)).reason, 'daily-evidence-unconfirmed');
  assert.equal((await verify(null)).reason, 'daily-evidence-unconfirmed');
  assert.equal((await verify(scan, { ...run, actor: { login: 'someone' } })).reason, 'daily-evidence-unconfirmed');
  assert.equal(housekeepingFreshness({ summary: { ...summary, lastComplete: { ...summary.lastComplete, completedAt: 'invalid' } }, now }).reason, 'invalid-completion');
});

test('daily scan isolates item failure, deterministically orders items and distinguishes failed discovery from empty', async () => {
  const seen = [];
  const partial = await scanHousekeeping({ ...options, discover: async () => [3, 1, 2], inspect: async (...args) => { seen.push(args[3]); if (args[3] === 2) throw Error('inaccessible'); return inspected(...args); } });
  assert.deepEqual(seen, [1, 2, 3]);
  assert.equal(partial.complete, false); assert.equal(partial.completedAt, null);
  assert.equal(partial.items[1].status, 'incomplete');
  const empty = await scanHousekeeping({ ...options, discover: async () => [], inspect: inspected });
  assert.equal(empty.complete, true); assert.equal(empty.completedAt, new Date(now).toISOString());
  const unavailable = await scanHousekeeping({ ...options, discover: async () => { throw Error('inventory unavailable'); } });
  assert.equal(unavailable.complete, false); assert.equal(unavailable.failures[0].code, 'discovery-unavailable');
});

test('dry-run inspection is read-only and cannot publish even a complete sweep', async () => {
  const scan = await scanHousekeeping({ ...options, discover: async () => [1], inspect: inspected });
  assert.equal(scan.mode, 'dry-run');
  await assert.rejects(publishHousekeepingSummary(options.api, 'owner/repo', 'owner', 99, scan), /Invalid housekeeping publication/);
});

test('inaccessible blockers remain unknown, children cannot grant parent completion and reservations are preserved', async () => {
  const calls = [];
  const api = async (path, method = 'GET') => {
    calls.push({ path, method });
    if (path === 'issues/1') return { number: 1, state: 'open', user: { login: 'owner' }, labels: [{ name: 'agent-working' }, { name: 'future' }] };
    if (path.includes('/comments?')) return [];
    if (path.includes('/blocked_by?')) return [{ number: 2, state: 'closed', state_reason: 'not_planned' }];
    if (path.includes('/sub_issues?')) return [{ number: 3, state: 'closed' }];
    throw Error(`Unexpected ${path}`);
  };
  const result = await inspectHousekeepingItem(api, 'owner/repo', 'owner', 1, now);
  assert.equal(result.status, 'incomplete'); assert.equal(result.dependencies[0].state, 'unknown');
  assert.ok(result.nextActions.some(action => action.includes('aggregate lifecycle acceptance')));
  assert.ok(result.nextActions.some(action => action.includes('age alone never permits release')));
  assert.ok(calls.every(call => call.method === 'GET'));
  const scan = await scanHousekeeping({ ...options, api: async (path, ...args) => { if (path.includes('/blocked_by?')) throw Error('not accessible'); return api(path, ...args); }, discover: async () => [1] });
  assert.equal(scan.complete, false);
});

function indexFixture() {
  const index = { number: 99, state: 'open', user: { login: 'owner' }, body: '# Owner index\n\nKeep my notes.\n' }, writes = [];
  const api = async (path, method = 'GET', data) => {
    assert.equal(path, 'issues/99');
    if (method === 'PATCH') { writes.push(data); index.body = data.body; }
    return structuredClone(index);
  };
  return { index, api, writes };
}

test('stable summary preserves notes, last complete sweep, duplicate and out-of-order state', async () => {
  const f = indexFixture();
  const scan = await scanHousekeeping({ ...options, dryRun: false, discover: async () => [1], inspect: inspected });
  assert.equal((await publishHousekeepingSummary(f.api, 'owner/repo', 'owner', 99, scan)).state, 'published');
  assert.match(f.index.body, /Keep my notes/);
  const complete = readHousekeepingSummary(f.index.body).lastComplete;
  assert.equal(complete.completedAt, scan.completedAt);
  for (const repeated of [scan, { ...scan, run: { id: 9, attempt: 1 }, observedAt: new Date(now + 1000).toISOString() }]) assert.equal((await publishHousekeepingSummary(f.api, 'owner/repo', 'owner', 99, repeated)).state, 'retained');
  assert.equal(f.writes.length, 1);
  const partial = { ...scan, run: { id: 11, attempt: 1 }, observedAt: new Date(now + 1000).toISOString(), complete: false, completedAt: null };
  await publishHousekeepingSummary(f.api, 'owner/repo', 'owner', 99, partial);
  assert.deepEqual(readHousekeepingSummary(f.index.body).lastComplete, complete);
  assert.equal(housekeepingFreshness({ summary: readHousekeepingSummary(f.index.body), now: now + 1000 }).reason, 'partial');
});

test('uncertain summary acknowledgement is reconciled by reading, never creating a second report', async () => {
  const f = indexFixture(), scan = await scanHousekeeping({ ...options, dryRun: false, discover: async () => [], inspect: inspected });
  await assert.rejects(publishHousekeepingSummary(async (...args) => { const value = await f.api(...args); if (args[1] === 'PATCH') throw Error('acknowledgement lost'); return value; }, 'owner/repo', 'owner', 99, scan), /acknowledgement lost/);
  assert.equal((await publishHousekeepingSummary(f.api, 'owner/repo', 'owner', 99, scan)).state, 'retained');
  assert.equal(f.writes.length, 1);
});

test('daily freshness requires a complete repository scan rather than a workflow conclusion', async () => {
  assert.equal(housekeepingFreshness({ installed: false }).reason, 'missing');
  assert.equal(housekeepingFreshness({ enabled: false }).reason, 'disabled');
  assert.equal(housekeepingFreshness().reason, 'complete-scan-missing');
  const summary = { complete: true, lastComplete: { completedAt: new Date(now).toISOString(), scope: 'repository' } };
  assert.equal(housekeepingFreshness({ summary, now }).status, 'passed');
  assert.equal(housekeepingFreshness({ summary, now: now + 86400000 }).reason, 'overdue');
  assert.equal(housekeepingFreshness({ summary: { complete: true }, now }).status, 'unhealthy');
});
