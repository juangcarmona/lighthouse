import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePractices, selectPracticeObservations } from '../packages/sdlc/src/practice-evaluator.mjs';
import { practiceDigest } from '../packages/sdlc/src/practice-observation.mjs';
import { context, observation, seal } from './fixtures/practice-evidence.mjs';

const now = '2026-11-16T13:00:00Z';
const proof = o => ({ verified: true, observationDigest: practiceDigest(o), enforcement: { status: 'verified', ci: true, merge: true, sources: ['https://example.com/rules/1'] } });
const scanner = { name: 'scanner', version: '1', ruleVersion: '1' };
export function passingObservations() {
  const values = { secrets: { confirmedSecrets: 0, scanner }, vulnerabilities: { critical: 0, high: 0, scanner }, sast: { blocking: 0, scanner }, tests: { declared: 4, executed: 4, passed: 4, failed: 0 },
    coverage: { modules: [{ id: 'core', lines: 80, branches: 70 }] }, specifications: { format: 'gherkin', declared: 2, executed: 2, passed: 2, failed: 0 },
    sbom: { format: 'CycloneDX', documentDigest: practiceDigest('sbom'), components: 2 }, licenses: { policy: { id: 'permitted', version: '1', digest: practiceDigest('policy') }, assessed: 2, violations: 0 },
    complexity: { modules: [{ id: 'core', declaredMethods: 1 }], methods: [{ id: 'method', module: 'core', cyclomatic: 15, crap: 30 }] }, dast: { critical: 0, high: 0, scanner } };
  return Object.entries(values).map(([p, m]) => observation(p, m));
}
const assess = (observations, extra = {}) => evaluatePractices({ context, observations, resolveSource: proof, now, ...extra });
const practice = (r, id) => r.practices.find(p => p.practice === id);

test('all common criteria establish cumulative L3 without mutation or other complements', async () => {
  const report = await assess(passingObservations()); assert.equal(report.level, 'L3');
  assert.equal(practice(report, 'mutation').state, 'missing');
  for (const state of ['failure', 'success']) {
    const mutation = observation('mutation', { coveredScore: 10, fullScore: 5, killed: 1, survived: 8, timedOut: 1, uncovered: 10, modules: [{ id: 'core' }] }); mutation.source.result = state;
    const result = await assess([...passingObservations(), seal(mutation)]); assert.equal(result.level, 'L3');
    assert.equal(practice(result, 'mutation').state, state === 'failure' ? 'failing' : 'below-standard');
    assert.equal(practice(result, 'mutation').observation.measurements.uncovered, 10);
  }
});

test('no evidence and unauthenticated declarations remain unverified, never L0', async () => {
  assert.equal((await assess([])).level, 'unverified');
  assert.equal((await assess(passingObservations(), { resolveSource: undefined })).level, 'unverified');
  assert.equal((await assess(passingObservations(), { resolveSource: () => { throw Error('403'); } })).level, 'unverified');
  assert.equal((await assess(passingObservations(), { resolveSource: () => ({ verified: true, observationDigest: 'forged' }) })).level, 'unverified');
});

test('verified L1 negatives establish L0 and block every inherited level', async () => {
  for (const id of ['secrets', 'vulnerabilities', 'sast', 'tests']) {
    const values = passingObservations(), o = values.find(v => v.practice === id);
    if (id === 'tests') o.source.result = 'failure'; else o.measurements[id === 'secrets' ? 'confirmedSecrets' : id === 'sast' ? 'blocking' : 'high'] = 1;
    seal(o); const r = await assess(values); assert.equal(r.level, 'L0', id); assert.ok(!r.levels.L3.demonstrated);
  }
});

test('L1 has no coverage floor; every higher-level gap remains visible', async () => {
  const values = passingObservations().filter(o => ['secrets', 'vulnerabilities', 'sast', 'tests'].includes(o.practice));
  const r = await assess(values); assert.equal(r.level, 'L1'); assert.equal(r.levels.L2.gaps.length, 4); assert.equal(r.levels.L3.gaps.length, 6);
});

test('common module floors, specification execution, licenses and method limits cannot be weakened', async () => {
  for (const [id, mutate, expected] of [
    ['coverage', m => m.modules[0].lines = 79.9, 'L1'], ['coverage', m => m.modules[0].branches = 69.9, 'L1'],
    ['coverage', m => m.modules.push({ id: 'other', lines: 100, branches: 100 }), 'L1'],
    ['specifications', m => m.format = 'tool-detected', 'L1'], ['specifications', m => { m.executed = 1; m.passed = 1; }, 'L1'],
    ['licenses', m => m.policy.version = '', 'L1'], ['licenses', m => m.assessed = 1, 'L1'], ['licenses', m => m.violations = 1, 'L1'],
    ['complexity', m => m.methods[0].cyclomatic = 16, 'L2'], ['complexity', m => m.methods[0].crap = 31, 'L2'],
    ['complexity', m => m.modules[0].declaredMethods = 2, 'L2'], ['dast', m => m.high = 1, 'L2'],
  ]) {
    const values = passingObservations(); mutate(values.find(v => v.practice === id).measurements); values.forEach(seal);
    assert.equal((await assess(values)).level, expected, id);
  }
});

test('missing measurements, exclusions, partial collection and skipped tests stay partial', async () => {
  for (const mutate of [o => o.measurements.passed = null, o => o.measurements = {}, o => o.collection.collected = 0, o => { o.measurements.declared = 5; }, o => o.collection.exclusions.push({ scope: 'core', reason: 'No report', source: 'https://example.com/exclusion' })]) {
    const o = observation(); mutate(o); const r = await assess([seal(o)]); assert.equal(practice(r, 'tests').state, 'partial'); assert.equal(r.level, 'unverified');
  }
});

test('justified library DAST exemption is visible; missing scanner cannot exempt an HTTP service', async () => {
  const values = passingObservations(), o = values.find(v => v.practice === 'dast'); o.applicability.status = 'not-applicable'; o.applicability.reason = 'Library has no HTTP surface'; seal(o);
  let r = await assess(values); assert.equal(r.level, 'L3'); assert.equal(practice(r, 'dast').state, 'not-applicable');
  values.forEach(v => { v.applicability.profile = 'http-service'; seal(v); });
  r = await assess(values, { context: { ...context, profile: 'http-service' } }); assert.equal(r.level, 'L2'); assert.equal(practice(r, 'dast').state, 'partial');
});

test('passing source is distinct from mandatory configured enforcement', async () => {
  for (const enforcement of [undefined, { status: 'unavailable' }, { status: 'verified', ci: true, merge: false, sources: ['https://example.com/rules'] }]) {
    const r = await assess(passingObservations(), { resolveSource: o => ({ ...proof(o), enforcement }) });
    assert.equal(r.level, 'unverified'); assert.equal(practice(r, 'tests').state, 'met'); assert.ok(practice(r, 'tests').enforcementGaps.length);
  }
  const values = passingObservations(); values[0].mode = 'report-only'; seal(values[0]); assert.equal((await assess(values)).level, 'unverified');
});

test('commit, repository, scope, profile, definition and freshness never inherit certification', async () => {
  for (const mutate of [o => o.commit = 'b'.repeat(40), o => o.repository = { ...o.repository, id: 43 }, o => o.ref = 'refs/heads/other', o => o.scope = { id: 'other', modules: ['core'] }, o => o.definitionVersion = '2.0.0', o => o.source.observedAt = '2026-11-01T00:00:00Z', o => o.source.observedAt = '2026-11-17T00:00:00Z']) {
    const values = passingObservations(); values.forEach(o => { mutate(o); seal(o); }); assert.equal((await assess(values)).level, 'unverified');
  }
});

test('source attempts deduplicate; later failed retry cannot be hidden by an earlier success', async () => {
  const a = observation(), b = structuredClone(a); b.source.attempt = 2; b.source.result = 'failure';
  assert.equal(selectPracticeObservations([b, a, a]).length, 1);
  assert.equal(practice(await assess([b, a]), 'tests').state, 'failing');
  const contradiction = structuredClone(a); contradiction.measurements.failed = 1; seal(contradiction);
  assert.throws(() => selectPracticeObservations([a, contradiction]), /Contradictory/);
});
