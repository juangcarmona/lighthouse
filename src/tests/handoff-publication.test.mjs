import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { taskDigest } from '../packages/sdlc/src/issue-actions.mjs';
import { dispatchId, dispatchReceiptBody } from '../packages/sdlc/src/stage-dispatch.mjs';

// Run the installed command with durable API state, including a committed write whose response is lost.
async function publicationFixture(scenario) {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-publication-'));
  const repository = 'owner/repo', sha = 'a'.repeat(40);
  const issue = { number: 7, title: 'Task', body: 'Bounded work', state: 'open', labels: [{ name: 'refine' }, { name: 'agent-working' }] };
  const requestId = dispatchId(repository, '100', 'refine'), receiptDigest = 'b'.repeat(64);
  const receipt = { schemaVersion: 1, stage: 'refine', id: requestId, digest: receiptDigest, routerRunId: '100', routerAttempt: 1, workerRunId: '200', status: 'running' };
  const bot = { login: 'github-actions[bot]', type: 'Bot' };
  const receiptComment = { id: 30, user: bot, issue_url: `https://api.github.com/repos/${repository}/issues/7`, body: dispatchReceiptBody(repository, receipt) };
  const answer = { id: 29, user: { login: 'owner', type: 'User' }, body: 'Use the existing assets.', updated_at: '2020-01-01T00:00:00Z' };
  const snapshot = { repository, issue: 7, stage: 'refine', runId: digest('publication-fixture'), workflowRunId: '200', sourceRevision: sha, workflowRevision: sha, defaultBranch: 'main', autoImplement: false, taskDigest: taskDigest(issue, [answer]), dispatch: { commentId: 30, requestId, digest: receiptDigest } };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: snapshot.runId, stage: 'refine', gate: 'ready', status: scenario === 'question' ? 'blocked' : 'passed', evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Workflow maintainer: inspect the configured check.', ...(scenario === 'question' ? { output: { handoff: { question: 'Which export format should we support?' } } } : {}) }, effect: { type: 'issue-comment', body: 'The scope and acceptance criteria are recorded.' } };
  if (scenario === 'wrong-target') envelope.result.runId = digest('another-request');
  if (scenario === 'conflicting-question') envelope.result.output = { handoff: { question: 'A question cannot pass.' } };
  if (scenario === 'incomplete') envelope.result.missingEvidence = ['Acceptance criteria'];
  await writeFile(join(dir, 'request.json'), JSON.stringify(snapshot));
  await writeFile(join(dir, 'event.json'), '{}');
  if (scenario !== 'missing') await writeFile(join(dir, 'envelope.json'), scenario === 'malformed' ? '{' : JSON.stringify(envelope));
  await writeFile(join(dir, 'state.json'), JSON.stringify({ issue, sha, comments: [answer, receiptComment], calls: [], scenario, lost: false }));
  await writeFile(join(dir, 'mock.mjs'), `
import { readFileSync, writeFileSync } from 'node:fs';
const file = ${JSON.stringify(join(dir, 'state.json'))};
globalThis.fetch = async (url, options) => {
  const state = JSON.parse(readFileSync(file)), path = url.replace('https://api.github.com/repos/owner/repo', '').replace(/^\\//, ''), method = options.method;
  const body = options.body ? JSON.parse(options.body) : undefined;
  state.calls.push({ path, method, body });
  let value;
  if (path === '') value = { default_branch: 'main' };
  else if (path === 'commits/main') value = { sha: state.sha };
  else if (path === 'issues/7') value = state.issue;
  else if (path === 'issues/comments/30') value = state.comments.find(c => c.id === 30);
  else if (path.startsWith('issues/7/comments?')) value = state.comments;
  else if (path === 'issues/7/labels' && method === 'POST') {
    state.issue.labels.push(...body.labels.map(name => ({ name }))); value = state.issue.labels;
    if (state.scenario === 'source-changed') state.sha = 'c'.repeat(40);
    if (state.scenario === 'newer-attempt') state.comments.push({ ...state.comments[1], id: 40, body: '<!-- lighthouse-dispatch:newer -->' });
  }
  else if (path === 'issues/7/labels/refine' && method === 'DELETE') { state.issue.labels = state.issue.labels.filter(l => l.name !== 'refine'); value = []; }
  else if (path === 'issues/7/comments' && method === 'POST') { value = { id: 50, user: ${JSON.stringify(bot)}, body: body.body, html_url: 'https://github.com/owner/repo/issues/7#issuecomment-50' }; state.comments.push(value); }
  else throw Error('Unexpected API call: ' + method + ' ' + path);
  if (state.scenario === 'lost-response' && path === 'issues/7/comments' && method === 'POST' && !state.lost) { state.lost = true; writeFileSync(file, JSON.stringify(state)); throw Error('Response lost after commit'); }
  writeFileSync(file, JSON.stringify(state));
  return { ok: true, status: 200, json: async () => value };
};`);
  const run = () => spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'publish'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '1', LIGHTHOUSE_ISSUE: '7', LIGHTHOUSE_RUN_DIR: dir, GH_TOKEN: 'fixture' } });
  return { dir, run, state: async () => JSON.parse(await readFile(join(dir, 'state.json'), 'utf8')), envelope };
}

test('production publisher validates output before effects, preserves answers and deduplicates committed responses', async () => {
  for (const scenario of ['passed', 'question', 'wrong-target', 'conflicting-question', 'incomplete', 'missing', 'malformed', 'lost-response', 'newer-attempt', 'source-changed']) {
    const f = await publicationFixture(scenario);
    try {
      const first = f.run(), state = await f.state();
      const posts = state.calls.filter(c => c.method === 'POST' && c.path === 'issues/7/comments');
      const success = ['passed', 'question'].includes(scenario);
      assert.equal(first.status, success ? 0 : 1, `${scenario}: ${first.stderr}`);
      if (['wrong-target', 'conflicting-question', 'incomplete', 'missing', 'malformed'].includes(scenario)) {
        assert.equal(state.calls.some(c => c.method !== 'GET'), false, scenario);
        continue;
      }
      if (['newer-attempt', 'source-changed'].includes(scenario)) { assert.equal(posts.length, 0, scenario); continue; }
      assert.equal(posts.length, 1, scenario);
      assert.deepEqual(state.comments[0].body, 'Use the existing assets.');
      const label = scenario === 'question' ? 'needs-info' : 'ready';
      assert.ok(state.issue.labels.some(l => l.name === label), scenario);
      assert.ok(state.calls.findIndex(c => c.method === 'POST' && c.path === 'issues/7/labels') < state.calls.indexOf(posts[0]));
      assert.doesNotMatch(posts[0].body.body, /Ready for your review|waiting-review/);
      if (scenario === 'question') assert.match(posts[0].body.body, /Owner: Which export format should we support\? Reply here/);
      const writes = state.calls.filter(c => c.method !== 'GET').length;
      assert.equal(f.run().status, 0, scenario);
      assert.equal((await f.state()).calls.filter(c => c.method !== 'GET').length, writes, scenario);
      f.envelope.effect.body = 'Conflicting result for the same attempt';
      await writeFile(join(f.dir, 'envelope.json'), JSON.stringify(f.envelope));
      assert.equal(f.run().status, 1, scenario);
      assert.equal((await f.state()).calls.filter(c => c.method !== 'GET').length, writes, scenario);
    } finally { await rm(f.dir, { recursive: true, force: true }); }
  }
});
