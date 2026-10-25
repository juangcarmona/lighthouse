import test from 'node:test';
import assert from 'node:assert/strict';
import { routeIssue, taskDigest, checkPublication, repositoryApiUrl } from '../packages/sdlc/src/issue-actions.mjs';
const issue = { number: 18, title: 'Migrate', body: 'Preserve content', state: 'open', labels: [] };
test('only the owner can start refinement; reservations and PRs are excluded', () => {
  const event = { action: 'labeled', issue, label: { name: 'refine' } };
  assert.equal(routeIssue(event, 'owner', 'owner', 'issues').run, true);
  assert.equal(routeIssue(event, 'outsider', 'owner', 'issues').run, false);
  for (const name of ['agent-working', 'human-working']) assert.equal(routeIssue({ ...event, issue: { ...issue, labels: [{ name }] } }, 'owner', 'owner', 'issues').run, false);
  assert.equal(routeIssue({ ...event, issue: { ...issue, pull_request: {} } }, 'owner', 'owner', 'issues').run, false);
});
test('an owner answer resumes only pending refinement, never arbitrary or bot comments', () => {
  const event = { action: 'created', issue: { ...issue, labels: [{ name: 'needs-info' }] }, comment: { user: { login: 'owner', type: 'User' } } };
  assert.equal(routeIssue(event, 'owner', 'owner', 'issue_comment').run, true);
  assert.equal(routeIssue({ ...event, issue }, 'owner', 'owner', 'issue_comment').run, false);
  assert.equal(routeIssue({ ...event, comment: { user: { login: 'owner', type: 'Bot' } } }, 'owner', 'owner', 'issue_comment').run, false);
});
test('publication refuses changed answers, changed source, closed issues and human takeover', () => {
  const comments = [{ id: 1, body: 'Authorized', updated_at: 'now' }];
  const snapshot = { taskDigest: taskDigest(issue, comments), sourceRevision: 'abc' };
  const reserved = { ...issue, labels: [{ name: 'agent-working' }] };
  assert.doesNotThrow(() => checkPublication(snapshot, reserved, comments, 'abc'));
  assert.throws(() => checkPublication(snapshot, reserved, [], 'abc'), /answers changed/);
  assert.throws(() => checkPublication(snapshot, reserved, comments, 'def'), /revision changed/);
  assert.throws(() => checkPublication(snapshot, { ...reserved, state: 'closed' }, comments, 'abc'), /closed/);
  assert.throws(() => checkPublication(snapshot, { ...reserved, labels: [...reserved.labels, { name: 'human-working' }] }, comments, 'abc'), /revoked/);
});
test('repository metadata endpoint has no trailing slash while subresources retain their separator', () => {
  assert.equal(repositoryApiUrl('owner/repo'), 'https://api.github.com/repos/owner/repo');
  assert.equal(repositoryApiUrl('owner/repo', 'issues/18'), 'https://api.github.com/repos/owner/repo/issues/18');
});
