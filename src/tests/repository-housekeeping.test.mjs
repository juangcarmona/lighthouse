import test from 'node:test';
import assert from 'node:assert/strict';
import { scanHousekeeping, inspectHousekeepingItem, publishHousekeepingSummary, readHousekeepingSummary, housekeepingFreshness, observeDailyCoverage } from '../packages/sdlc/src/repository-housekeeping.mjs';

const now = Date.parse('2026-11-15T12:00:00.000Z');
const options = { api: async () => { throw Error('Unexpected effect'); }, repository: 'owner/repo', owner: 'owner', run: { id: 10, attempt: 1 }, now: () => now };
const inspected = async (_api, _repo, _owner, issue) => ({ issue, url: `https://github.com/owner/repo/issues/${issue}`, status: 'inspected', nextActions: [] });

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
