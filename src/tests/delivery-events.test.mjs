import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryAfterChecks, dispatchDeliveryChecks } from '../packages/sdlc/src/delivery-events.mjs';

const head = 'a'.repeat(40), merge = 'c'.repeat(40), repository = 'owner/repo';
const pr = { number: 60, state: 'open', merged: false, draft: false, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: `lighthouse/implement-47-${'b'.repeat(12)}`, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${'b'.repeat(64)} -->`, merge_commit_sha: merge };
const profile = { completion: { postMergeWorkflows: ['verify.yml'] } };
const file = value => ({ content: Buffer.from(JSON.stringify(value)).toString('base64') });
const event = { action: 'completed', workflow_run: { id: 123, head_sha: head } };

test('CI resumes only the current owner-approved bot PR; unrelated, failed and stale runs do nothing', async () => {
  let actual = pr, run = { id: 123, path: '.github/workflows/verify.yml', status: 'completed', conclusion: 'success', event: 'workflow_dispatch', head_sha: head, head_branch: pr.head.ref };
  let reviews = [{ id: 7, state: 'APPROVED', user: { login: 'owner' }, commit_id: head }];
  const api = async path => {
    if (path === 'actions/runs/123') return run;
    if (path === '') return { default_branch: 'main' };
    if (path.startsWith('contents/')) return file(profile);
    if (path.startsWith('commits/')) return [actual];
    if (path.includes('/reviews?')) return reviews;
    assert.equal(path, 'pulls/60'); return actual;
  };
  assert.equal((await deliveryAfterChecks(api, repository, 'owner', event)).stage, 'integrate');
  reviews.push({ id: 8, state: 'CHANGES_REQUESTED', user: { login: 'owner' }, commit_id: head });
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', event), null);
  reviews = [{ id: 9, state: 'APPROVED', user: { login: 'outsider' }, commit_id: head }];
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', event), null);
  reviews = [{ id: 10, state: 'APPROVED', user: { login: 'owner' }, commit_id: merge }];
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', event), null);
  run = { ...run, path: '.github/workflows/unrelated.yml' };
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', event), null);
  run = { ...run, path: '.github/workflows/verify.yml', conclusion: 'failure' };
  assert.equal(await deliveryAfterChecks(api, repository, 'owner', event), null);
  run = { ...run, conclusion: 'success', head_sha: merge, head_branch: 'main' };
  actual = { ...pr, state: 'closed', merged: true };
  assert.equal((await deliveryAfterChecks(api, repository, 'owner', { ...event, workflow_run: { id: 123, head_sha: merge } })).stage, 'review');
});

test('bot publications dispatch adopted CI for the exact branch and refuse a changed head', async () => {
  const writes = []; let changed = false;
  const api = async (path, method, body) => {
    if (method === 'POST') { writes.push({ path, body }); return; }
    if (path.startsWith('contents/')) return file(profile);
    assert.equal(path, 'pulls/60'); return changed ? { ...pr, head: { ...pr.head, sha: merge } } : pr;
  };
  await dispatchDeliveryChecks(api, head, pr);
  assert.deepEqual(writes, [{ path: 'actions/workflows/verify.yml/dispatches', body: { ref: pr.head.ref } }]);
  changed = true;
  await assert.rejects(dispatchDeliveryChecks(api, head, pr), /changed/);
  assert.equal(writes.length, 1);
});
