import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForIntegration } from '../packages/sdlc/src/completion-state.mjs';

function fixture() {
  const state = { time: 0, greenAt: 660000, promotions: 0, reads: 0, held: false, draft: true };
  const controller = new AbortController();
  const pr = () => ({ number: 3, state: 'open', head: { sha: state.head ?? 'a'.repeat(40) }, draft: state.draft });
  const options = { api: async () => { state.reads++; return pr(); }, repository: 'owner/repo', owner: 'owner',
    authorization: { issue: 7, pr: 3, head: 'a'.repeat(40) }, workflowRunId: '11', deadline: 900000, signal: controller.signal,
    now: () => state.time, delay: async ms => { state.time += ms; },
    recheck: async () => { if (state.held) throw Error('Owner placed this PR head on hold'); },
    promote: async () => { state.promotions++; state.draft = false; },
    inspect: async (_api, _repository, _owner, _authorization, _stage, _run, { observeDraft } = {}) => {
      assert.ok(observeDraft || !state.draft);
      return { checks: [{ status: state.time >= state.greenAt ? 'passed' : 'unavailable', state: 'pending' }], mergeable: !state.draft };
    } };
  return { state, options, controller };
}

test('CI can finish after ten minutes within the original authorized deadline', async () => {
  const { state, options } = fixture();
  const result = await waitForIntegration(options);
  assert.equal(state.time, 660000); assert.equal(state.promotions, 1);
  assert.equal(result.mergeable, true); assert.equal(result.checks[0].status, 'passed');
});

test('waiting never renews a spent deadline and caps its final delay', async () => {
  const { state, options } = fixture(); options.deadline = 625000;
  await assert.rejects(waitForIntegration(options), /execution limit/);
  assert.equal(state.time, 625000); assert.equal(state.promotions, 0);
  const reads = state.reads;
  await assert.rejects(waitForIntegration(options), /execution limit/);
  assert.equal(state.reads, reads);
});

test('expiry or cancellation during a source read cannot promote a green draft', async () => {
  for (const boundary of ['expiry', 'cancel']) {
    const { state, options, controller } = fixture(); state.greenAt = 0;
    const inspect = options.inspect;
    options.inspect = async (...args) => { const result = await inspect(...args); if (boundary === 'expiry') state.time = options.deadline; else controller.abort(); return result; };
    await assert.rejects(waitForIntegration(options), /cancelled or exceeded/);
    assert.equal(state.promotions, 0);
  }
});

test('expiry during authority recheck stops before any source observation', async () => {
  const { state, options } = fixture(); options.recheck = async () => { state.time = options.deadline; };
  await assert.rejects(waitForIntegration(options), /execution limit/);
  assert.equal(state.reads, 0); assert.equal(state.promotions, 0);
});

test('changed head, owner hold and invalid check origin stop before promotion', async () => {
  for (const failure of ['head', 'hold', 'ineligible-event', 'unverified-workflow']) {
    const { state, options } = fixture(); state.greenAt = 0;
    if (failure === 'head') state.head = 'b'.repeat(40);
    else if (failure === 'hold') state.held = true;
    else options.inspect = async () => ({ checks: [{ context: 'repository', status: 'unavailable', state: failure, checks: [] }] });
    await assert.rejects(waitForIntegration(options), /changed|on hold|eligible verified/);
    assert.equal(state.promotions, 0);
  }
});

test('lost promotion response is reconciled once without repeating the mutation', async () => {
  const { state, options } = fixture(); state.greenAt = 0;
  options.promote = async () => { state.promotions++; state.draft = false; throw Error('Response lost'); };
  assert.equal((await waitForIntegration(options)).mergeable, true);
  assert.equal(state.promotions, 1);
});

test('an owner draft hold after promotion cannot be overwritten by polling', async () => {
  const { state, options } = fixture(); state.greenAt = 0; let promoted = false;
  options.inspect = async () => {
    const result = { checks: [{ status: 'passed' }], mergeable: false };
    if (promoted) state.draft = true;
    return result;
  };
  options.promote = async () => { state.promotions++; state.draft = false; promoted = true; };
  await assert.rejects(waitForIntegration(options), /returned to draft/);
  assert.equal(state.promotions, 1);
});

test('expiry during the final mergeability read cannot return an integration candidate', async () => {
  const { state, options } = fixture(); state.greenAt = 0; const inspect = options.inspect;
  options.inspect = async (...args) => { const value = await inspect(...args); if (!args[6]?.observeDraft) state.time = options.deadline; return value; };
  await assert.rejects(waitForIntegration(options), /execution limit/);
  assert.equal(state.promotions, 1);
});

test('cancelled requests and invalid deadlines cannot start observation', async () => {
  const { state, options, controller } = fixture(); controller.abort();
  await assert.rejects(waitForIntegration(options), /cancelled/);
  assert.equal(state.reads, 0);
  for (const deadline of [undefined, NaN, Infinity]) await assert.rejects(waitForIntegration({ ...options, deadline }), /finite delivery deadline/);
});

test('unconfirmed promotion is not retried or treated as readiness', async () => {
  const { state, options } = fixture(); state.greenAt = 0;
  options.promote = async () => { state.promotions++; throw Error('Unconfirmed promotion'); };
  await assert.rejects(waitForIntegration(options), /Unconfirmed promotion/);
  assert.equal(state.promotions, 1);
});
