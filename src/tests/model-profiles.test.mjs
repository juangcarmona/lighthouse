import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModelProfile, modelExecutionReceipt } from '../packages/sdlc/src/model-profiles.mjs';

const project = {
  schemaVersion: 1, defaultProfile: 'build', workers: { refine: 'plan', review: 'fast' },
  profiles: { plan: { model: 'openai/test-sol', reasoningEffort: 'high' }, build: { model: 'openai/test-sol', reasoningEffort: 'medium' }, fast: { model: 'openai/test-luna', reasoningEffort: 'high' } },
};
const operator = {
  model: 'legacy-model#unchanged', modelProfiles: { schemaVersion: 1, enabled: true },
  modelCapabilities: { 'openai/test-sol': { available: true, tools: true, reasoningEfforts: ['medium', 'high'] }, 'openai/test-luna': { available: true, tools: true, reasoningEfforts: ['high'] } },
};
const resolve = (changes = {}) => resolveModelProfile({ project, operator, worker: 'implement', ...changes });

test('two workers select independent model and reasoning with explicit provenance', () => {
  const plan = resolve({ worker: 'refine' }), fast = resolve({ worker: 'review' });
  assert.equal(plan.engineModel, 'openai/test-sol#high');
  assert.equal(fast.engineModel, 'openai/test-luna#high');
  assert.equal(resolve().engineModel, 'openai/test-sol#medium');
  assert.equal(plan.source, 'project.workers');
  assert.deepEqual(plan.fields, { model: 'project', reasoningEffort: 'project' });
});
test('inherited constructor worker assignments fall through to the project default', () => {
  const local = { ...operator, modelProfiles: { ...operator.modelProfiles, workers: {} } };
  const selection = resolve({ operator: local, worker: 'constructor' });
  assert.equal(selection.profile, 'build');
  assert.equal(selection.source, 'project.defaultProfile');
});
test('operator field overrides and worker selection have documented precedence', () => {
  const local = { ...operator, modelProfiles: { schemaVersion: 1, enabled: true, defaultProfile: 'fast', workers: { refine: 'build' }, profiles: { build: { reasoningEffort: 'high' } } } };
  assert.equal(resolve({ operator: local, worker: 'refine' }).profile, 'build');
  assert.equal(resolve({ operator: local, worker: 'refine' }).reasoningEffort, 'high');
  assert.equal(resolve({ operator: local, worker: 'review' }).profile, 'fast');
  assert.equal(resolve({ operator: local }).profile, 'fast');
  const explicit = resolve({ operator: local, worker: 'refine', profile: 'plan' });
  assert.equal(explicit.profile, 'plan'); assert.equal(explicit.source, 'task.profile');
  assert.equal(resolve({ operator: local, profile: 'build' }).fields.reasoningEffort, 'operator');
  const modelOverride = { ...operator, modelProfiles: { schemaVersion: 1, enabled: true, profiles: { build: { model: 'openai/test-luna', reasoningEffort: 'high' } } } };
  assert.equal(resolve({ operator: modelOverride }).engineModel, 'openai/test-luna#high');
  const operatorOnly = { ...operator, modelProfiles: { schemaVersion: 1, enabled: true, defaultProfile: 'build', profiles: project.profiles } };
  assert.equal(resolve({ project: null, operator: operatorOnly }).engineModel, 'openai/test-sol#medium');
});
test('legacy is byte-for-byte and project declarations cannot override an unopted operator', () => {
  for (const modelProfiles of [undefined, { schemaVersion: 1, enabled: false }]) {
    const legacy = resolve({ operator: { model: 'openai/existing#custom', modelProfiles } });
    assert.equal(legacy.engineModel, 'openai/existing#custom');
    assert.equal(legacy.mode, 'legacy'); assert.equal(legacy.reasoningEffort, null);
    assert.throws(() => resolve({ operator: { model: 'existing' }, profile: 'fast' }), /opt-in/);
  }
});
test('invalid settings and unsupported transport or billing knobs are rejected', () => {
  for (const extra of [{ serviceTier: 'priority' }, { processingTier: 'fast' }, { transport: 'batch' }, { auth: 'api' }, { reasoningEffort: 'ultra' }, { model: 'anthropic/other' }, { model: 'openai/model#high' }]) {
    const bad = structuredClone(project); Object.assign(bad.profiles.build, extra);
    assert.throws(() => resolve({ project: bad }));
  }
  for (const bad of [{ ...project, schemaVersion: 2 }, { ...project, workers: { implement: 'unknown' } }, { ...project, profiles: { surprise: {} } }, { ...project, defaultProfile: null }]) assert.throws(() => resolve({ project: bad }));
  assert.throws(() => resolve({ profile: 'unknown' }), /Invalid requested/);
  assert.throws(() => resolve({ project: null }), /No model profile/);
  assert.throws(() => resolve({ operator: { ...operator, modelProfiles: { schemaVersion: 1 } } }), /explicit enabled/);
});
test('unavailable models, effort or tools fail without any fallback', () => {
  for (const capability of [undefined, { available: false, tools: true, reasoningEfforts: ['medium'] }, { available: true, tools: false, reasoningEfforts: ['medium'] }, { available: true, tools: true, reasoningEfforts: ['high'] }]) {
    assert.throws(() => resolve({ operator: { ...operator, modelCapabilities: { 'openai/test-sol': capability } } }), /unavailable/);
  }
  const bad = structuredClone(project); delete bad.profiles.build.reasoningEffort;
  assert.throws(() => resolve({ project: bad }), /Incomplete/);
});
test('max effort is accepted only when the operator declares support', () => {
  const selectedProject = structuredClone(project);
  selectedProject.profiles.build.reasoningEffort = 'max';
  assert.throws(() => resolve({ project: selectedProject }), /unavailable/);
  const selectedOperator = structuredClone(operator);
  selectedOperator.modelCapabilities['openai/test-sol'].reasoningEfforts.push('max');
  assert.equal(resolve({ project: selectedProject, operator: selectedOperator }).engineModel, 'openai/test-sol#max');
});
test('fast never implies premium processing or proven provider access and unknown is not zero', () => {
  const selection = resolve({ profile: 'fast' }), receipt = modelExecutionReceipt(selection);
  assert.equal(selection.engineModel, 'openai/test-luna#high');
  assert.equal(selection.capabilityEvidence, 'operator-configuration-only');
  assert.equal(receipt.providerReported.status, 'unverified');
  assert.equal(receipt.providerReported.model, null);
  assert.equal(receipt.billing.actualCost, null); assert.equal(receipt.billing.subscriptionUsage, null);
  assert.equal(receipt.billing.route, 'unchanged');
  assert.ok(!JSON.stringify(receipt).includes('priority'));
});

test('version 2 resolves direct worker settings and named presets without a three-profile limit', () => {
  const selectedProject = { schemaVersion: 2, defaultProfile: 'steady', workers: {
    triage: { model: 'openai/test-sol', reasoningEffort: 'medium' },
    refine: { model: 'openai/test-sol', reasoningEffort: 'high' },
    implement: { model: 'openai/test-luna', reasoningEffort: 'high' },
    review: 'deep',
  }, profiles: { steady: { model: 'openai/test-sol', reasoningEffort: 'medium' }, deep: { model: 'openai/test-luna', reasoningEffort: 'medium' } } };
  const selectedOperator = { ...operator, modelProfiles: { schemaVersion: 2, enabled: true }, modelCapabilities: { ...operator.modelCapabilities, 'openai/test-luna': { available: true, tools: true, reasoningEfforts: ['high', 'medium'] } } };
  assert.equal(resolve({ project: selectedProject, operator: selectedOperator, worker: 'triage' }).engineModel, 'openai/test-sol#medium');
  assert.equal(resolve({ project: selectedProject, operator: selectedOperator, worker: 'refine' }).engineModel, 'openai/test-sol#high');
  assert.equal(resolve({ project: selectedProject, operator: selectedOperator, worker: 'implement' }).engineModel, 'openai/test-luna#high');
  const review = resolve({ project: selectedProject, operator: selectedOperator, worker: 'review' });
  assert.equal(review.engineModel, 'openai/test-luna#medium');
  const overridden = resolve({ project: selectedProject, operator: { ...selectedOperator, modelProfiles: { ...selectedOperator.modelProfiles, profiles: { deep: { model: 'openai/test-sol' } } } }, worker: 'review' });
  assert.equal(overridden.engineModel, 'openai/test-sol#medium');
  assert.deepEqual(overridden.fields, { model: 'operator', reasoningEffort: 'project' });
});

test('execution selection needs version 2 operator opt-in and remains inside capabilities', () => {
  const selectedOperator = { ...operator, modelProfiles: { schemaVersion: 2, enabled: true, allowExecutionSelection: true, workers: { refine: 'build' } } };
  const direct = { model: 'openai/test-luna', reasoningEffort: 'high' };
  const chosen = resolve({ operator: selectedOperator, worker: 'refine', executionSelection: direct });
  assert.equal(chosen.engineModel, 'openai/test-luna#high'); assert.equal(chosen.source, 'execution');
  assert.equal(resolve({ operator: selectedOperator, executionSelection: { profile: 'plan' } }).engineModel, 'openai/test-sol#high');
  for (const bad of [{ model: 'openai/test-sol' }, { profile: 'plan', ...direct }, { ...direct, serviceTier: 'priority' }, { model: 'openai/test-luna', reasoningEffort: 'medium' }, { model: 'anthropic/test', reasoningEffort: 'high' }]) assert.throws(() => resolve({ operator: selectedOperator, executionSelection: bad }));
  assert.throws(() => resolve({ operator: { ...selectedOperator, modelProfiles: { ...selectedOperator.modelProfiles, allowExecutionSelection: false } }, executionSelection: direct }), /opt-in/);
  assert.throws(() => resolve({ operator: selectedOperator, executionSelection: direct, profile: 'fast' }), /Conflicting/);
});

test('version 2 rejects incomplete direct settings and fails closed under version 1 operator', () => {
  const selectedProject = { schemaVersion: 2, workers: { refine: { model: 'openai/test-sol' } } };
  assert.throws(() => resolve({ project: selectedProject, operator: { ...operator, modelProfiles: { schemaVersion: 2, enabled: true } } }), /include model and reasoning/);
  assert.throws(() => resolve({ project: { schemaVersion: 2, defaultProfile: 'anything' } }), /operator version 2/);
  assert.throws(() => resolve({ operator: { ...operator, modelProfiles: { schemaVersion: 1, enabled: true, allowExecutionSelection: true } } }), /version 2/);
});
