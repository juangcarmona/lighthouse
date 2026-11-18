import test from 'node:test';
import assert from 'node:assert/strict';
import { taskDigest } from '../packages/sdlc/src/digests.mjs';
import { retainedChangeContext, assertRetainedIntent, validateInstructionReview } from '../packages/sdlc/src/change-continuity.mjs';
import { validateStageEnvelope } from '../packages/sdlc/src/host-contract.mjs';
import { stageContext } from '../packages/sdlc/src/unattended-runtime.mjs';

const issue = { number: 104, title: 'Retain intent', body: 'Criteria, unresolved question and decision references stay here.', updated_at: '2026-11-18T00:00:00Z', ownerAnswers: [] };
const request = { repository: 'owner/project', issue: 104, stage: 'implement', runId: 'a'.repeat(64), sourceRevision: 'b'.repeat(40), taskDigest: taskDigest(issue, []), instructionReview: 1 };
const review = (status = 'current') => ({ schemaVersion: 1, status: 'reviewed', reason: 'Inspect the guidance affected by the delivered behavior.', sources: [{ path: 'AGENTS.md', owner: 'project maintainer', status, evidence: 'Compared the current command and owning source; both preserve the same required check.' }] });

test('context preserves provenance and original input pointers without inventing an approval', () => {
  const context = retainedChangeContext(request, issue);
  assert.equal(context.workItem.revision, issue.updated_at); assert.equal(context.workItem.taskDigest, request.taskDigest);
  assert.equal(context.sourceRevision, request.sourceRevision); assert.equal(context.decisionOwner, 'owner');
  assert.match(context.inputs.intentAndCriteria, /issue.body/); assert.match(context.inputs.questionsAndDecisions, /ownerAnswers/);
  assert.match(context.inputs.interpretation, /requires its authenticated source/);
  assert.deepEqual(stageContext(request, issue).continuity, context);
});

test('changed intent or a revised owner decision rejects continuation under the old grant', () => {
  assert.doesNotThrow(() => assertRetainedIntent(request, issue, []));
  assert.throws(() => assertRetainedIntent(request, { ...issue, body: 'A new criterion' }, []), /Decision owner: owner/);
  assert.throws(() => assertRetainedIntent(request, issue, [{ id: 1, body: 'New owner decision', updated_at: 'now' }]), /request refinement again/);
});

test('conflicting guidance blocks, a supported host difference passes and missing sources cannot be claimed', () => {
  assert.deepEqual(validateInstructionReview(review('host-specific'), new Map([['AGENTS.md', {}]])), []);
  for (const status of ['stale', 'conflict', 'missing']) assert.match(validateInstructionReview(review(status)).join('\n'), /responsible owner: project maintainer/);
  assert.match(validateInstructionReview(review(), new Map()).join('\n'), /absent from the candidate/);
  assert.deepEqual(validateInstructionReview({ schemaVersion: 1, status: 'not-applicable', reason: 'Verification-only correction returns the unchanged source tree.', sources: [] }), []);
  assert.ok(validateInstructionReview({ ...review(), sources: [{ ...review().sources[0], path: '../outside' }] }).length);
});

test('new implementation requests require the instruction assessment and preserve legacy request compatibility', () => {
  const envelope = stageContext(request, issue).contract.envelope;
  assert.match(validateStageEnvelope(envelope, request).join('\n'), /Instruction review/);
  envelope.result.output.instructionReview = review();
  assert.deepEqual(validateStageEnvelope(envelope, request), []);
  envelope.result.output.instructionReview = review('conflict');
  assert.ok(validateStageEnvelope(envelope, request).length);
  const { instructionReview, ...legacy } = request;
  delete envelope.result.output.instructionReview;
  assert.deepEqual(validateStageEnvelope(envelope, legacy), []);
});
