import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewText } from '../packages/sdlc/src/product-change-actions.mjs';

test('product review handoff names its target, decision and authority boundary', () => {
  const body = reviewText({ repository: 'owner/repo', snapshot: { issue: 7, stage: 'propose', defaultBranch: 'main' }, head: 'abc', changeId: 'CHG-EXAMPLE', changeName: 'example', files: [{ path: 'openspec/changes/example/product-change/proposed/spec.md', content: 'Specification' }], candidate: {}, validation: { provider: 'passed', openSpec: 'passed' }, runUrl: 'https://github.com/owner/repo/actions/runs/1', approvalKey: 'key', prUrl: 'https://github.com/owner/repo/pull/8' });
  assert.match(body, /Ready for your review · propose/);
  assert.match(body, /https:\/\/github.com\/owner\/repo\/pull\/8/);
  assert.match(body, /\/product-change approve example key/);
  assert.match(body, /\/product-change request-changes example key/);
  assert.match(body, /first line of a new comment/);
  assert.match(body, /Implementation, PR merge, release and deployment require their own authorization/);
});
