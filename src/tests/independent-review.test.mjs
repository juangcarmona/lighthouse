import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewOutputProtocol, reviewTemplate, reviewEnvelope, validateReviewPayload } from '../packages/sdlc/src/independent-review.mjs';
import { stageContext } from '../packages/sdlc/src/unattended-runtime.mjs';
import { completionOutput } from '../packages/sdlc/src/opencode-execute.mjs';

const request = { runId: 'a'.repeat(64), stage: 'integrate', worker: 'independent-review', reviewOutput: { protocol: 'verdict-v1', binding: 'b'.repeat(64), purpose: 'candidate' } };
const decision = { binding: request.reviewOutput.binding, verdict: 'accept', findings: [] };

test('host builds review envelopes from strict decisions and authenticated identity', () => {
  const context = stageContext(request, {});
  assert.deepEqual(Object.keys(context.contract).sort(), ['review', 'rules']);
  assert.match(context.contract.rules, /only \/output\/review.json/);
  const accepted = reviewEnvelope(decision, request);
  assert.equal(accepted.result.status, 'passed');
  assert.equal(accepted.result.runId, request.runId);
  assert.deepEqual(accepted.result.evidence, []);
  assert.equal(completionOutput(accepted, request).type, 'noop');
  for (const verdict of ['request-changes', 'escalate']) {
    const envelope = reviewEnvelope({ ...decision, verdict, findings: ['A specific boundary remains unproved.'] }, request);
    assert.equal(envelope.result.status, 'blocked');
    assert.deepEqual(envelope.result.missingEvidence, envelope.result.output.review.findings);
    assert.match(envelope.effect.body, /specific boundary/);
    assert.equal(completionOutput(envelope, request).type, 'noop');
  }
  const untouched = reviewEnvelope(reviewTemplate(request.reviewOutput), request);
  assert.equal(untouched.result.status, 'blocked');
  assert.match(untouched.result.missingEvidence[0], /not been completed/);
});

test('review payloads reject stale, ambiguous, extra and malformed model fields', () => {
  for (const value of [null, [], {}, { ...decision, binding: 'c'.repeat(64) }, { ...decision, verdict: 'passed' },
    { ...decision, findings: ['Incomplete but accepted'] }, { ...decision, verdict: 'escalate' },
    { ...decision, findings: [{ id: 'fake' }] }, { ...decision, findings: [' '] },
    { ...decision, findings: ['x'.repeat(4001)] }, { ...decision, findings: Array(31).fill('x') },
    { ...decision, evidence: ['Invented receipt'] }, { ...decision, runId: 'c'.repeat(64) }]) {
    assert.throws(() => validateReviewPayload(value, request.reviewOutput.binding), /invalid or stale/);
  }
  for (const change of [{ worker: 'implement' }, { stage: 'refine' }, { reviewOutput: { ...request.reviewOutput, protocol: 'unknown' } },
    { reviewOutput: { ...request.reviewOutput, binding: 'stale' } }]) assert.throws(() => reviewOutputProtocol({ ...request, ...change }), /Invalid host/);
});

test('legacy review envelopes stay schema-validated without implicit payload conversion', () => {
  const legacy = { ...request, reviewOutput: undefined };
  assert.equal(reviewOutputProtocol(legacy), null);
  const envelope = stageContext(legacy, {}).contract.envelope;
  assert.equal(completionOutput(envelope, legacy).type, 'noop');
  envelope.result.evidence = ['Actual malformed fourth-pilot wrapper'];
  assert.throws(() => completionOutput(envelope, legacy), /evidence/);
  assert.throws(() => reviewEnvelope(decision, legacy), /absent/);
});
