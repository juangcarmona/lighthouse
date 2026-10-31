import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewText, productApplyHandoff } from '../packages/sdlc/src/product-change-actions.mjs';

test('product review handoff names its target, decision and authority boundary', () => {
  const body = reviewText({ repository: 'owner/repo', snapshot: { issue: 7, stage: 'propose', defaultBranch: 'main' }, head: 'abc', changeId: 'CHG-EXAMPLE', changeName: 'example', files: [{ path: 'openspec/changes/example/product-change/proposed/spec.md', content: 'Specification' }], candidate: {}, validation: { provider: 'passed', openSpec: 'passed' }, runUrl: 'https://github.com/owner/repo/actions/runs/1', approvalKey: 'key', prUrl: 'https://github.com/owner/repo/pull/8' });
  assert.match(body, /Ready for your review · propose/);
  assert.match(body, /https:\/\/github.com\/owner\/repo\/pull\/8/);
  assert.match(body, /\/product-change approve example key/);
  assert.match(body, /\/product-change request-changes example key/);
  assert.match(body, /first line of a new comment/);
  assert.match(body, /Implementation, PR merge, release and deployment require their own authorization/);
});

test('product apply handoff preserves the receipt and requests a separate PR review', () => {
  const receipt = { changeId: 'CHG-EXAMPLE', intentId: 'intent' };
  const body = productApplyHandoff({ stage: 'propose', receipt, pullRequest: 8, url: 'https://github.com/owner/repo/pull/8', affectedCitations: [{ document: 'spec.md', status: 'current' }] });
  assert.match(body, /Stage completed · propose/);
  assert.match(body, /https:\/\/github.com\/owner\/repo\/pull\/8/);
  assert.match(body, /spec\.md.*current/);
  assert.match(body, /Merge and any further delivery require their own authorization/);
  assert.ok(body.includes(`<!-- lighthouse-product-apply:${JSON.stringify(receipt)} -->`));
});
