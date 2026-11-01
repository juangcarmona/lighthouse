import test from 'node:test';
import assert from 'node:assert/strict';
import { assessDecomposition, assessEpic, epicPlanDigest } from '../packages/sdlc/src/epic.mjs';
import { buildDecompositionPlan } from '../packages/sdlc/src/decompose.mjs';
import { buildStackedPlan } from '../packages/sdlc/src/stacked.mjs';
import { validateStageEnvelope } from '../packages/sdlc/src/host-contract.mjs';

const head = 'a'.repeat(40), base = 'b'.repeat(40);
const estimate = points => ({ points, status: 'confirmed', confidence: 'medium', rationale: { scope: 'Several lifecycle contracts', dependencies: 'Requires intake contract', verification: 'State and adapter integration scenarios' }, uncertainty: ['Live publication integration'] });
const input = () => ({ schemaVersion: 1, parent: { id: 'GH-146', title: 'Parent request' }, slices: [
  { id: 'a', title: 'Independent A', acceptance: ['A outcome verified'], dependencies: [] },
  { id: 'b', title: 'Independent B', acceptance: ['B outcome verified'], dependencies: [] },
  { id: 'c', title: 'Dependent C', acceptance: ['C integrated with A'], dependencies: ['a'] },
] });
const plan = () => buildDecompositionPlan(input());
const child = id => ({ id, authenticated: true, state: 'ready', triage: 'passed', refinement: 'passed', authorized: { refine: true, implement: true } });
const observation = () => ({ schemaVersion: 1, authenticated: true, planDigest: epicPlanDigest(plan()), epicBranch: 'lighthouse/epic-146', defaultBranch: 'main', baseSha: base, capacity: 2, children: ['a', 'b', 'c'].map(child) });
const accepted = id => ({ ...child(id), state: 'accepted', pr: { merged: true, head, base: 'lighthouse/epic-146' }, acceptance: { head, baseSha: base, checks: 'passed', ownerDecision: true, included: true } });
const states = obs => assessEpic(plan(), obs).children.map(item => item.state);

test('only a confirmed estimate strictly greater than eight requires decomposition', () => {
  assert.equal(assessDecomposition({ estimate: estimate(8) }).status, 'not-required');
  assert.equal(assessDecomposition({ estimate: estimate(13) }).status, 'invalid');
  assert.equal(assessDecomposition({ estimate: estimate(13), decomposition: input() }).status, 'planned');
  assert.equal(assessDecomposition({ estimate: { ...estimate(13), status: 'provisional' }, decomposition: input() }).status, 'invalid');
  assert.equal(assessDecomposition({ estimate: estimate('13') }).status, 'invalid');
});

test('no safe split retains the explanation and question and cannot pass readiness', () => {
  const output = { estimate: estimate(13), decomposition: { noSafeSplitReason: 'Outcomes cannot be verified independently', question: 'Should we retain one bounded change?' } };
  assert.equal(assessDecomposition(output).status, 'blocked');
  const result = { schemaVersion: 1, runId: 'run', stage: 'refine', gate: 'ready', status: 'passed', output, evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'owner decision' };
  assert.ok(validateStageEnvelope({ schemaVersion: 1, result, effect: { type: 'issue-comment', body: 'Split requires a decision.' } }, { stage: 'refine', runId: 'run' }).some(error => /safe split/.test(error)));
});

test('malformed arrays never throw or accidentally become valid', () => {
  for (const field of ['dependencies', 'acceptance', 'scope', 'labels']) {
    for (const value of [null, {}, 3, 'abc', [null]]) {
      const data = input(); data.slices[0][field] = value;
      assert.equal(buildDecompositionPlan(data).valid, false, `${field}: ${JSON.stringify(value)}`);
    }
  }
});

test('unknown, self, cyclic and duplicate identities cannot produce operations', () => {
  for (const slices of [
    [{ ...input().slices[0], dependencies: ['missing'] }],
    [{ ...input().slices[0], dependencies: ['a'] }],
    [input().slices[0], input().slices[0]],
  ]) assert.deepEqual(buildDecompositionPlan({ ...input(), slices }).operations, []);
});

test('epic mode plans a shared base for independent and dependent children and one aggregate', () => {
  const data = input();
  const result = buildStackedPlan({ ...data, mode: 'epic', parent: { ...data.parent, integrationBranch: 'lighthouse/epic-146' } });
  assert.equal(result.valid, true);
  assert.ok(result.operations.slice(0, 3).every(op => op.base === 'lighthouse/epic-146'));
  assert.deepEqual(result.operations[3], { type: 'open-aggregate-pull-request', branch: 'lighthouse/epic-146', base: 'main', requires: ['a', 'b', 'c'] });
});

test('epic mode rejects default or predecessor bases and duplicate identities', () => {
  const data = input();
  for (const integrationBranch of ['main', undefined, 'bad branch', 'lighthouse/epic-147']) assert.equal(buildStackedPlan({ ...data, mode: 'epic', parent: { ...data.parent, integrationBranch } }).valid, false);
  data.slices[0].base = 'main';
  assert.deepEqual(buildStackedPlan({ ...data, mode: 'epic', parent: { ...data.parent, integrationBranch: 'lighthouse/epic-146' } }).operations, []);
  assert.equal(buildStackedPlan({ ...input(), slices: [input().slices[0], input().slices[0]] }).valid, false);
});

test('independent children can run concurrently; dependency edges block C', () => {
  assert.deepEqual(states(observation()), ['implementation-eligible', 'implementation-eligible', 'waiting-dependencies']);
  const obs = observation(); obs.children[0] = accepted('a');
  assert.deepEqual(states(obs), ['accepted', 'implementation-eligible', 'implementation-eligible']);
});

test('capacity includes running children and cancels no existing work', () => {
  const obs = observation(); obs.capacity = 1; obs.children[0].state = 'running';
  assert.deepEqual(states(obs), ['running', 'waiting-capacity', 'waiting-dependencies']);
  obs.capacity = 0;
  assert.equal(assessEpic(plan(), obs).status, 'invalid');
});

test('a running child cannot be dispatched again during intake, refinement or PR publication', () => {
  for (const patch of [
    { triage: 'pending' },
    { refinement: 'pending' },
    { questions: ['A previous question?'] },
    { pr: { head, base: 'lighthouse/epic-146' }, evidence: { head, baseSha: base, checks: 'passed' }, ownerDecision: { head, baseSha: base, approved: true } },
  ]) {
    const obs = observation(); obs.children[0] = { ...child('a'), ...patch, state: 'running' };
    assert.equal(states(obs)[0], 'running');
    assert.equal(states(obs)[2], 'waiting-dependencies');
  }
});

test('children retain separate intake, questions and authorization', () => {
  const obs = observation(); obs.children[0].triage = 'pending';
  assert.equal(states(obs)[0], 'needs-triage');
  obs.children[0].triage = 'passed'; obs.children[0].refinement = 'pending'; obs.children[0].authorized.refine = false;
  assert.equal(states(obs)[0], 'waiting-refinement-authorization');
  obs.children[0].authorized.refine = true;
  assert.equal(states(obs)[0], 'needs-refinement');
  obs.children[0].questions = ['Which observable outcome?'];
  assert.equal(states(obs)[0], 'waiting-answer');
  obs.children[0].state = 'blocked';
  assert.equal(states(obs)[0], 'waiting-answer');
  assert.deepEqual(assessEpic(plan(), obs).children[0].questions, ['Which observable outcome?']);
  obs.children[0].state = 'ready';
  obs.children[0].questions = 'not an array';
  assert.equal(states(obs)[0], 'uncertain');
  delete obs.children[0].questions; obs.children[0].refinement = 'passed'; obs.children[0].authorized.implement = false;
  assert.equal(states(obs)[0], 'waiting-implementation-authorization');
});

test('closed, cancelled, uncertain or unverifiable children cannot satisfy prerequisites', () => {
  for (const state of ['closed', 'cancelled', 'uncertain', 'blocked', 'accepted']) {
    const obs = observation(); obs.children[0].state = state;
    assert.equal(states(obs)[2], 'waiting-dependencies');
  }
  const obs = observation(); obs.children[0] = accepted('a'); obs.children[0].acceptance.included = false;
  assert.equal(states(obs)[2], 'waiting-dependencies');
  for (const state of ['closed', 'unexpected', undefined]) {
    obs.children[0] = { ...child('a'), state };
    assert.equal(states(obs)[0], 'uncertain');
  }
});

test('head, base, checks and owner decision must all be current', () => {
  const obs = observation();
  obs.children[0].pr = { head, base: obs.epicBranch };
  obs.children[0].evidence = { head, baseSha: base, checks: 'passed' };
  assert.equal(states(obs)[0], 'waiting-owner');
  obs.children[0].ownerDecision = { head, baseSha: base, approved: true };
  assert.equal(states(obs)[0], 'merge-eligible');
  obs.baseSha = 'c'.repeat(40);
  assert.equal(states(obs)[0], 'needs-revalidation');
  obs.baseSha = base; obs.children[0].ownerDecision.head = 'd'.repeat(40);
  assert.equal(states(obs)[0], 'waiting-owner');
  obs.children[0].evidence.checks = 'failed';
  assert.equal(states(obs)[0], 'needs-revalidation');
  obs.children[0].pr.base = 'main';
  assert.equal(states(obs)[0], 'wrong-base');
});

test('authentication, plan binding and duplicate observations fail closed', () => {
  for (const patch of [{ authenticated: false }, { schemaVersion: 2 }, { planDigest: 'copied' }, { children: [child('a'), child('a')] }]) assert.equal(assessEpic(plan(), { ...observation(), ...patch }).status, 'invalid');
  const obs = observation(); obs.children[0].authenticated = false;
  assert.equal(states(obs)[0], 'uncertain');
  assert.equal(assessEpic({ valid: true }, obs).status, 'invalid');
  assert.equal(assessEpic(null, null).status, 'invalid');
});

test('aggregate eligibility never closes the parent or grants merge authority', () => {
  const obs = observation(); obs.children = ['a', 'b', 'c'].map(accepted);
  const result = assessEpic(plan(), obs);
  assert.equal(result.aggregate, 'publication-eligible');
  assert.equal(result.parent, 'open');
  assert.equal(result.canMerge, undefined);
  obs.children.pop();
  assert.equal(assessEpic(plan(), obs).aggregate, 'waiting-children');
});

test('legacy nested plans may omit dependencies without changing their branch chain', () => {
  const plan = buildStackedPlan({ parent: { number: 139, base: 'main' }, slices: [{ id: 'a', title: 'First' }, { id: 'b', title: 'Second', dependencies: null, acceptance: null }] });
  assert.equal(plan.valid, true);
  assert.deepEqual(plan.operations.map(item => item.base), ['main', 'feat/139-first']);
  const epic = buildStackedPlan({ mode: 'epic', parent: { number: 139, base: 'main', integrationBranch: 'lighthouse/epic-139' }, slices: [{ id: 'a', title: 'First' }] });
  assert.equal(epic.valid, false);
  assert.equal(buildStackedPlan({ mode: 'epic', parent: { number: 139, integrationBranch: 'lighthouse/epic-139' }, slices: [] }).valid, false);
});
