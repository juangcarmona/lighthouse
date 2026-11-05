import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { githubResponseError } from '../packages/sdlc/src/issue-actions.mjs';
import { routeIssue, taskDigest, checkPublication, repositoryApiUrl, pendingReply, checkReplyInputs, continuationContext, continuationHistory, refinementNextAction, checkProductEntry, productGapNextAction, publishRoutingHandoff, resolveEpicRouting, checkEpicAuthority, checkEpicTriageBinding } from '../packages/sdlc/src/issue-actions.mjs';

test('epic routing is opt-in and authenticates bot children before selecting a parent lease', async () => {
  const route = { run: true, stage: 'triage' }, parent = { parent: 146 }, calls = [];
  const api = async path => { calls.push(path); return { user: { login: 'github-actions[bot]', type: 'Bot' } }; };
  const authenticate = async input => { calls.push(input.child); return parent; };
  assert.equal(await resolveEpicRouting(api, 'owner/repo', 'owner', 18, route, 'false', authenticate), undefined);
  assert.deepEqual(calls, []);
  assert.deepEqual(await resolveEpicRouting(api, 'owner/repo', 'owner', 18, route, 'true', authenticate), parent);
  assert.deepEqual(calls, ['issues/18', 18]);
  await assert.rejects(resolveEpicRouting(api, 'owner/repo', 'owner', 18, route, 'true', async () => { throw Error('untrusted'); }), /untrusted/);
  assert.equal(await resolveEpicRouting(async () => ({ user: { login: 'owner', type: 'User' } }), 'owner/repo', 'owner', 18, route, 'true', authenticate), undefined);
  await assert.doesNotReject(checkEpicAuthority(parent, async () => parent));
  await assert.rejects(checkEpicAuthority(parent, async () => ({ parent: 147 })), /authority changed/);
  await assert.rejects(checkEpicAuthority(parent, async () => { throw Error('paused'); }), /paused/);
});

test('epic child refinement rejects triage from a different parent, slice or plan', () => {
  const epic = { parent: 146, slice: 'first', planDigest: 'a'.repeat(64), base: 'lighthouse/epic-146', sourceRevision: 'b'.repeat(40) };
  assert.doesNotThrow(() => checkEpicTriageBinding(epic, { request: { epic: { ...epic } } }));
  for (const change of [{ parent: 147 }, { slice: 'second' }, { planDigest: 'c'.repeat(64) }, { sourceRevision: 'd'.repeat(40) }]) assert.throws(() => checkEpicTriageBinding(epic, { request: { epic: { ...epic, ...change } } }), /current authenticated epic plan/);
  assert.throws(() => checkEpicTriageBinding(epic, { request: {} }), /current authenticated epic plan/);
  assert.doesNotThrow(() => checkEpicTriageBinding(undefined, { request: {} }));
});

test('routing handoffs are idempotent per authenticated feedback identity', async () => {
  const comments = [], posts = [];
  const api = async (path, method = 'GET', payload) => {
    if (method === 'GET') return comments;
    posts.push(payload.body);
    comments.push({ user: { login: 'github-actions[bot]', type: 'Bot' }, body: payload.body });
  };
  assert.equal(await publishRoutingHandoff(api, 10, 'feedback-1', 'Requested'), true);
  assert.equal(await publishRoutingHandoff(api, 10, 'feedback-1', 'Already handled'), false);
  assert.equal(await publishRoutingHandoff(api, 10, 'feedback-2', 'Requested'), true);
  assert.equal(posts.length, 2);
});

test('continuation binds the previous question to the authenticated reply', () => {
  const prior = { request: { runId: 'prior-run' }, envelope: { result: { output: { handoff: { question: 'May these assets be reused?' } } } } };
  assert.deepEqual(continuationContext(prior, { body: 'Yes, all ten.', html_url: 'https://example.test/reply' }), { question: 'May these assets be reused?', answer: { body: 'Yes, all ten.', url: 'https://example.test/reply' }, priorRunId: 'prior-run' });
  const first = continuationHistory(prior, { body: 'Yes, all ten.', html_url: 'https://example.test/reply' });
  const second = { request: { runId: 'next-run', answerHistory: first }, envelope: { result: { output: { handoff: { question: 'Which format?' } } } } };
  assert.deepEqual(continuationHistory(second, { body: 'PDF', html_url: 'https://example.test/reply2' }).map(item => [item.question, item.answer.body]), [['May these assets be reused?', 'Yes, all ten.'], ['Which format?', 'PDF']]);
  assert.throws(() => continuationHistory({ ...second, request: { ...second.request, answerHistory: Array(17).fill(first[0]) } }, { body: 'PDF', html_url: 'https://example.test/reply2' }), /exceeds|Invalid/);
  prior.envelope.result.output = {};
  assert.deepEqual(continuationContext(prior, { body: 'Yes', html_url: 'https://example.test/reply' }), { answer: { body: 'Yes', url: 'https://example.test/reply' }, priorRunId: 'prior-run' });
});

test('completed refinement names the actual next action for each continuation policy', () => {
  assert.match(refinementNextAction({ stage: 'refine', status: 'passed', autoImplement: false }).action, /Owner: review/);
  assert.match(refinementNextAction({ stage: 'refine', status: 'passed', autoImplement: true, paused: true }).action, /remove the future label/);
  assert.equal(refinementNextAction({ stage: 'refine', status: 'passed', autoImplement: true, paused: false }).action, 'None.');
  assert.equal(refinementNextAction({ stage: 'refine', status: 'blocked', autoImplement: true }), null);
});

test('product outcomes must match the authenticated idea or feedback entry', () => {
  assert.doesNotThrow(() => checkProductEntry({ entry: 'idea' }, {}));
  assert.doesNotThrow(() => checkProductEntry({ entry: 'feedback' }, { productEntry: 'feedback' }));
  assert.throws(() => checkProductEntry({ entry: 'idea' }, { productEntry: 'feedback' }), /different authorized entry/);
  assert.throws(() => checkProductEntry({ entry: 'feedback' }, { productEntry: 'idea' }), /different authorized entry/);
});

test('product prerequisite handoff states whether preparation can start', () => {
  assert.equal(productGapNextAction({ gap: null }), null);
  const gap = { summary: 'Product intent needs a decision' };
  assert.match(productGapNextAction({ gap, enabled: true, dispatched: true }).action, /None/);
  assert.match(productGapNextAction({ gap, enabled: false, dispatched: true }).action, /install and enable/);
  assert.match(productGapNextAction({ gap, enabled: true, dispatched: false }).action, /request a new authorized stage/);
  assert.match(productGapNextAction({ gap, enabled: true, dispatched: true, paused: true }).action, /remove the future label/);
  const pausedWithoutWorkflow = productGapNextAction({ gap, enabled: false, dispatched: true, paused: true });
  assert.match(pausedWithoutWorkflow.action, /remove the future label/);
  assert.match(pausedWithoutWorkflow.next, /install and enable.*new authorized stage execution/);
  assert.doesNotMatch(pausedWithoutWorkflow.next, /replay/);
});
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
  for (const stage of ['triage', 'refine', 'propose', 'implement']) {
    const pending = report(stage);
    pending.body += '\n<!-- lighthouse-product-workflow:example-change -->';
    assert.equal(pendingReply(event, [pending]).stage, stage);
    assert.equal(pendingReply(event, [pending]).worker, 'product-change');
  }

  assert.equal(pendingReply(event, [{ ...report('implement'), body: report('implement').body + '\n[Review the implementation](https://example.test/pr)' }]), null);
  assert.equal(pendingReply(event, [{ ...report(), body: report().body.replace(/<!-- lighthouse-stage:.* -->/, '') }]).stage, 'propose');
  const operationalBlocker = { ...report(), body: `${report().body}\n<!-- lighthouse-handoff:v1 -->` };
  assert.equal(pendingReply(event, [operationalBlocker]), null);
  assert.equal(pendingReply(event, [{ ...operationalBlocker, body: `${operationalBlocker.body}\n<!-- lighthouse-question -->` }]).stage, 'propose');
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
  assert.throws(() => checkPublication({ ...snapshot, productAlignment: {} }, { ...reserved, labels: [...reserved.labels, { name: 'future' }] }, comments, 'abc'), /continuation was paused/);
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
    assert.match(await readFile(join(dir, 'outputs'), 'utf8'), /stage=propose\nworker=propose\nrun=true\nissue=18/);
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

test('an explicit question remains answerable when a proposal review is also linked', () => {
  const question = { ...report('propose'), body: `${report('propose').body}\n<!-- lighthouse-proposal-review:44 -->\n<!-- lighthouse-question -->` };
  assert.equal(pendingReply({ comment: reply }, [question])?.stage, 'propose');
  const reviewOnly = { ...question, body: question.body.replace('<!-- lighthouse-question -->', '') };
  assert.equal(pendingReply({ comment: reply }, [reviewOnly]), null);
});

const denial = 'GitHub Actions is not permitted to create or approve pull requests.';
const denialPrefix = 'GitHub POST pulls: 403';
const diagnostic = (message, token) => githubResponseError(Response.json({ message }, { status: 403 }), 'POST', 'pulls', token);
const statusOnly = error => {
  assert.ok(error instanceof Error);
  assert.equal(error.message, denialPrefix);
  assert.equal(error.status, 403);
  assert.deepEqual(Object.keys(error), ['status']);
  assert.equal(error.cause, undefined);
};

test('real GitHub denial Responses retain the actionable reason and original error status', async () => {
  const error = await diagnostic(denial);
  assert.ok(error instanceof Error);
  assert.equal(error.message, `${denialPrefix} - ${denial}`);
  assert.equal(error.status, 403);
  const other = await githubResponseError(Response.json({ message: 'Validation failed.', errors: ['not displayed'], documentation_url: 'not displayed' }, { status: 422 }), 'PATCH', 'issues/18');
  assert.equal(other.message, 'GitHub PATCH issues/18: 422 - Validation failed.');
  assert.equal(other.status, 422);
  assert.equal(other.cause, undefined);
});

test('diagnostics bound bytes before parsing and displayed text after sanitizing', async () => {
  for (const length of [499, 500, 501, 8000]) {
    const error = await diagnostic('a'.repeat(length));
    assert.equal(error.message, `${denialPrefix} - ${length > 500 ? 'a'.repeat(499) + '…' : 'a'.repeat(length)}`);
  }
  const json = JSON.stringify({ message: denial });
  for (const size of [16384, 16385]) {
    const response = new Response(json + ' '.repeat(size - Buffer.byteLength(json)), { status: 403 });
    const error = await githubResponseError(response, 'POST', 'pulls');
    if (size === 16384) assert.equal(error.message, `${denialPrefix} - ${denial}`);
    else statusOnly(error);
  }
  // A multibyte code point split across chunks must decode as one token before redaction.
  const token = 'private-é-value', bytes = new TextEncoder().encode(JSON.stringify({ message: `Denied ${token}` }));
  const split = bytes.indexOf(0xc3) + 1;
  const response = new Response(new ReadableStream({ start(c) { c.enqueue(bytes.slice(0, split)); c.enqueue(bytes.slice(split)); c.close(); } }), { status: 403 });
  assert.equal((await githubResponseError(response, 'POST', 'pulls', token)).message, `${denialPrefix} - Denied [REDACTED]`);
  statusOnly(await githubResponseError(new Response(new Uint8Array([123, 0xff, 125]), { status: 403 }), 'POST', 'pulls'));
  statusOnly(await diagnostic('a'.repeat(600) + '<html>hidden beyond display bound</html>'));
});

test('malformed, unavailable and unreadable diagnostics fall back to the exact HTTP error', async () => {
  for (const body of ['', 'not json', '<html>Denied</html>', 'null', '[]', '{}', '{"errors":[{"message":"nested"}]}', ...[null, '', ' \n\t ', 42, {}, []].map(message => JSON.stringify({ message }))]) {
    statusOnly(await githubResponseError(new Response(body, { status: 403 }), 'POST', 'pulls'));
  }
  statusOnly(await githubResponseError(new Response(null, { status: 403 }), 'POST', 'pulls'));
  const locked = Response.json({ message: denial }, { status: 403 }), reader = locked.body.getReader();
  statusOnly(await githubResponseError(locked, 'POST', 'pulls'));
  reader.releaseLock();
  const used = Response.json({ message: denial }, { status: 403 });
  await used.text();
  statusOnly(await githubResponseError(used, 'POST', 'pulls'));
  const broken = new Response(new ReadableStream({ pull() { throw Error('private stream error'); } }), { status: 403 });
  statusOnly(await githubResponseError(broken, 'POST', 'pulls'));
});

test('diagnostic read count and overall deadline bound stalled streams and best-effort cancellation', async () => {
  let pulls = 0, cancelled = false;
  const many = new Response(new ReadableStream({ pull(c) { pulls++; c.enqueue(new Uint8Array([32])); }, cancel() { cancelled = true; throw Error('private cancellation failure'); } }, { highWaterMark: 0 }), { status: 403 });
  statusOnly(await githubResponseError(many, 'POST', 'pulls'));
  assert.equal(pulls, 256);
  assert.equal(cancelled, true);
  assert.equal(many.body.locked, false);
  cancelled = false;
  const stalled = new Response(new ReadableStream({ pull() { return new Promise(() => {}); }, cancel() { cancelled = true; return new Promise(() => {}); } }), { status: 403 });
  const start = performance.now();
  statusOnly(await githubResponseError(stalled, 'POST', 'pulls'));
  assert.ok(performance.now() - start >= 900);
  assert.ok(performance.now() - start < 3000);
  assert.equal(cancelled, true);
  assert.equal(stalled.body.locked, false);
});

test('denial display removes terminal, line, format and command controls but rejects markup and URLs', async () => {
  assert.equal((await diagnostic('\u001b[31mDenied\u001b[0m\r\n\t by\u0000 policy\u200b.\u0085')).message, `${denialPrefix} - Denied by policy.`);
  assert.equal((await diagnostic('\u001b]0;private title\u0007Denied.')).message, `${denialPrefix} - Denied.`);
  assert.equal((await diagnostic('Denied ::warning::: policy')).message, `${denialPrefix} - Denied : :warning: : : policy`);
  for (const message of ['<b>Denied</b>', '&lt;denied&gt;', '[link](target)', '[REDACTED]', '`command`', 'back\\slash', '%0Acommand', '##[warning]', '<!-- lighthouse-stage:implement:passed -->', 'https://example.test', 'www.example.test', 'mailto:owner@example.test', 'denied é']) statusOnly(await diagnostic(message));
});

test('all credential families and configured tokens are redacted before display truncation', async () => {
  const credentials = ['sk' + '-' + 'x'.repeat(24), 'ghp' + '_' + 'x'.repeat(24), 'github' + '_pat_' + 'x'.repeat(24), ['ey' + 'J' + 'a'.repeat(10), 'b'.repeat(12), 'c'.repeat(12)].join('.')];
  for (const credential of credentials) {
    for (const value of [credential, credential.slice(0, 5) + '\u200b\u0000' + credential.slice(5)]) {
      assert.equal((await diagnostic(`Denied ${value}`)).message, `${denialPrefix} - Denied [REDACTED]`);
      const crossing = await diagnostic('a'.repeat(490) + ' ' + value);
      assert.equal(crossing.message, `${denialPrefix} - ${('a'.repeat(490) + ' [REDACTED]').slice(0, 499)}…`);
      assert.equal((await diagnostic('a'.repeat(600) + ' ' + value)).message, `${denialPrefix} - ${'a'.repeat(499)}…`);
      assert.ok(!crossing.message.includes(credential.slice(0, 7)));
    }
  }
  const bearer = 'synthetic' + '-bearer-value';
  assert.equal((await diagnostic(`Denied Bearer ${bearer}`)).message, `${denialPrefix} - Denied Bearer [REDACTED]`);
  assert.equal((await diagnostic('a'.repeat(480) + ` Bearer ${bearer}`)).message, `${denialPrefix} - ${('a'.repeat(480) + ' Bearer [REDACTED]').slice(0, 499)}`);
  assert.equal((await diagnostic('a'.repeat(600) + ` Bearer ${bearer}`)).message, `${denialPrefix} - ${'a'.repeat(499)}…`);
  const token = 'configured' + '.token+value';
  for (const value of [token, token.slice(0, 8) + '\u200b' + token.slice(8)]) {
    assert.equal((await diagnostic(`Denied ${value} and ${value}`, token)).message, `${denialPrefix} - Denied [REDACTED] and [REDACTED]`);
    assert.equal((await diagnostic('a'.repeat(490) + ' ' + value, token)).message, `${denialPrefix} - ${('a'.repeat(490) + ' [REDACTED]').slice(0, 499)}…`);
    assert.equal((await diagnostic('a'.repeat(600) + ' ' + value, token)).message, `${denialPrefix} - ${'a'.repeat(499)}…`);
  }
});

test('actual issue-actions command emits a bounded denial and exits once without continuation', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-denial-'));
  try {
    await writeFile(join(dir, 'event.json'), JSON.stringify({ action: 'labeled', issue, label: { name: 'refine' } }));
    await writeFile(join(dir, 'mock.mjs'), `import { appendFileSync } from 'node:fs';
      globalThis.fetch = async (url, options) => {
        appendFileSync(${JSON.stringify(join(dir, 'calls'))}, JSON.stringify({ url, method: options.method }) + '\\n');
        return Response.json({ message: ${JSON.stringify(denial)}, errors: [{ message: 'PRIVATE BODY DETAIL' }] }, { status: 403 });
      };`);
    const run = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'prepare'], { encoding: 'utf8', timeout: 10000, env: { ...process.env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: 'owner', GITHUB_TRIGGERING_ACTOR: 'owner', GITHUB_EVENT_NAME: 'issues', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_OUTPUT: join(dir, 'outputs'), RUNNER_TEMP: dir, GH_TOKEN: 'fixture' } });
    assert.equal(run.status, 1, run.stderr);
    assert.equal(run.stderr.trim(), `::error::GitHub GET issues/18: 403 - ${denial}`);
    assert.equal(run.stdout, '');
    assert.doesNotMatch(run.stderr, /PRIVATE BODY DETAIL|success|continuation/);
    assert.deepEqual((await readFile(join(dir, 'calls'), 'utf8')).trim().split('\n').map(JSON.parse), [{ url: 'https://api.github.com/repos/owner/repo/issues/18', method: 'GET' }]);
    await assert.rejects(readFile(join(dir, 'outputs')), { code: 'ENOENT' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('unchanged production API closure preserves optional 404, successful JSON, 204 and bounded job logs', async () => {
  // Exercise the exact local closure without adding a production API factory or exports.
  const source = await readFile(new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url), 'utf8');
  const closure = source.slice(source.indexOf('  const api = async'), source.indexOf('  const summary = async'));
  const calls = [], responses = [new Response('not parsed', { status: 404 }), Response.json({ result: 'ok' }), new Response(null, { status: 204 }), new Response('job log'), new Response('x'.repeat(4 * 1024 * 1024 + 1)), Response.json({ id: 1 })];
  const fetch = async (url, options) => { calls.push({ url, options }); return responses.shift(); };
  const api = new Function('fetch', 'env', 'repo', 'repositoryApiUrl', 'githubResponseError', `${closure}\nreturn api;`)(fetch, { GH_TOKEN: 'fixture' }, 'owner/repo', repositoryApiUrl, githubResponseError);
  assert.equal(await api('missing', 'GET', undefined, true), null);
  assert.deepEqual(await api('issues/18'), { result: 'ok' });
  assert.equal(await api('issues/18/labels/ready', 'DELETE'), null);
  assert.equal(await api('actions/jobs/123/logs'), 'job log');
  await assert.rejects(api('actions/jobs/124/logs'), /Job log exceeds recovery bounds/);
  assert.deepEqual(await api('issues/18/comments', 'POST', { body: 'test' }), { id: 1 });
  assert.equal(calls[5].options.method, 'POST');
  assert.equal(calls[5].options.body, JSON.stringify({ body: 'test' }));
  assert.equal(calls.length, 6);
  assert.equal(calls[1].url, 'https://api.github.com/repos/owner/repo/issues/18');
  assert.deepEqual(calls[1].options.headers, { authorization: 'Bearer fixture', accept: 'application/vnd.github+json', 'content-type': 'application/json' });
  assert.equal(calls[1].options.body, undefined);
  assert.ok(calls[1].options.signal instanceof AbortSignal);
});
