import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileMaintenance } from '../../scripts/reconcile-worker-maintenance.mjs';

const now = Date.parse('2026-11-11T12:00:00Z');
function fixture(age = 60, active = false) {
  const writes = [], target = { id: 1427668548, full_name: 'juangcarmona/lighthouse', default_branch: 'main' };
  const run = { id: 18, run_attempt: 2, repository: target, path: '.github/workflows/lighthouse-worker-maintenance.yml', status: 'completed', conclusion: 'success', updated_at: new Date(now - age * 60000).toISOString(), html_url: 'https://github.com/juangcarmona/lighthouse/actions/runs/18' };
  const job = { id: 42, run_id: 18, run_attempt: 2, name: 'scan', status: 'completed', conclusion: 'success', completed_at: run.updated_at };
  const jobs = { total_count: 1, jobs: [job] }, reads = [];
  const api = async (path, method = 'GET', data) => {
    if (method !== 'GET') { writes.push({ path, method, data }); return null; }
    reads.push(path);
    if (!path) return { ...target };
    if (['queued', 'in_progress', 'waiting', 'pending', 'requested'].some(status => path === `actions/workflows/lighthouse-worker-maintenance.yml/runs?status=${status}&per_page=1`)) return { total_count: active && path.includes('status=queued') ? 1 : 0 };
    if (path === 'actions/workflows/lighthouse-worker-maintenance.yml/runs?per_page=100') return { workflow_runs: [run] };
    if (path === 'actions/runs/18/attempts/2/jobs?per_page=100') return jobs;
    throw Error(`Unexpected GET: ${path}`);
  };
  return { api, writes, target, run, job, jobs, reads };
}

test('a healthy scan and an old queued run both prevent duplicate maintenance', async () => {
  for (const f of [fixture(10), fixture(90, true)]) {
    const result = await reconcileMaintenance(f.api, { now, apply: true });
    assert.equal(result.action, 'none');
    assert.deepEqual(f.writes, []);
  }
});

test('an overdue scan previews by default and dispatches once when applied', async () => {
  const f = fixture();
  assert.equal((await reconcileMaintenance(f.api, { now })).action, 'would-dispatch');
  assert.deepEqual(f.writes, []);
  const checkpoints = [];
  const result = await reconcileMaintenance(f.api, { now, apply: true, checkpoint: async state => checkpoints.push(state) });
  assert.equal(result.submission, 'accepted-not-yet-verified');
  assert.deepEqual(f.writes, [{ path: 'actions/workflows/lighthouse-worker-maintenance.yml/dispatches', method: 'POST', data: { ref: 'main' } }]);
  assert.equal(checkpoints[0].repositoryId, 1427668548);
});

test('wrong repository, malformed time and changed dispatch target fail without writes', async () => {
  for (const mutate of [f => f.target.id++, f => f.run.updated_at = 'unavailable', f => f.run.repository = { id: 1 }]) {
    const f = fixture(); mutate(f);
    await assert.rejects(reconcileMaintenance(f.api, { now, apply: true }));
    assert.deepEqual(f.writes, []);
  }
  const f = fixture(); let reads = 0;
  const api = async (...args) => { if (!args[0] && ++reads === 2) f.target.default_branch = 'other'; return f.api(...args); };
  await assert.rejects(reconcileMaintenance(api, { now, apply: true, checkpoint: async () => {} }), /changed before dispatch/);
  assert.deepEqual(f.writes, []);
});

test('a lost dispatch acknowledgement leaves intent and cannot cause a blind resend', async () => {
  const f = fixture(); let pending;
  const api = async (...args) => { if (args[1] === 'POST') throw Error('connection lost'); return f.api(...args); };
  await assert.rejects(reconcileMaintenance(api, { now, apply: true, checkpoint: async value => { pending = value; } }), /connection lost/);
  const next = await reconcileMaintenance(f.api, { now: now + 60000, apply: true, pending });
  assert.equal(next.reason, 'dispatch-unconfirmed');
  assert.deepEqual(f.writes, []);
});

const retained = { repositoryId: 1427668548, requestedAt: '2026-11-11T11:30:00Z' };

async function assertUnconfirmed(mutate, clock = now) {
  for (const apply of [false, true]) {
    for (const withPending of [false, true]) {
      const f = fixture();
      f.run.updated_at = new Date(clock).toISOString();
      const pending = withPending ? { ...retained, requestedAt: new Date(clock - 11 * 60000).toISOString() } : null;
      const before = structuredClone(pending), checkpoints = [];
      const api = mutate(f) ?? f.api;
      const result = await reconcileMaintenance(api, { now: clock, apply, pending, checkpoint: async value => checkpoints.push(value) });
      assert.equal(result.reason, 'scan-unconfirmed');
      assert.equal(result.action, 'none');
      assert.equal(result.ageMinutes, null);
      assert.equal(result.lastSuccess, null);
      assert.equal(typeof result.cause, 'string');
      if (pending) assert.deepEqual(result.pending, before);
      assert.deepEqual(pending, before);
      assert.deepEqual(checkpoints, []);
      assert.deepEqual(f.writes, []);
    }
  }
}

test('invalid or incomplete latest-attempt scan evidence never authorizes effects', async t => {
  const cases = {
    skipped: f => { f.job.conclusion = 'skipped'; },
    missing: f => { f.jobs.jobs = []; f.jobs.total_count = 0; },
    failed: f => { f.job.conclusion = 'failure'; },
    running: f => { f.job.status = 'in_progress'; },
    duplicateScan: f => { f.jobs.jobs.push({ ...f.job, id: 43 }); f.jobs.total_count++; },
    duplicateId: f => { f.jobs.jobs.push({ ...f.job, name: 'other' }); f.jobs.total_count++; },
    truncated: f => { f.jobs.total_count = 2; },
    oversized: f => { f.jobs.jobs = Array.from({ length: 101 }, (_, i) => ({ ...f.job, id: i + 1, name: i ? 'other' : 'scan' })); f.jobs.total_count = 101; },
    malformedEntry: f => { f.jobs.jobs[0] = null; },
    malformedName: f => { f.job.name = 1; },
    malformedStatus: f => { f.job.status = null; },
    malformedConclusion: f => { delete f.job.conclusion; },
    wrongRun: f => { f.job.run_id++; },
    earlierAttempt: f => { f.job.run_attempt = 1; },
    invalidJobId: f => { f.job.id = 0; },
    invalidRunId: f => { f.run.id = '18'; },
    invalidAttempt: f => { f.run.run_attempt = 0; },
    unsafeAttempt: f => { f.run.run_attempt = Number.MAX_SAFE_INTEGER + 1; },
    absentJobs: f => { delete f.jobs.jobs; },
    invalidCount: f => { f.jobs.total_count = '1'; },
    negativeCount: f => { f.jobs.total_count = -1; },
    unavailable: f => async (...args) => { if (args[0].includes('/jobs?')) throw Error('unavailable'); return f.api(...args); },
    nullInventory: f => async (...args) => args[0].includes('/jobs?') ? null : f.api(...args),
  };
  for (const [name, mutate] of Object.entries(cases)) await t.test(name, () => assertUnconfirmed(mutate));
});

test('strict scan timestamps reject coercion, normalization and unsupported forms', async t => {
  const invalid = ['0', 0, '', null, undefined, {}, '2026-11-11', '11/11/2026 11:55:00',
    '2026-11-11T11:55:00', '2026-11-11T11:55:00+00:00', ' 2026-11-11T11:55:00Z',
    '2026-11-11T11:55:00Z ', '2026-11-11T11:55:00Z\n', '2026-11-11T11:55:00Zjunk',
    '2026-11-11 11:55:00Z', '2026-11-11t11:55:00z', '2026-11-11T11:55:00.1Z',
    '2026-11-11T11:55:00.1234Z', '2026-02-30T12:00:00Z', '2026-02-29T12:00:00Z',
    '2026-11-10T24:00:00Z', '2026-11-11T11:55:60Z', '2026-11-11T11:60:00Z',
    '2026-13-11T11:55:00Z', '2026-00-11T11:55:00Z', '2026-11-00T11:55:00Z',
    '0000-11-11T11:55:00Z', '2026-11-11T12:00:00.001Z'];
  for (const [index, value] of invalid.entries()) {
    const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
    // Expose false health/reconciliation if a permissive parser accepts the input.
    const clock = Number.isFinite(parsed) ? parsed + 10 * 60000 : now;
    const rejectionClock = value === '2026-11-11T12:00:00.001Z' ? now : clock;
    await t.test(String(index), () => assertUnconfirmed(f => { f.job.completed_at = value; }, rejectionClock));
  }
});

test('only the latest selected attempt is queried, never an earlier successful scan', async () => {
  const f = fixture(10);
  const api = async (...args) => args[0] === 'actions/runs/18/attempts/1/jobs?per_page=100' ? { total_count: 1, jobs: [{ ...f.job, run_attempt: 1 }] } : f.api(...args);
  f.job.conclusion = 'skipped';
  const result = await reconcileMaintenance(api, { now, apply: true });
  assert.equal(result.reason, 'scan-unconfirmed');
  assert.equal(result.action, 'none');
  assert.deepEqual(f.reads.filter(path => path.includes('/jobs?')), ['actions/runs/18/attempts/2/jobs?per_page=100']);
  assert.deepEqual(f.writes, []);
});

test('successful scan time, not workflow updates, determines exact freshness', async () => {
  for (const age of [0, 10, 44.999, 45, 90]) {
    const f = fixture(age);
    f.run.updated_at = new Date(now).toISOString();
    const result = await reconcileMaintenance(f.api, { now });
    assert.equal(result.ageMinutes, age);
    assert.equal(result.lastSuccess, f.run.html_url);
    assert.equal(result.reason, age < 45 ? 'healthy' : 'maintenance-overdue');
    assert.equal(result.action, age < 45 ? 'none' : 'would-dispatch');
    assert.deepEqual(f.writes, []);
  }
});

test('supported UTC forms, leap day and equality retain precise scan ages', async () => {
  for (const [value, clock, age] of [
    ['2026-11-11T11:50:00Z', now, 10],
    ['2026-11-11T11:59:59.123Z', now, 877 / 60000],
    ['2024-02-29T12:00:00Z', Date.parse('2024-02-29T12:10:00Z'), 10],
    ['2026-11-11T12:00:00.000Z', now, 0],
  ]) {
    const f = fixture(); f.run.updated_at = new Date(clock).toISOString(); f.job.completed_at = value;
    const result = await reconcileMaintenance(f.api, { now: clock });
    assert.equal(result.reason, 'healthy');
    assert.equal(result.ageMinutes, age);
  }
});

test('pending reconciliation requires scan completion at or after the request; preview is read-only', async () => {
  for (const offset of [-1, 0, 1]) {
    for (const apply of [false, true]) {
      const f = fixture(); f.run.updated_at = new Date(now).toISOString();
      f.job.completed_at = new Date(Date.parse(retained.requestedAt) + offset).toISOString();
      const checkpoints = [], pending = { ...retained };
      const result = await reconcileMaintenance(f.api, { now, apply, pending, checkpoint: async value => checkpoints.push(value) });
      assert.equal(result.reason, offset < 0 ? 'dispatch-unconfirmed' : 'healthy');
      assert.equal(result.action, 'none');
      assert.deepEqual(checkpoints, apply && offset >= 0 ? [null] : []);
      assert.deepEqual(pending, retained);
      assert.deepEqual(f.writes, []);
    }
  }
});

test('invalid retained intent is rejected even when scan evidence is unconfirmed', async () => {
  for (const pending of [{ ...retained, repositoryId: 1 }, { ...retained, requestedAt: 'invalid' }]) {
    const f = fixture(); f.job.conclusion = 'skipped';
    await assert.rejects(reconcileMaintenance(f.api, { now, apply: true, pending }), /Invalid retained/);
    assert.deepEqual(f.writes, []);
  }
});

test('dispatch checkpoints precede POST and failed checkpoints suppress POST', async () => {
  for (const fail of [false, true]) {
    const f = fixture(), events = [];
    const api = async (...args) => { if (args[1] === 'POST') events.push('post'); return f.api(...args); };
    const operation = reconcileMaintenance(api, { now, apply: true, checkpoint: async value => {
      events.push('checkpoint'); assert.equal(value.repositoryId, retained.repositoryId);
      if (fail) throw Error('checkpoint unavailable');
    } });
    if (fail) await assert.rejects(operation, /checkpoint unavailable/); else await operation;
    assert.deepEqual(events, fail ? ['checkpoint'] : ['checkpoint', 'post']);
    if (fail) assert.deepEqual(f.writes, []);
  }
});

test('name identity, future workflow time, active runs and absent success retain safeguards', async () => {
  for (const mutate of [f => { f.target.full_name = 'other/repo'; }, f => { f.run.updated_at = new Date(now + 1).toISOString(); }]) {
    const f = fixture(); mutate(f);
    await assert.rejects(reconcileMaintenance(f.api, { now, apply: true }));
    assert.deepEqual(f.writes, []);
  }
  const active = fixture(); active.run.status = 'queued';
  assert.equal((await reconcileMaintenance(active.api, { now, apply: true })).reason, 'active-execution');
  assert.equal(active.reads.some(path => path.includes('/jobs?')), false);
  const absent = fixture(); absent.run.conclusion = 'failure';
  assert.equal((await reconcileMaintenance(absent.api, { now })).action, 'would-dispatch');
  assert.equal(absent.reads.some(path => path.includes('/jobs?')), false);
});
