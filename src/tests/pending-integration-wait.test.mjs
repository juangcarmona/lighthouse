import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForPendingIntegration } from '../packages/sdlc/src/post-merge-review.mjs';

const repository = 'owner/repo', merge = 'a'.repeat(40), head = 'b'.repeat(40);
function fixture() {
  const hint = { schemaVersion: 1, repository, issue: 38, pr: 40, head, merge, run: '100', attempt: '1' };
  const comment = { id: 20, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repository}/issues/38`, body: `<!-- lighthouse-pending-review:${JSON.stringify(hint)} -->` };
  const issue = { state: 'open', user: { login: 'owner' }, labels: [] };
  const run = { id: 100, run_attempt: 1, repository: { full_name: repository }, path: '.github/workflows/lighthouse-sdlc-integrate.lock.yml', event: 'workflow_dispatch', head_branch: 'main', status: 'in_progress' };
  const ci = { id: 200, repository: { full_name: repository }, head_sha: merge, status: 'completed', conclusion: 'success' };
  const env = { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_ACTOR: 'github-actions[bot]', GITHUB_TRIGGERING_ACTOR: 'github-actions[bot]', LIGHTHOUSE_COMPLETION_ENABLED: 'true' };
  const event = { inputs: { issue: '38', stage: 'review', workflow: 'stage', after_run: '200' } };
  const after = { workflow_run: { id: 200, head_sha: merge } };
  const calls = []; let comments = [comment], sleeps = 0;
  const api = async (path, method = 'GET') => {
    calls.push({ path, method }); assert.equal(method, 'GET');
    if (path === '') return { default_branch: 'main' };
    if (path === 'issues/38') return issue;
    if (path.startsWith('issues/38/comments?')) return comments;
    if (path === 'actions/runs/100') return run;
    if (path === 'actions/runs/200') return ci;
    throw Error(path);
  };
  const call = wait => waitForPendingIntegration(api, repository, 'owner', event, after, env, async ms => { assert.equal(ms, 5000); sleeps++; await wait?.(sleeps); });
  return { hint, comment, issue, run, ci, env, event, after, calls, call, sleeps: () => sleeps, comments: value => { comments = value; } };
}

test('the original bot CI signal waits for terminal integration without another completion event', async () => {
  for (const path of ['.github/workflows/lighthouse-sdlc-integrate.lock.yml', '.github/workflows/lighthouse-sdlc-unattended.yml']) {
    const f = fixture(); f.run.path = path;
    const result = await f.call(n => { if (n === 3) f.run.status = 'completed'; });
    assert.equal(result.state, 'terminal'); assert.equal(f.sleeps(), 3);
    assert.ok(f.calls.every(c => c.method === 'GET'));
    assert.equal((await f.call()).state, 'terminal'); assert.equal(f.sleeps(), 3);
  }
});

test('delayed pending hint visibility is retained and waiting is bounded without sending effects', async () => {
  const f = fixture();f.comments([]);
  assert.equal((await f.call(n => { if (n === 2) { f.comments([f.comment]); f.run.status = 'completed'; } })).state, 'terminal');
  assert.equal(f.sleeps(), 2);
  const stalled = fixture();assert.equal((await stalled.call()).state, 'pending');assert.equal(stalled.sleeps(), 60);
});

test('owner holds, manual requests, foreign sources and mismatched CI cannot use the bot wait', async () => {
  for (const change of [f => { f.env.GITHUB_ACTOR = 'owner'; }, f => { f.ci.conclusion = 'failure'; }, f => { f.env.LIGHTHOUSE_COMPLETION_ENABLED = 'false'; }, f => { f.after.workflow_run.head_sha = head; }, f => { f.run.repository.full_name = 'foreign/repo'; }, f => { f.run.path = '.github/workflows/other.yml'; }, f => { f.issue.labels = [{ name: 'human-working' }]; }]) {
    const f = fixture();change(f);await f.call();assert.equal(f.sleeps(), 0);
  }
  const f = fixture();assert.equal((await f.call(() => { f.issue.labels = [{ name: 'future' }]; })).state, 'paused');assert.equal(f.sleeps(), 1);
});

test('the real router waits on the original CI, then denies a revoked workflow adoption without dispatch', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-original-ci-wait-'));
  try {
    const f = fixture();
    await writeFile(join(root, 'event.json'), JSON.stringify(f.event));
    await writeFile(join(root, 'hint.json'), JSON.stringify(f.comment));
    await writeFile(join(root, 'mock.mjs'), `import { readFileSync, appendFileSync } from 'node:fs';
let configs = 0, polls = 0;
globalThis.setTimeout = callback => setImmediate(callback);
globalThis.fetch = async (url, options) => {
  const path = String(url).replace('https://api.github.com/repos/owner/repo/', '');
  appendFileSync(process.env.CALLS, JSON.stringify({ path, method: options.method }) + '\\n');
  if (options.method !== 'GET') throw Error('Unexpected effect');
  let value;
  if (path === '' || String(url).endsWith('/owner/repo')) value = { default_branch: 'main' };
  else if (path === 'actions/runs/200') value = { id: 200, repository: { full_name: 'owner/repo' }, head_sha: '${merge}', head_branch: 'main', event: 'workflow_dispatch', path: '.github/workflows/ci.yml', status: 'completed', conclusion: 'success' };
  else if (path.startsWith('contents/')) value = { content: Buffer.from(JSON.stringify({ completion: { postMergeWorkflows: ++configs === 1 ? ['ci.yml'] : [] } })).toString('base64') };
  else if (path === 'issues/38') value = { state: 'open', user: { login: 'owner' }, labels: [] };
  else if (path.startsWith('issues/38/comments?')) value = [JSON.parse(readFileSync(process.env.HINT, 'utf8'))];
  else if (path === 'actions/runs/100') value = { id: 100, run_attempt: 1, repository: { full_name: 'owner/repo' }, path: '.github/workflows/lighthouse-sdlc-integrate.lock.yml', event: 'workflow_dispatch', head_branch: 'main', status: ++polls >= 3 ? 'completed' : 'in_progress' };
  else throw Error('Unexpected request ' + path);
  return { ok: true, status: 200, json: async () => value };
};`);
    const child = spawnSync(process.execPath, ['--import', join(root, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'route'], { encoding: 'utf8', env: { ...process.env, ...f.env, GH_TOKEN: 'fixture-only', GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_EVENT_PATH: join(root, 'event.json'), GITHUB_RUN_ID: '300', GITHUB_RUN_ATTEMPT: '1', GITHUB_OUTPUT: join(root, 'output'), RUNNER_TEMP: root, LIGHTHOUSE_TELEMETRY_DIR: join(root, 'telemetry'), CALLS: join(root, 'calls'), HINT: join(root, 'hint.json') } });
    assert.equal(child.status, 0, child.stderr);
    const calls = (await readFile(join(root, 'calls'), 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(calls.filter(c => c.path === 'actions/runs/100').length, 3);
    assert.ok(calls.every(c => c.method === 'GET'));
    assert.match(await readFile(join(root, 'output'), 'utf8'), /run=false/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
