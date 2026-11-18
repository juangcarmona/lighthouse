import { test } from 'node:test';
import assert from 'node:assert/strict';
const { deriveMeasurements, measurementRecord, measurementHash, metricDefinitions, stableJson } = await import(process.env.LIGHTHOUSE_TEST_MEASUREMENT_MODULE ?? '../packages/sdlc/src/measurement.mjs');
const repository = { id: 1, fullName: 'example/project' }, time = '2026-01-10T00:00:00Z', head = 'a'.repeat(40), merge = 'b'.repeat(40);
function record(kind, id, data, at = time) { return measurementRecord(repository, kind, id, at, data, { id: `github:${kind}:${id}`, url: `https://github.com/example/project/issues/1`, revision: `sha256:${measurementHash(data)}`, observedAt: '2026-02-01T00:00:00Z' }); }
function bundle(records = [], kinds = [...new Set(records.map(r => r.kind))]) { return { schemaVersion: 1, repository, window: { start: '2026-01-01T00:00:00Z', end: '2026-02-01T00:00:00Z' }, records, collections: kinds.map(kind => ({ kind, status: 'complete' })) }; }
const metrics = input => Object.fromEntries(deriveMeasurements(input).metrics.map(m => [m.id, m]));

test('every metric has a versioned, interpretable definition', () => {
  assert.equal(metricDefinitions.length, 13);
  for (const definition of metricDefinitions) for (const key of ['id', 'version', 'unit', 'useCase', 'formula', 'sourceRequirements', 'window', 'deduplication', 'coverage', 'unavailableReason', 'privacy', 'aggregation', 'classification']) assert.ok(definition[key], `${definition.id}: ${key}`);
});
test('workflow success, blocked assessment, issue closure, merge and accepted delivery retain separate meanings', () => {
  const input = bundle([record('workflow-attempt', 'run:1:1', { runId: 1, attempt: 1, conclusion: 'success' }), record('stage-result', 'stage:1', { status: 'blocked', blockingCause: 'technical' }), record('issue', 'issue:1', { id: 1, state: 'closed' })], ['workflow-attempt', 'stage-result', 'issue', 'pull-request']);
  const result = metrics(input);
  assert.equal(result['execution.attempt-outcome.v1'].counts.success, 1);
  assert.equal(result['execution.stage-outcome.v1'].counts.passed, 0);
  assert.equal(result['execution.stage-outcome.v1'].counts.blocked, 1);
  assert.equal(result['execution.blocking-reason.v1'].counts.technical, 1);
  assert.equal(result['autonomy.human-wait-time.v1'].numerator, null);
  assert.equal(result['delivery.issue-to-integration.v1'].numerator, null);
  assert.equal(result['evidence.external-unknowns.v1'].acceptedDelivery, null);
});
test('issue-to-PR and integration use explicit relations and separate times with censoring', () => {
  const issue = record('issue', 'issue:1', { id: 1 });
  const relation = record('issue-pr-relation', 'timeline:1', { issueId: 1, prId: 2 });
  const pr = record('pull-request', 'pr:1', { id: 2, createdAt: '2026-01-10T01:00:00Z', mergedAt: '2026-01-10T03:00:00Z', merged: true, mergeCommitSha: merge, linkedIssueIds: [1], linkProof: [{ issueId: 1, sourceId: 'timeline:1', sha256: relation.source.sha256 }] });
  const result = metrics(bundle([issue, pr, relation, record('issue', 'issue:2', { id: 2 })]));
  assert.equal(result['delivery.issue-to-pr.v1'].numerator, 3600);
  assert.equal(result['delivery.issue-to-integration.v1'].numerator, 10800);
  assert.equal(result['delivery.issue-to-integration.v1'].censored, 1);
  assert.equal(result['delivery.issue-to-integration.v1'].coverage.eligible, 2);
  assert.equal(metrics(bundle([issue, record('pull-request', 'pr:2', { ...pr.data, linkProof: [] })]))['delivery.issue-to-pr.v1'].numerator, null);
});
test('explicit clipped human waiting is wall time; bots and skipped steps are not human effort or invocations', () => {
  const result = metrics(bundle([record('human-wait', 'wait:1', { cause: 'human', start: '2026-01-31T23:40:00Z', end: null }), record('human-touch', 'touch:1', { actorType: 'User', actorId: 12, event: 'comment' }), record('human-touch', 'bot:1', { actorType: 'Bot', actorId: 13, event: 'comment' }), record('agent-step', 'skip', { conclusion: 'skipped' })]));
  assert.equal(result['autonomy.human-wait-time.v1'].numerator, 1200);
  assert.equal(result['autonomy.human-wait-time.v1'].censored, 1);
  assert.equal(result['autonomy.human-wait-time.v1'].activeHumanSeconds, null);
  assert.equal(result['autonomy.human-touches.v1'].numerator, 1);
  assert.equal(result['execution.agent-step-duration.v1'].numerator, null);
});
test('measured tokens retain identity, authentication route and per-field N/M without double-counting reasoning', () => {
  const base = { invocationId: 'invocation:1', coverage: 'observed', usageSource: 'opencode-native', authenticationRoute: 'unknown', identity: { requested: 'example/model', resolved: 'example/model', providerReported: null }, inputTokens: 100, outputTokens: 100, reasoningTokens: 40 };
  const result = metrics(bundle([record('usage', 'usage:1', base), record('usage', 'usage:2', { ...base, invocationId: 'invocation:2', inputTokens: 30, outputTokens: null, reasoningTokens: null }), record('usage', 'usage:3', { ...base, invocationId: 'invocation:3', coverage: 'unavailable', inputTokens: null, outputTokens: null, reasoningTokens: null })]));
  const tokens = result['model.token-usage.v1'];
  assert.deepEqual(tokens.fields.inputTokens, { value: 130, measured: 2, eligible: 3, status: 'incomplete' });
  assert.deepEqual(tokens.fields.outputTokens, { value: 100, measured: 1, eligible: 3, status: 'incomplete' });
  assert.equal(tokens.actualBilledCost, null); assert.equal(tokens.billableOutputTokens, null);
  assert.equal(tokens.identities[0].providerReported, null);
  assert.equal(metrics(bundle([record('usage', 'first', base), record('usage', 'retry', base)]))['model.token-usage.v1'].fields.inputTokens.value, 100);
});
test('actual native agent wrapper duration excludes workflow time and missing or invalid steps', () => {
  const valid = { runId: 1, attempt: 1, jobId: 2, stepNumber: 3, stepName: 'OpenCode progress and result', startedAt: time, completedAt: '2026-01-10T00:00:30Z', conclusion: 'success' };
  const result = metrics(bundle([record('agent-step', 'step:1', valid), record('agent-step', 'step:2', { ...valid, stepName: 'Set up job' })]));
  assert.equal(result['execution.agent-step-duration.v1'].numerator, 30);
  assert.equal(result['execution.agent-step-duration.v1'].coverage.measured, 1);
});
test('delegation requires bound retained verifier sources; a naked authenticated boolean and contradictory heads are excluded', () => {
  const proof = [record('integration-authorization', 'authority', { head }), record('integration-merge', 'integration', { head, merge })];
  const data = { head, merge, verification: { adapter: 'lighthouse.integration.v1', status: 'verified-at-collection', sourceIds: ['authority', 'integration'], bindingSha256: measurementHash({ repositoryId: 1, head, merge }) } };
  const valid = record('delegated-integration', 'delegated', data);
  assert.equal(metrics(bundle([...proof, valid]))['autonomy.delegated-integration.v1'].numerator, 1);
  assert.equal(metrics(bundle([record('delegated-integration', 'naked', { head, merge, authenticated: true })]))['autonomy.delegated-integration.v1'].numerator, null);
  assert.equal(metrics(bundle([proof[0], record('integration-merge', 'integration', { head: 'c'.repeat(40), merge }), valid]))['autonomy.delegated-integration.v1'].numerator, null);
});
test('confirmed reversal needs an explicit revision relation; titles remain insufficient', () => {
  const data = { head, merge, verification: { adapter: 'lighthouse.revert.v1', status: 'verified-at-collection', sourceIds: ['original', 'reversal'], bindingSha256: measurementHash({ repositoryId: 1, head, merge }) } };
  const proof = [record('original-source', 'original', { revision: head }), record('reversal-source', 'reversal', { reverts: head, reversal: merge })];
  assert.equal(metrics(bundle([...proof, record('revert', 'revert:1', data)]))['delivery.confirmed-reverts.v1'].numerator, 1);
  assert.equal(metrics(bundle([record('revert', 'revert:2', { title: 'Revert something', head, merge })]))['delivery.confirmed-reverts.v1'].numerator, null);
});
test('duplicate bytes deduplicate; changed inputs, wrong repository and unsupported revisions expose limitations', () => {
  const stage = record('stage-result', 'stage', { status: 'passed' });
  assert.equal(metrics(bundle([stage, stage]))['execution.stage-outcome.v1'].numerator, 1);
  const alias = structuredClone(stage); alias.id = 'another-local-label';
  assert.equal(metrics(bundle([stage, alias]))['execution.stage-outcome.v1'].numerator, 1);
  const shifted = structuredClone(stage); shifted.time = '2026-01-11T00:00:00Z';
  assert.equal(metrics(bundle([shifted]))['execution.stage-outcome.v1'].status, 'unavailable');
  const retyped = structuredClone(stage); retyped.kind = 'workflow-attempt'; retyped.data.conclusion = 'success';
  assert.equal(metrics(bundle([retyped]))['execution.attempt-outcome.v1'].status, 'unavailable');
  const other = record('stage-result', 'stage', { status: 'failed' });
  assert.equal(metrics(bundle([stage, other]))['execution.stage-outcome.v1'].status, 'conflicting');
  const wrong = structuredClone(stage); wrong.source.repositoryId = 999;
  assert.equal(metrics(bundle([wrong]))['execution.stage-outcome.v1'].status, 'unavailable');
  const edited = structuredClone(stage); edited.data.status = 'failed';
  assert.equal(metrics(bundle([edited]))['execution.stage-outcome.v1'].numerator, null);
});
test('missing inventories and expired artifacts stay unavailable, whereas a complete empty count inventory can report zero', () => {
  const absent = metrics(bundle());
  assert.equal(absent['evidence.completeness.v1'].status, 'unavailable');
  assert.equal(absent['execution.attempt-outcome.v1'].numerator, null);
  assert.equal(metrics(bundle([], ['workflow-attempt']))['execution.attempt-outcome.v1'].numerator, 0);
  const partial = bundle([record('stage-result', 'stage', { status: 'passed' })]); partial.collections[0] = { kind: 'stage-result', status: 'incomplete', reason: 'Expired result artifact' };
  assert.equal(metrics(partial)['execution.stage-outcome.v1'].status, 'incomplete');
});
test('identical frozen inputs reproduce identical bytes and expose every selected source', () => {
  const input = bundle([record('stage-result', 'stage', { status: 'uncertain' })]);
  assert.equal(stableJson(deriveMeasurements(input)), stableJson(deriveMeasurements(JSON.parse(JSON.stringify(input)))));
  assert.equal(metrics(input)['execution.stage-outcome.v1'].sources[0].sha256, input.records[0].source.sha256);
  assert.throws(() => deriveMeasurements({ ...input, schemaVersion: 2 }), /Invalid/);
});
