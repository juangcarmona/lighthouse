import test from 'node:test';
import assert from 'node:assert/strict';
import { practiceCatalog, practiceStates } from '../packages/sdlc/src/practice-catalog.mjs';
import { observationPayload, practiceDigest, validatePracticeContext, validatePracticeObservation } from '../packages/sdlc/src/practice-observation.mjs';

export const context = { repository: { id: 42, fullName: 'example/project' }, ref: 'refs/heads/main', commit: 'a'.repeat(40), scope: { id: 'production', modules: ['core'] }, profile: 'library' };
export function observation(practice = 'tests', measurements = { declared: 4, executed: 4, passed: 4, failed: 0 }) {
  const value = { schemaVersion: 1, catalogVersion: '1.0.0', definitionVersion: '1.0.0', practice,
    repository: context.repository, ref: context.ref, commit: context.commit, scope: context.scope, mode: 'blocking',
    applicability: { status: 'applicable', profile: 'library', reason: 'Production scope', source: 'https://example.com/scope' },
    collection: { expected: 1, collected: 1, exclusions: [] }, measurements,
    source: { workflow: '.github/workflows/ci.yml', runId: 123, attempt: 1, jobId: 456, url: 'https://example.com/run/123', result: 'success', observedAt: '2026-11-16T12:00:00Z', producer: { name: 'tests', version: '1.0.0' }, reportDigest: '' } };
  return seal(value);
}
export function seal(value) { value.source.reportDigest = practiceDigest(observationPayload(value)); return value; }

test('common catalog freezes cumulative levels and complementary practices', () => {
  assert.equal(practiceCatalog.practices.length, 14);
  assert.equal(practiceCatalog.maximumAgeDays, 14);
  assert.ok(practiceCatalog.levels.L1.every(p => practiceCatalog.levels.L2.includes(p)));
  assert.ok(practiceCatalog.levels.L2.every(p => practiceCatalog.levels.L3.includes(p)));
  for (const id of ['mutation', 'hygiene', 'performance', 'restoration']) assert.ok(!practiceCatalog.levels.L3.includes(id));
  assert.throws(() => practiceCatalog.levels.L3.push('mutation'));
  assert.equal(practiceStates.length, 8);
});

test('observations require exact source, measurements, scope and identity without coercion', () => {
  assert.deepEqual(validatePracticeContext(context), []);
  assert.deepEqual(validatePracticeObservation(observation()), []);
  for (const mutate of [v => v.repository.id = '42', v => v.commit = 'main', v => v.source.attempt = 0, v => v.source.producer.version = '', v => v.source.url = 'file:///tmp/result', v => v.collection.collected = 2, v => v.scope.modules = [], v => v.measurements = null, v => v.source.observedAt = 'yesterday', v => v.attestation = 'passed', v => v.applicability.profile = 'my-weaker-profile']) {
    const value = structuredClone(observation()); mutate(value);
    assert.ok(validatePracticeObservation(value).length, JSON.stringify(value));
  }
});

test('measurement digests are deterministic and detect changed quality or exclusions', () => {
  assert.equal(practiceDigest({ a: 1, b: { x: 2, y: 3 } }), practiceDigest({ b: { y: 3, x: 2 }, a: 1 }));
  const value = observation(); value.measurements.failed = 1;
  assert.match(validatePracticeObservation(value).join(' '), /digest/);
  seal(value); assert.deepEqual(validatePracticeObservation(value), []);
  value.collection.exclusions.push({ scope: 'core', reason: 'Excluded', source: 'https://example.com/exception' });
  assert.match(validatePracticeObservation(value).join(' '), /digest/);
});
