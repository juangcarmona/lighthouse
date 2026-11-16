import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregatePracticeHistory } from '../packages/sdlc/src/practice-history.mjs';
import { evaluatePractices } from '../packages/sdlc/src/practice-evaluator.mjs';
import { practiceDigest } from '../packages/sdlc/src/practice-observation.mjs';
import { context, observation, seal } from './fixtures/practice-evidence.mjs';

const period = { start: '2026-11-01T00:00:00Z', end: '2026-12-01T00:00:00Z' };
const expected = samples => ({ context, catalogVersion: '1.0.0', levelVersion: '1.0.0', samples });
async function receipt({ runId = 123, attempt = 1, time = '2026-11-16T13:00:00Z', commit = context.commit, passed = 4 } = {}) {
  const o = observation(); o.commit = commit; o.source.runId = runId; o.source.attempt = attempt; o.source.url = `https://example.com/run/${runId}/attempt/${attempt}`; o.measurements.declared = passed; o.measurements.executed = passed; o.measurements.passed = passed; seal(o);
  return evaluatePractices({ context: { ...context, commit }, observations: [o], now: time, resolveSource: value => ({ verified: true, observationDigest: practiceDigest(value), enforcement: { status: 'verified', ci: true, merge: true, sources: ['https://example.com/rules'] } }) });
}

test('history deduplicates source retries and out-of-order arrivals without averaging levels', async () => {
  const first = await receipt(), retry = await receipt({ attempt: 2, passed: 5 });
  const report = aggregatePracticeHistory({ assessments: [retry, first, retry], period, expectations: [expected(3)] });
  assert.equal(report.currentCertification, false);
  const group = report.groups[0]; assert.equal(group.coverage.observedSamples, 1); assert.equal(group.coverage.missingSamples, 2);
  assert.equal(group.levelDistribution.unverified, 1); assert.equal(group.measurementTrends['tests.passed'].last, 5);
  assert.deepEqual(group.sources, ['https://example.com/run/123/attempt/2']); assert.ok(!Object.hasOwn(group, 'averageLevel'));
  assert.deepEqual(report, aggregatePracticeHistory({ assessments: [first, retry], period, expectations: [expected(3)] }));
});

test('compatible commits aggregate trends and definitions or scopes remain separate', async () => {
  const first = await receipt(), second = await receipt({ runId: 124, commit: 'b'.repeat(40), passed: 8, time: '2026-11-17T13:00:00Z' });
  const changed = structuredClone(second); changed.catalogVersion = '2.0.0'; changed.levelVersion = '2.0.0';
  const report = aggregatePracticeHistory({ assessments: [second, first, changed], period });
  assert.equal(report.groups.length, 2);
  const current = report.groups.find(g => g.catalogVersion === '1.0.0'); assert.equal(current.coverage.observedSamples, 2); assert.equal(current.coverage.unknownSamplingCoverage, true);
  assert.equal(current.measurementTrends['tests.passed'].min, 4); assert.equal(current.measurementTrends['tests.passed'].max, 8);
  assert.equal(current.levelDistribution.unverified, 2); assert.ok(!Object.hasOwn(current.context, 'commit'));
});

test('empty periods preserve explicitly expected samples and unknown cadence stays unknown', () => {
  const report = aggregatePracticeHistory({ assessments: [], period, expectations: [expected(7)] });
  assert.equal(report.groups[0].coverage.observedSamples, 0); assert.equal(report.groups[0].coverage.missingSamples, 7);
  assert.equal(report.groups[0].levelDistribution.L0, 0);
});

test('history rejects contradictions, invalid coverage, invalid periods and fabricated input kinds', async () => {
  const r = await receipt(), contradiction = structuredClone(r); contradiction.level = 'L0';
  assert.throws(() => aggregatePracticeHistory({ assessments: [r, contradiction], period }), /Contradictory/);
  for (const input of [
    { assessments: [r], period, expectations: [expected(0)] }, { assessments: [r], period: { start: period.end, end: period.start } },
    { assessments: [r], period: { start: '2026-01-01T00:00:00Z', end: '2026-02-01T00:00:00Z' } },
    { assessments: [{ ...r, kind: 'historical-practice-summary' }], period },
    { assessments: [r], period, expectations: [expected(1), expected(1)] },
  ]) assert.throws(() => aggregatePracticeHistory(input));
});

test('retained gaps, states and measurement references do not certify current code', async () => {
  const r = await receipt(); const report = aggregatePracticeHistory({ assessments: [r], period }); const group = report.groups[0];
  assert.equal(group.practiceStates.met, 1); assert.equal(group.practiceStates.missing, 13); assert.equal(group.coverage.missingPractices, 13);
  assert.ok(Object.keys(group.gaps).some(k => k.startsWith('coverage:'))); assert.match(report.retention, /no deletion/);
  await assert.rejects(evaluatePractices({ context, observations: [report] }), /Invalid practice observation/);
});

test('incompatible observation definitions remain visible without mixed measurement trends', async () => {
  const r = await receipt(); r.practices.find(p => p.practice === 'tests').observation.catalogVersion = '2.0.0'; seal(r.practices.find(p => p.practice === 'tests').observation);
  const group = aggregatePracticeHistory({ assessments: [r], period }).groups[0];
  assert.equal(group.incompatibleObservations, 1); assert.equal(group.observedDefinitions['tests@2.0.0/1.0.0'], 1); assert.deepEqual(group.measurementTrends, {});
});
