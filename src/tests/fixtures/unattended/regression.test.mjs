import test from 'node:test';
import assert from 'node:assert/strict';
import { eligible } from './eligibility.mjs';

test('inclusive boundary qualifies', () => {
  assert.equal(eligible(2), true, 'Expected inclusive boundary');
});

test('lower value does not qualify', () => {
  assert.equal(eligible(1), false);
});

test('higher value qualifies', () => {
  assert.equal(eligible(3), true);
});
