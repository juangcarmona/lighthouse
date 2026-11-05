import test from 'node:test';
import assert from 'node:assert/strict';
import { signalCurrentPostMergeReview } from '../packages/sdlc/src/delivery-events.mjs';
import { completedEvent } from '../packages/sdlc/src/stage-dispatch.mjs';

const repository = 'owner/repo', head = 'a'.repeat(40);
const env = { GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_RUN_ID: '50', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: head, LIGHTHOUSE_CI_RESULT: 'success' };
function fixture() {
  const run = { id: 50, run_attempt: 1, repository: { full_name: repository }, event: 'workflow_dispatch', path: '.github/workflows/ci.yml', head_sha: head, head_branch: 'main', status: 'in_progress' };
  const pr = { number: 7, state: 'closed', merged: true, merge_commit_sha: head, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: 'b'.repeat(40), ref: 'lighthouse/implement-18-aabbccddeeff', repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: '<!-- lighthouse-implementation:aabbccddeeff' + 'c'.repeat(52) + ' -->' };
  const profile = { completion: { postMergeWorkflows: ['ci.yml'] } }, writes = [];
  const api = async (path, method = 'GET', body) => {
    if (method === 'POST') { writes.push({ path, body }); return; }
    if (/^actions\/runs\/50(?:\/attempts\/1)?$/.test(path)) return run;
    if (path === '') return { default_branch: 'main' };
    if (path.startsWith('contents/')) return { content: Buffer.from(JSON.stringify(profile)).toString('base64') };
    if (path.startsWith('commits/')) return [pr];
    if (path === 'pulls/7') return pr;
    throw Error(`Unexpected API ${path}`);
  };
  return { api, run, pr, profile, writes };
}

test('successful post-merge CI explicitly wakes the existing router before its final job finishes', async () => {
  const f = fixture();
  assert.equal(await signalCurrentPostMergeReview(f.api, repository, env), true);
  assert.deepEqual(f.writes, [{ path: 'actions/workflows/lighthouse-sdlc-router.yml/dispatches', body: { ref: 'main', inputs: { issue: '18', stage: 'review', workflow: 'stage', after_run: '50' } } }]);
  let waits = 0;
  const after = await completedEvent(f.api, { inputs: f.writes[0].body.inputs }, { ...env, GITHUB_ACTOR: 'github-actions[bot]', GITHUB_TRIGGERING_ACTOR: 'github-actions[bot]' }, async () => { waits++; f.run.status = 'completed'; f.run.conclusion = 'success'; });
  assert.equal(waits, 1);
  assert.deepEqual(after, { action: 'completed', workflow_run: { id: 50, head_sha: head } });
});

test('signals cannot target failed CI, a foreign run, another branch, an unadopted workflow or a different merge', async () => {
  for (const patch of [{ LIGHTHOUSE_CI_RESULT: 'failure' }, { GITHUB_EVENT_NAME: 'pull_request' }, { GITHUB_SHA: 'c'.repeat(40) }, { GITHUB_RUN_ID: 'bad' }]) {
    const f = fixture(); assert.equal(await signalCurrentPostMergeReview(f.api, repository, { ...env, ...patch }), false); assert.equal(f.writes.length, 0);
  }
  for (const patch of [{ repository: { full_name: 'other/repo' } }, { path: '.github/workflows/other.yml' }, { head_branch: 'other' }, { run_attempt: 2 }, { status: 'completed', conclusion: 'failure' }]) {
    const f = fixture(); Object.assign(f.run, patch); assert.equal(await signalCurrentPostMergeReview(f.api, repository, env), false); assert.equal(f.writes.length, 0);
  }
  for (const patch of [{ merged: false }, { merge_commit_sha: 'c'.repeat(40) }, { user: { login: 'outsider' } }]) {
    const f = fixture(); Object.assign(f.pr, patch); assert.equal(await signalCurrentPostMergeReview(f.api, repository, env), false); assert.equal(f.writes.length, 0);
  }
});

test('bot review replays require adopted native CI and wait only within the existing continuation budget', async () => {
  const event = { inputs: { issue: '18', stage: 'review', workflow: 'stage', after_run: '50' } };
  const bot = { ...env, GITHUB_ACTOR: 'github-actions[bot]', GITHUB_TRIGGERING_ACTOR: 'github-actions[bot]' };
  for (const patch of [{ path: '.github/workflows/other.yml' }, { repository: { full_name: 'other/repo' } }, { event: 'repository_dispatch' }]) {
    const f = fixture(); Object.assign(f.run, patch); await assert.rejects(completedEvent(f.api, event, bot), /adopted CI/);
  }
  const f = fixture(); let waits = 0;
  await assert.rejects(completedEvent(f.api, event, bot, async () => { waits++; }), /timed out/);
  assert.equal(waits, 24);
});
