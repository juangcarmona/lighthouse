import test from 'node:test';
import assert from 'node:assert/strict';
import { formatIssueComment } from '../packages/sdlc/src/issue-comment-intent.mjs';
import { pendingReply, routeIssue } from '../packages/sdlc/src/issue-entry.mjs';
import { parseProductDecision } from '../packages/sdlc/src/product-change.mjs';
import { reviewTarget, reviewThread, loadProposalReview } from '../packages/sdlc/src/proposal-review.mjs';

const user = { login: 'owner', id: 71, type: 'User' };
const text = body => formatIssueComment({ body, id: '46c9f511-4176-43f1-ab65-38fd6211d615', actorId: user.id });
const issue = { number: 7, state: 'open', labels: [{ name: 'needs-info' }] };
const report = { id: 80, created_at: '2026-01-01T12:00:00Z', user: { login: 'github-actions[bot]', type: 'Bot' }, body: `## Refinement:\nOutcome: blocked\n<!-- lighthouse-stage:refine:blocked -->\n<!-- lighthouse-actions:${'a'.repeat(64)} -->` };
const event = body => ({ action: 'created', issue, comment: { id: 81, user, body, created_at: '2026-01-01T12:01:00Z' } });

test('typed ordinary or malformed client input never answers a legacy pending stage', () => {
  for (const body of [text('Continue'), '<!-- lighthouse-issue-control:unknown -->\nContinue']) {
    assert.equal(pendingReply(event(body), [report]), null);
    assert.equal(routeIssue(event(body), 'owner', 'owner', 'issue_comment', [report]).run, false);
  }
  assert.equal(routeIssue(event('Continue'), 'owner', 'owner', 'issue_comment', [report]).run, true);
});

test('ordinary product approval-looking text cannot approve and PR client comments are not review feedback', () => {
  const approval = `/product-change approve change-name ${'a'.repeat(64)}`;
  assert.equal(parseProductDecision(text(approval)), null);
  assert.equal(parseProductDecision(approval).action, 'approve');
  const typed = event(text('Please implement this'));
  typed.issue = { ...issue, pull_request: {} };
  assert.equal(reviewTarget(typed, 'issue_comment'), null);
  assert.equal(reviewTarget({ ...typed, comment: { ...typed.comment, body: 'Native feedback' } }, 'issue_comment'), 7);
});


test('native submitted reviews with empty or omitted body retain their existing target', () => {
  for (const body of [undefined, null, ''])
    assert.equal(reviewTarget({ pull_request: { number: 7 }, review: { user, body, state: 'approved' } }, 'pull_request_review'), 7);
});


test('fresh source feedback and correction threads cannot promote ordinary client text', async () => {
  const native = { id: 81, user, body: 'Native correction', issue_url: 'https://api.github.com/repos/owner/repo/issues/60' };
  const typed = { ...native, id: 82, body: text('Implement this ordinary note') };
  const thread = await reviewThread(async path => path.startsWith('issues/') ? [native, typed] : [], 60, 'owner');
  assert.deepEqual(thread.map(item => item.id), [81]);
  const pr = { number: 60, state: 'open', user: { login: 'github-actions[bot]', type: 'Bot' },
    head: { sha: 'a'.repeat(40), ref: `lighthouse/propose-7-${'b'.repeat(12)}`, repo: { full_name: 'owner/repo' } },
    base: { ref: 'main', repo: { full_name: 'owner/repo' } }, body: `<!-- lighthouse-proposal:${'b'.repeat(64)} -->` };
  const delayedEvent = { issue: { number: 60, pull_request: {} }, comment: native };
  await assert.rejects(loadProposalReview(async path => path === 'pulls/60' ? pr : typed, 'owner/repo', 'owner', delayedEvent, 'issue_comment'), /Typed client text/);
});
