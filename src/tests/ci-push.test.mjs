import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchDeliveryChecks, ciFailureSummary } from '../packages/sdlc/src/delivery-events.mjs';

const head = 'a'.repeat(40), revision = 'b'.repeat(40), blob = 'c'.repeat(40), repository = 'owner/repo';
const pr = { number: 12, state: 'open', head: { sha: head, ref: 'lighthouse/implement-9', repo: { full_name: repository } }, base: { sha: revision, ref: 'main', repo: { full_name: repository } } };
const branch = 'lighthouse/verification-12-' + head, now = Date.parse('2026-11-05T06:00:00Z');
function fixture() {
  const state = { ref: null, visible: false, calls: 0, saved: null, checkpoints: [], changed: null, mode: null };
  const checkpoint = async requests => { state.saved = structuredClone(requests); state.checkpoints.push(state.saved); };
  const api = async (path, method = 'GET') => {
    assert.equal(method, 'GET', 'Only the narrow App trigger may write');
    if (path.startsWith('contents/.lighthouse/')) return { content: Buffer.from(JSON.stringify({ completion: { postMergeWorkflows: ['ci.yml', 'package.yml'] } })).toString('base64') };
    if (path === 'pulls/12') return { ...pr, ...(state.changed === 'head' ? { head: { ...pr.head, sha: 'd'.repeat(40) } } : {}), ...(state.changed === 'base' ? { base: { ...pr.base, sha: 'd'.repeat(40) } } : {}) };
    if (path.startsWith('contents/.github/workflows/')) return { type: 'file', sha: state.changed === 'workflow' && path.endsWith(head) ? 'd'.repeat(40) : blob };
    if (path.startsWith('git/ref/heads/')) { assert.equal(path, 'git/ref/heads/' + branch); return state.ref; }
    const workflow = path.match(/^actions\/workflows\/(ci|package)\.yml\/runs\?head_sha=/)?.[1];
    assert.ok(workflow, path);
    const rows = state.visible ? [{ id: workflow === 'ci' ? 101 : 102, event: state.mode === 'wrong-event' ? 'workflow_dispatch' : 'push', head_sha: head, head_branch: branch, path: `.github/workflows/${workflow}.yml`, repository: { full_name: repository } }] : [];
    return { total_count: state.mode === 'incomplete' ? 2 : rows.length, workflow_runs: rows };
  };
  const ciTrigger = async input => {
    state.calls++;
    assert.ok(state.saved.every(request => request.state === 'requested'), 'Effect intent must be retained before the App call');
    assert.equal(input.branch, branch); assert.equal(input.head, head);
    if (state.mode === 'changed-after-mint') state.changed = 'base';
    await input.beforeWrite();
    if (state.mode === 'unsent') throw Object.assign(Error('App unavailable'), { referenceAttempted: false });
    if (state.mode === 'unknown') throw Object.assign(Error('Lost acknowledgement'), { referenceAttempted: true });
    state.ref = { ref: 'refs/heads/' + branch, object: { sha: head } }; state.visible = true;
    if (state.mode === 'lost-response') throw Object.assign(Error('Lost acknowledgement'), { referenceAttempted: true });
    return { installation: 7, tokenRevoked: true };
  };
  const dispatch = options => dispatchDeliveryChecks(api, revision, pr, { checkpoint, ciTrigger, now, ...options });
  return { state, dispatch, ciTrigger };
}

test('one App reference starts all unchanged CI workflows and repeated recovery observes the same runs', async () => {
  const f = fixture(), first = await f.dispatch();
  assert.equal(f.state.calls, 1);
  assert.deepEqual(first.map(x => x.run), [101, 102]);
  assert.ok(first.every(x => x.schemaVersion === 2 && x.state === 'observed' && x.workflowSha === blob && x.base === revision));
  const recovered = await f.dispatch({ previous: first, ciTrigger: null });
  assert.deepEqual(recovered.map(x => x.run), [101, 102]); assert.equal(f.state.calls, 1);
  f.state.visible = false;
  await assert.rejects(f.dispatch({ previous: recovered }), /confirmed native push/);
  assert.ok(f.state.saved.every(x => x.state === 'unknown' && !x.run));
  assert.equal(f.state.calls, 1);
});

test('changed subjects, CI definitions and retained identities cannot trigger a push', async () => {
  for (const changed of ['head', 'workflow']) {
    const f = fixture(); f.state.changed = changed;
    await assert.rejects(f.dispatch()); assert.equal(f.state.calls, 0);
  }
  const f = fixture(), first = await f.dispatch();
  for (const field of ['head', 'base', 'workflowSha', 'sourceBranch', 'revision']) {
    const previous = structuredClone(first); previous[0][field] = 'changed';
    await assert.rejects(f.dispatch({ previous })); assert.equal(f.state.calls, 1);
  }
});

test('authority is rechecked immediately before reference creation', async () => {
  const f = fixture(); f.state.mode = 'changed-after-mint';
  await assert.rejects(f.dispatch(), error => error.ciRequestFailure.code === 'base-changed');
  assert.equal(f.state.ref, null);
  const revoked = fixture();
  await assert.rejects(revoked.dispatch({ beforeWrite: async () => { throw Error('Owner revoked'); } }));
  assert.equal(revoked.state.calls, 0);
});

test('lost reference acknowledgements reconcile without another App effect', async () => {
  const f = fixture(); f.state.mode = 'lost-response';
  const first = await f.dispatch(); assert.ok(first.every(x => x.state === 'observed'));
  await f.dispatch({ previous: first }); assert.equal(f.state.calls, 1);
  const unknown = fixture(); unknown.state.mode = 'unknown';
  await assert.rejects(unknown.dispatch());
  assert.ok(unknown.state.saved.every(x => x.state === 'unknown'));
  const previous = structuredClone(unknown.state.saved);
  await assert.rejects(unknown.dispatch({ previous }), /unconfirmed/); assert.equal(unknown.state.calls, 1);
});

test('known unsent failures require App setup and retain the finite retry delay and budget', async () => {
  const f = fixture(); f.state.mode = 'unsent';
  await assert.rejects(f.dispatch(), error => { assert.match(ciFailureSummary(error.ciRequestFailure), /LIGHTHOUSE_CI_APP_CLIENT_ID/); return true; });
  const previous = structuredClone(f.state.saved);
  assert.ok(previous.every(x => x.state === 'rejected'));
  f.state.mode = null;
  await assert.rejects(f.dispatch({ previous, now: now + 1 }), error => error.ciRequestFailure.code === 'delay-pending');
  const exhausted = previous.map(x => ({ ...x, attempt: 3 }));
  await assert.rejects(f.dispatch({ previous: exhausted, now: now + 3600000 }), error => error.ciRequestFailure.code === 'budget-exhausted');
  await assert.rejects(f.dispatch({ previous, ciTrigger: null, now: now + 3600000 }), error => error.ciRequestFailure.code === 'app-setup-required');
  const retried = await f.dispatch({ previous, now: now + 3600000 });
  assert.ok(retried.every(x => x.attempt === 2)); assert.equal(f.state.calls, 2);
});

test('a preexisting ref, wrong event or incomplete inventory cannot manufacture a qualifying run', async () => {
  const f = fixture(); f.state.ref = { ref: 'refs/heads/' + branch, object: { sha: head } };
  await assert.rejects(f.dispatch(), /confirmed native push/); assert.equal(f.state.calls, 0);
  const incomplete = fixture(); incomplete.state.mode = 'incomplete';
  await assert.rejects(incomplete.dispatch(), error => error.ciRequestFailure.code === 'inventory-incomplete'); assert.equal(incomplete.state.calls, 0);
  const wrong = fixture(); wrong.state.mode = 'wrong-event';
  const requested = await wrong.dispatch(); assert.ok(requested.every(x => x.state === 'acknowledged' && !x.run));
});
