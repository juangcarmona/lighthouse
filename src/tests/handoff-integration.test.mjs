import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dispatchId, dispatchReceiptBody } from '../packages/sdlc/src/stage-dispatch.mjs';

test('failed resumed stage publishes a fresh outcome after the answer acknowledgement', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lh-handoff-integration-'));
  try {
    const repo = 'owner/repo', id = dispatchId(repo, '100', 'implement'), hash = 'b'.repeat(64), revision = 'a'.repeat(40);
    const receipt = { schemaVersion: 1, stage: 'implement', id, digest: hash, routerRunId: '100', routerAttempt: 1, workerRunId: '200', status: 'running' };
    const comments = [{ id: 30, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repo}/issues/18`, body: dispatchReceiptBody(repo, receipt) }, { id: 31, user: { login: 'github-actions[bot]', type: 'Bot' }, body: 'Answer received; continuation queued.' }];
    await writeFile(join(dir, 'event.json'), JSON.stringify({ inputs: { 'dispatch-request': '30' } }));
    await writeFile(join(dir, 'request.json'), JSON.stringify({ stage: 'implement', sourceRevision: revision, dispatch: { commentId: 30, requestId: id, digest: hash }, replyTo: 'earlier-run' }));
    await writeFile(join(dir, 'reserved'), 'run');
    await writeFile(join(dir, 'mock.mjs'), `import { appendFileSync } from 'node:fs';
const comments = ${JSON.stringify(comments)};
const record = ${JSON.stringify(Buffer.from(JSON.stringify({ verified: true, capability: { id: 'labels', provider: 'github', version: '3' } })).toString('base64'))};
globalThis.fetch = async (url, options) => {
  const path = url.replace('https://api.github.com/repos/owner/repo/', ''), method = options.method;
  appendFileSync(${JSON.stringify(join(dir, 'calls.jsonl'))}, JSON.stringify({ path, method, body: options.body ? JSON.parse(options.body) : null }) + '\\n');
  let value;
  if (path === 'issues/comments/30') { if (method === 'PATCH') comments[0].body = JSON.parse(options.body).body; value = comments[0]; }
  else if (path.startsWith('issues/18/comments?')) value = comments;
  else if (path === 'issues/18') value = { state: 'open', labels: [{ name: 'agent-working' }] };
  else if (path.startsWith('contents/.lighthouse/reconciliation/labels.json?')) value = { encoding: 'base64', content: record };
  else if (path === 'labels/execution-failed') value = { name: 'execution-failed' };
  else if (path === 'issues/18/comments' && method === 'POST') { value = { id: 32, user: { login: 'github-actions[bot]', type: 'Bot' }, body: JSON.parse(options.body).body }; comments.push(value); }
  else value = {};
  return { ok: true, status: 200, json: async () => value };
};`);
    const result = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'cleanup'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: repo, GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '1', LIGHTHOUSE_ISSUE: '18', LIGHTHOUSE_RUN_DIR: dir, LIGHTHOUSE_AGENT_RESULT: 'failure', GH_TOKEN: 'fixture' } });
    assert.equal(result.status, 0, result.stderr);
    const calls = (await readFile(join(dir, 'calls.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    const label = calls.findIndex(c => c.method === 'POST' && c.path === 'issues/18/labels');
    const post = calls.findIndex(c => c.method === 'POST' && c.path === 'issues/18/comments');
    assert.ok(label >= 0 && post > label);
    assert.match(calls[post].body.body, /Execution failed · implement/);
    assert.match(calls[post].body.body, /recorded answer remains available/);
    assert.doesNotMatch(calls[post].body.body, /Ready for your review|waiting-review/);
    await rm(join(dir, 'reserved'));
    await writeFile(join(dir, 'calls.jsonl'), '');
    const preparation = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'cleanup'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: repo, GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '1', LIGHTHOUSE_ISSUE: '18', LIGHTHOUSE_RUN_DIR: dir, LIGHTHOUSE_PREPARE_FAILED: 'true', GH_TOKEN: 'fixture' } });
    assert.equal(preparation.status, 0, preparation.stderr);
    const prepCalls = (await readFile(join(dir, 'calls.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    const prepComment = prepCalls.find(c => c.method === 'POST' && c.path === 'issues/18/comments');
    assert.match(prepComment.body.body, /Preparation failed before the agent started/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
