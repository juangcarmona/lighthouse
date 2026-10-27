import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { routeIssue, taskDigest, checkPublication, repositoryApiUrl, pendingReply, checkReplyInputs } from '../packages/sdlc/src/issue-actions.mjs';
const issue = { number: 18, title: 'Migrate', body: 'Preserve content', state: 'open', labels: [] };
test('independent dispatch rejects issue aliases before claiming outside the issue concurrency group', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-dispatch-input-'));
  try {
    await writeFile(join(dir, 'event.json'), JSON.stringify({ inputs: { issue: '018', 'dispatch-request': '30' } }));
    await writeFile(join(dir, 'mock.mjs'), 'globalThis.fetch = () => { throw Error("Unexpected API access"); };');
    for (const input of ['018', '18.0', ' 18', '1.8e1', '9007199254740993']) {
      const run = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'prepare'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: 'github-actions[bot]', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_EVENT_PATH: join(dir, 'event.json'), LIGHTHOUSE_ISSUE: input, RUNNER_TEMP: dir } });
      assert.equal(run.status, 1);
      assert.match(run.stderr, /Dispatch issue must be a canonical positive integer/);
      assert.doesNotMatch(run.stderr, /Unexpected API access/);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('only the owner can start refinement; reservations and PRs are excluded', () => {
  const event = { action: 'labeled', issue, label: { name: 'refine' } };
  assert.equal(routeIssue(event, 'owner', 'owner', 'issues').run, true);
  assert.equal(routeIssue(event, 'outsider', 'owner', 'issues').run, false);
  for (const name of ['agent-working', 'human-working']) assert.equal(routeIssue({ ...event, issue: { ...issue, labels: [{ name }] } }, 'owner', 'owner', 'issues').run, false);
  assert.equal(routeIssue({ ...event, issue: { ...issue, pull_request: {} } }, 'owner', 'owner', 'issues').run, false);
});
const report = (stage = 'propose', status = 'blocked', time = '2026-10-26T10:00:00Z') => ({ id: 10, created_at: time, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `## ${stage === 'refine' ? 'Refinement' : 'Proposal'}: blocked candidate\n\nOutcome: ${status}\n<!-- lighthouse-actions:${'a'.repeat(64)} -->\n<!-- lighthouse-stage:${stage}:${status} -->` });
const reply = { id: 11, body: 'Use the external provider', created_at: '2026-10-26T11:00:00Z', user: { login: 'owner', type: 'User' } };
test('owner replies resume the blocked stage and never approve the next stage', () => {
  for (const stage of ['refine', 'propose']) {
    const event = { action: 'created', issue: { ...issue, labels: [{ name: stage === 'refine' ? 'needs-info' : 'waiting-review' }] }, comment: reply };
    assert.equal(routeIssue(event, 'owner', 'owner', 'issue_comment', [report(stage)]).stage, stage);
    assert.equal(routeIssue(event, 'owner', 'owner', 'issue_comment', [report(stage, 'passed')]).run, false);
    assert.equal(routeIssue(event, 'stranger', 'owner', 'issue_comment', [report(stage)]).run, false);
    assert.equal(routeIssue({ ...event, comment: { ...reply, user: { login: 'owner', type: 'Bot' } } }, 'owner', 'owner', 'issue_comment', [report(stage)]).run, false);
    assert.equal(routeIssue({ ...event, issue }, 'owner', 'owner', 'issue_comment', [report(stage)]).run, false);
    for (const label of ['human-working', 'agent-working']) assert.equal(routeIssue({ ...event, issue: { ...event.issue, labels: [...event.issue.labels, { name: label }] } }, 'owner', 'owner', 'issue_comment', [report(stage)]).run, false);
  }
});
test('pending reply ignores stale, empty and spoofed reports and cannot replay after publication', () => {
  const event = { comment: reply };
  assert.equal(pendingReply(event, [report()]).stage, 'propose');
  assert.equal(pendingReply(event, [report('propose', 'blocked', reply.created_at)]), null);
  assert.equal(pendingReply({ comment: { ...reply, body: ' ' } }, [report()]), null);
  assert.equal(pendingReply(event, [{ ...report(), user: { login: 'outsider', type: 'Bot' } }]), null);
  assert.equal(pendingReply(event, [report(), report('propose', 'passed')]), null);
  assert.equal(pendingReply(event, [report('implement')]).stage, 'implement');
  assert.equal(pendingReply(event, [{ ...report('implement'), body: report('implement').body + '\n[Review the implementation](https://example.test/pr)' }]), null);
  assert.equal(pendingReply(event, [{ ...report(), body: report().body.replace(/<!-- lighthouse-stage:.* -->/, '') }]).stage, 'propose');
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

test('decision replies extend input without accepting edited history or stale source', () => {
  const before = { id: 1, body: 'Original intent', created_at: '2026-10-26T09:00:00Z', updated_at: '2026-10-26T09:00:00Z' };
  const snapshot = { sourceRevision: 'abc', taskDigest: taskDigest(issue, [before]) };
  assert.doesNotThrow(() => checkReplyInputs(snapshot, issue, [before, reply], report(), 'abc'));
  assert.throws(() => checkReplyInputs(snapshot, issue, [{ ...before, body: 'Changed intent' }, reply], report(), 'abc'), /inputs changed/);
  assert.throws(() => checkReplyInputs(snapshot, { ...issue, body: 'Changed scope' }, [before, reply], report(), 'abc'), /inputs changed/);
  assert.throws(() => checkReplyInputs(snapshot, issue, [before, reply], report(), 'other'), /inputs changed/);
  assert.throws(() => checkReplyInputs(snapshot, issue, [reply], report(), 'abc'), /inputs changed/);
});

test('router refreshes a queued comment event and visibly acknowledges the owner reply', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-reply-route-'));
  try {
    const fresh = { ...issue, labels: [{ name: 'ready' }, { name: 'waiting-review' }] };
    const event = { action: 'created', issue: { ...fresh, labels: [{ name: 'agent-working' }] }, comment: reply };
    await writeFile(join(dir, 'event.json'), JSON.stringify(event));
    await writeFile(join(dir, 'mock.mjs'), `import { appendFileSync } from 'node:fs';
      globalThis.fetch = async (url, options) => {
        appendFileSync(${JSON.stringify(join(dir, 'calls'))}, JSON.stringify({url, method: options.method}) + '\n');
        const value = url.includes('/reactions') ? {} : url.includes('/comments?') ? ${JSON.stringify([report()])} : ${JSON.stringify(fresh)};
        return { ok: true, status: 200, json: async () => value };
      };`.replace("+ '\n'", "+ '\\n'"));
    const run = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'route'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: 'owner', GITHUB_EVENT_NAME: 'issue_comment', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_OUTPUT: join(dir, 'outputs'), RUNNER_TEMP: dir, GH_TOKEN: 'fixture' } });
    assert.equal(run.status, 0, run.stderr);
    assert.match(await readFile(join(dir, 'outputs'), 'utf8'), /stage=propose\nrun=true\nissue=18/);
    assert.match(await readFile(join(dir, 'calls'), 'utf8'), /issues\/comments\/11\/reactions/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('refine handoff binds the passed result to this issue, run, source and owner answers', async () => {
  const { checkHandoff } = await import('../packages/sdlc/src/issue-actions.mjs');
  const request = { runId: 'a'.repeat(64), stage: 'refine', issue: 18, workflowRunId: '123', sourceRevision: 'b'.repeat(40), taskDigest: taskDigest(issue, []) };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'refine', gate: 'ready', status: 'passed', evidence: [{ id: 'criteria', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'implement' }, effect: { type: 'issue-comment', body: 'Ready to implement.' } };
  assert.doesNotThrow(() => checkHandoff(request, envelope, issue, [], request.sourceRevision, '123'));
  for (const changed of [{ ...request, workflowRunId: 'other' }, { ...request, issue: 19 }, { ...request, taskDigest: 'changed' }, { ...request, sourceRevision: 'changed' }]) assert.throws(() => checkHandoff(changed, envelope, issue, [], request.sourceRevision, '123'));
  assert.throws(() => checkHandoff(request, { ...envelope, result: { ...envelope.result, status: 'blocked' } }, issue, [], request.sourceRevision, '123'));
  for (const name of ['future', 'needs-info', 'waiting-review', 'agent-working']) assert.throws(() => checkHandoff(request, envelope, { ...issue, labels: [{ name }] }, [], request.sourceRevision, '123'));
});
test('future pauses implementation and its removal resumes an implement-labelled issue', () => {
  const event = { action: 'labeled', label: { name: 'implement' }, issue: { ...issue, labels: [{ name: 'future' }, { name: 'implement' }] } };
  assert.equal(routeIssue(event, 'owner', 'owner', 'issues').run, false);
  event.action = 'unlabeled'; event.label.name = 'future'; event.issue.labels = [{ name: 'implement' }];
  assert.equal(routeIssue(event, 'owner', 'owner', 'issues').stage, 'implement');
  assert.equal(routeIssue(event, 'outsider', 'owner', 'issues').run, false);
});
