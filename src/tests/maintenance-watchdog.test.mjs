import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileMaintenance } from '../../scripts/reconcile-worker-maintenance.mjs';

const now = Date.parse('2026-11-11T12:00:00Z');
function fixture(age = 60, active = false) {
  const writes = [], target = { id: 1427668548, full_name: 'juangcarmona/lighthouse', default_branch: 'main' };
  const run = { repository: target, path: '.github/workflows/lighthouse-worker-maintenance.yml', status: 'completed', conclusion: 'success', updated_at: new Date(now - age * 60000).toISOString(), html_url: 'https://github.com/juangcarmona/lighthouse/actions/runs/18' };
  const api = async (path, method = 'GET', data) => {
    if (method !== 'GET') { writes.push({ path, method, data }); return null; }
    if (!path) return { ...target };
    if (path.includes('status=')) return { total_count: active && path.includes('status=queued') ? 1 : 0 };
    return { workflow_runs: [run] };
  };
  return { api, writes, target, run };
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
