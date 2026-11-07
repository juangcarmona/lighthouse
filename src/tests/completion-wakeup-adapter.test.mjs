import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const head = 'a'.repeat(40);
async function observe(patch = {}, enabled = true) {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-completion-wakeup-'));
  try {
    const run = { id: 40, status: 'completed', conclusion: 'success', repository: { full_name: 'owner/repo' }, head_sha: head, head_branch: 'main', path: '.github/workflows/lighthouse-sdlc-integrate.lock.yml', event: 'workflow_dispatch', ...patch };
    await writeFile(join(root, 'fixture.json'), JSON.stringify(run));
    await writeFile(join(root, 'event.json'), JSON.stringify({ action: 'completed', workflow_run: { id: 40, head_sha: head } }));
    const loader = join(root, 'fetch.mjs');
    await writeFile(loader, `import { readFileSync, appendFileSync } from 'node:fs';
const run = JSON.parse(readFileSync(process.env.FIXTURE, 'utf8'));
globalThis.fetch = async (url, options) => {
  appendFileSync(process.env.CALLS, JSON.stringify({ url: String(url), method: options.method }) + '\\n');
  const path = String(url).replace('https://api.github.com/repos/owner/repo', '').replace(/^\\//, '');
  let value;
  if (path === '') value = { default_branch: 'main' };
  else if (path.startsWith('contents/')) value = { content: Buffer.from(JSON.stringify({ repository: 'owner/repo', completion: { postMergeWorkflows: ['ci.yml'] } })).toString('base64') };
  else if (path === 'actions/runs/40') value = run;
  else if (path.startsWith('issues?') || path.startsWith('commits/')) value = [];
  else throw Error('Unexpected adapter request ' + path);
  return { ok: true, status: 200, json: async () => value };
};`);
    const child = spawnSync(process.execPath, ['--import', loader, new URL('../packages/sdlc/src/pr-state-actions.mjs', import.meta.url).pathname], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_EVENT_NAME: 'workflow_run', GH_TOKEN: 'test-only', GITHUB_EVENT_PATH: join(root, 'event.json'), LIGHTHOUSE_COMPLETION_ENABLED: String(enabled), FIXTURE: join(root, 'fixture.json'), CALLS: join(root, 'calls.jsonl') } });
    assert.equal(child.status, 0, child.stderr);
    return (await readFile(join(root, 'calls.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('the real PR-state entrypoint wakes retained review on integration and delegated-delivery completion', async () => {
  for (const path of ['.github/workflows/lighthouse-sdlc-integrate.lock.yml', '.github/workflows/lighthouse-sdlc-unattended.yml', '.github/workflows/ci.yml']) {
    const calls = await observe({ path });
    assert.ok(calls.some(call => call.url.includes('/issues?state=open')), `No retained review reconciliation after ${path}`);
    assert.ok(calls.every(call => call.method === 'GET'));
  }
});

test('unadopted, foreign, stale, failed and disabled completion signals do not wake review', async () => {
  for (const patch of [{ path: '.github/workflows/other.yml' }, { repository: { full_name: 'other/repo' } }, { head_sha: 'b'.repeat(40) }, { status: 'in_progress' }, { conclusion: 'failure' }, { head_branch: 'other' }, { event: 'push' }]) {
    const calls = await observe(patch);
    assert.ok(!calls.some(call => call.url.includes('/issues?state=open')));
  }
  assert.ok(!(await observe({}, false)).some(call => call.url.includes('/issues?state=open')));
});


test('review context distinguishes scheduled recovery from a manual replay with original CI identity', async () => {
  const { readCompletionContinuation } = await import('../packages/sdlc/src/completion-events.mjs');
  const ci = { id: 40, run_attempt: 1, repository: { full_name: 'owner/repo' }, path: '.github/workflows/ci.yml', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', head_sha: head };
  const recovery = { ...ci, id: 50, path: '.github/workflows/lighthouse-worker-maintenance.yml', event: 'schedule' };
  const event = { workflow_run: { id: 40, head_sha: head }, completionRecovery: { maintenance: 50, attempt: 1, ci: 40 } };
  const api = async path => structuredClone(path === 'actions/runs/40' ? ci : recovery);
  const observation = await readCompletionContinuation(api, 'owner/repo', event);
  assert.equal(observation.ci.id, 40);
  assert.equal(observation.recovery.id, 50);
  assert.equal(observation.recovery.event, 'schedule');
  assert.equal(observation.recovery.url, 'https://github.com/owner/repo/actions/runs/50');
  recovery.event = 'workflow_dispatch';
  assert.equal((await readCompletionContinuation(api, 'owner/repo', event)).recovery.event, 'workflow_dispatch');
  assert.equal((await readCompletionContinuation(api, 'owner/repo', { workflow_run: event.workflow_run })).recovery, null);
  assert.equal(await readCompletionContinuation(api, 'owner/repo', null), null);
  recovery.repository.full_name = 'foreign/repo';
  await assert.rejects(readCompletionContinuation(api, 'owner/repo', event), /continuation/);
  recovery.repository.full_name = 'owner/repo';
  event.completionRecovery.ci = 41;
  await assert.rejects(readCompletionContinuation(api, 'owner/repo', event), /continuation/);
});
