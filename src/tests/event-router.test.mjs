import test from 'node:test';
import assert from 'node:assert/strict';
import { routeEvent } from '../packages/sdlc/src/event-router.mjs';
import { digest, validateExecutionRequest } from '../packages/sdlc/src/host-contract.mjs';
import pkg from '../packages/sdlc/package.json' with { type: 'json' };

const policy = { repository: 'owner/repo', owner: 'owner', directRefine: true, stages: ['refine'], packageVersion: pkg.version, workflowRevision: 'a'.repeat(40), maxSeconds: 600 };
const facts = { repository: policy.repository, actor: policy.owner, event: 'issues', action: 'labeled', label: 'refine', eventId: 42, isPullRequest: false, state: 'open', labels: ['refine'] };

test('only explicitly admitted engineering labels route; content and working labels grant no authority', () => {
  assert.equal(routeEvent(facts, policy).action, 'run');
  for (const diff of [{ actor: 'stranger' }, { repository: 'other/repo' }, { event: 'issue_comment' }, { action: 'opened' }, { label: 'agent-working' }, { isPullRequest: true }, { state: 'closed' }, { eventId: undefined }, { labels: ['human-working'] }, { labels: ['agent-working'] }]) {
    assert.notEqual(routeEvent({ ...facts, ...diff }, policy).action, 'run', JSON.stringify(diff));
  }
  assert.notEqual(routeEvent(facts, { ...policy, directRefine: false }).action, 'run');
});

test('direct refinement has explicit versioned authority and never borrows triage or merge permission', () => {
  const request = { schemaVersion: 2, runId: 'b'.repeat(64), repository: policy.repository, issue: 1, stage: 'refine', route: 'supervised', sourceRevision: 'c'.repeat(40), workflowRevision: policy.workflowRevision, workflowRunId: 7, packageVersion: pkg.version, policyDigest: digest(JSON.stringify(policy)), deadline: new Date(Date.now() + 300000).toISOString(), writeScope: [], predecessor: null, approvalCommentId: null, authorization: routeEvent(facts, policy).authorization };
  const validate = (value, p = policy) => validateExecutionRequest(value, p, request.policyDigest);
  request.runId = digest('owner/repo:1:refine:42');
  assert.deepEqual(validate(request), []);
  assert.ok(validate({ ...request, runId: 'f'.repeat(64) }).length);
  for (const diff of [{ schemaVersion: 1 }, { stage: 'implement' }, { route: 'unattended' }, { predecessor: {} }, { approvalCommentId: 1 }, { authorization: { ...request.authorization, actor: 'stranger' } }, { authorization: { ...request.authorization, eventId: 0 } }, { authorization: { ...request.authorization, merge: true } }]) assert.ok(validate({ ...request, ...diff }).length);
  assert.ok(validate(request, { ...policy, directRefine: false }).length);
});
