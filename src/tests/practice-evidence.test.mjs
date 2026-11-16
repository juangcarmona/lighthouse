import test from 'node:test';
import assert from 'node:assert/strict';
import { practiceCatalog, practiceStates } from '../packages/sdlc/src/practice-catalog.mjs';
import { observationPayload, practiceDigest, validatePracticeContext, validatePracticeObservation } from '../packages/sdlc/src/practice-observation.mjs';

import { context, observation, seal } from './fixtures/practice-evidence.mjs';

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
