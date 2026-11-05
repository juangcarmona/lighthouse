import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { routeIssue, taskDigest, checkPublication, repositoryApiUrl, pendingReply, checkReplyInputs, continuationContext, continuationHistory, refinementNextAction, checkProductEntry, productGapNextAction, publishRoutingHandoff, resolveEpicRouting, checkEpicAuthority, checkEpicTriageBinding, existingEpicTriage, createIssueApi } from '../packages/sdlc/src/issue-actions.mjs';
import { dispatchIntent, dispatchId, epicTriageKey, dispatchReceiptBody } from '../packages/sdlc/src/stage-dispatch.mjs';
import { ciRequestFailure } from '../packages/sdlc/src/delivery-events.mjs';

const denialCondition = 'GitHub Actions is not permitted to create or approve pull requests.';
const denialPrefix = 'GitHub POST pulls: 403';
async function deniedResponse(response, token = '') {
  let calls = 0;
  const api = createIssueApi('owner/repo', { GH_TOKEN: token }, async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.github.com/repos/owner/repo/pulls');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.authorization, `Bearer ${token}`);
    assert.equal(options.body, '{"title":"test"}');
    assert.ok(options.signal instanceof AbortSignal);
    return response;
  });
  let error;
  await assert.rejects(api('pulls', 'POST', { title: 'test' }), caught => { error = caught; return true; });
  assert.equal(calls, 1);
  assert.equal(error.status, response.status);
  assert.deepEqual(Object.keys(error).sort(), ['status']);
  return error;
}

test('actual issue adapter retains a representative PR denial and numeric failure status', async () => {
  const error = await deniedResponse(Response.json({ message: denialCondition, errors: [{ message: 'NESTED_SENTINEL' }], documentation_url: 'RAW_SENTINEL' }, { status: 403 }));
  assert.equal(error.message, `${denialPrefix}: ${denialCondition}`);
  assert.deepEqual(ciRequestFailure(error, { number: 18, head: { sha: 'a'.repeat(40) } }), ciRequestFailure(Object.assign(Error(denialPrefix), { status: 403 }), { number: 18, head: { sha: 'a'.repeat(40) } }));
});

test('denial diagnostics reject unusable JSON and unsafe text without exposing other fields', async () => {
  const payloads = ['{broken RAW_SENTINEL', '<html>RAW_SENTINEL</html>', 'null', '[]', '"RAW_SENTINEL"', '42', ...[{}, { message: null }, { message: 4 }, { message: {} }, { message: '' }, { message: ' \r\n ' }].map(JSON.stringify)];
  const unsafe = ['<b>denied</b>', '[click](https://example.test)', '`command`', '**bold**', '# Heading', '(link)', '::error::denied', ':\u200b:error::denied', '%0A::error::denied', '\\n::error::denied', '&#10;denied', 'https://example.test', '{message}', 'denied\u001b[31m<script>'];
  for (const message of unsafe) payloads.push(JSON.stringify({ message, errors: 'RAW_SENTINEL' }));
  for (const payload of payloads) {
    const error = await deniedResponse(new Response(payload, { status: 403 }));
    assert.equal(error.message, denialPrefix);
  }
  const invalidUtf8 = new Response(new Uint8Array([123, 34, 109, 101, 115, 115, 97, 103, 101, 34, 58, 34, 255, 34, 125]), { status: 403 });
  assert.equal((await deniedResponse(invalidUtf8)).message, denialPrefix);
});

test('diagnostic input is byte bounded and stream failures preserve the original error', async () => {
  const encoder = new TextEncoder();
  const exact = JSON.stringify({ message: 'x'.repeat(8192 - JSON.stringify({ message: '' }).length) });
  assert.equal(encoder.encode(exact).length, 8192);
  assert.equal((await deniedResponse(new Response(exact, { status: 403 }))).message.length, denialPrefix.length + 2 + 300);
  let reads = 0, cancelled = false;
  const oversized = new Response(new ReadableStream({
    pull(controller) { reads++; controller.enqueue(new Uint8Array(4096)); },
    cancel() { cancelled = true; throw Error('CANCEL_SENTINEL'); }
  }, { highWaterMark: 0 }), { status: 403 });
  assert.equal(oversized.headers.get('content-length'), null);
  assert.equal((await deniedResponse(oversized)).message, denialPrefix);
  assert.equal(reads, 3);
  assert.equal(cancelled, true);
  for (const response of [
    new Response(null, { status: 403 }),
    new Response(exact + ' ', { status: 403, headers: { 'content-length': '1' } }),
    new Response(JSON.stringify({ message: 'é'.repeat(5000) }), { status: 403 }),
    new Response(new ReadableStream({ start(controller) { controller.error(Error('READ_SENTINEL')); } }), { status: 403 }),
    new Response(new ReadableStream({ start(controller) { controller.error(new DOMException('ABORT_SENTINEL', 'AbortError')); } }), { status: 403 })
  ]) assert.equal((await deniedResponse(response)).message, denialPrefix);
  const locked = Response.json({ message: denialCondition }, { status: 403 });
  const reader = locked.body.getReader();
  assert.equal((await deniedResponse(locked)).message, denialPrefix);
  reader.releaseLock();
  const consumed = Response.json({ message: denialCondition }, { status: 403 });
  await consumed.text();
  assert.equal((await deniedResponse(consumed)).message, denialPrefix);
});

test('denial text is single-line, redacted before truncation and surrogate safe', async () => {
  const active = ['active', 'private', 'credential'].join('-');
  const secrets = [active, ...['p', 'o', 'u', 's', 'r'].map(family => `gh${family}_${'A'.repeat(35)}`), `github_${'pat'}_${'B'.repeat(40)}`, `sk-${'C'.repeat(25)}`, ['eyJ' + 'D'.repeat(20), 'E'.repeat(20), 'F'.repeat(20)].join('.'), 'bearer-value-' + 'G'.repeat(25)];
  const message = `Denied\r\n\x1b[31mpermission\x1b[0m\u0000\u202e\u200b ${secrets.slice(0, -1).join(' ')} Bearer ${secrets.at(-1)}`;
  const error = await deniedResponse(Response.json({ message }, { status: 403 }), active);
  assert.ok(error.message.startsWith(`${denialPrefix}: Denied permission`));
  assert.doesNotMatch(error.message, /[\p{Cc}\p{Cf}]/u);
  for (const secret of secrets) assert.ok(!error.message.includes(secret));
  assert.match(error.message, /REDACTED/);
  const normalized = `g\u200bhp_${'H'.repeat(35)}`;
  const assembled = await deniedResponse(Response.json({ message: `Denied ${normalized} ${active.replace('-', '\u200b-')}` }, { status: 403 }), active);
  assert.equal(assembled.message, `${denialPrefix}: Denied REDACTED REDACTED`);
  const spacedToken = 'private\ncredential';
  assert.equal((await deniedResponse(Response.json({ message: 'Denied private credential' }, { status: 403 }), spacedToken)).message, `${denialPrefix}: Denied REDACTED`);
  for (const secret of secrets) {
    const prefix = secret === secrets.at(-1) ? 'x'.repeat(283) + 'Bearer ' : 'x'.repeat(290);
    const boundary = await deniedResponse(Response.json({ message: prefix + secret + ' trailing'.repeat(50) }, { status: 403 }), active);
    const suffix = boundary.message.slice(denialPrefix.length + 2);
    assert.ok(suffix.length <= 300);
    assert.equal(suffix.slice(290), 'REDACTED …');
    assert.ok(!suffix.includes(secret.slice(0, 8)));
  }
  const long = await deniedResponse(Response.json({ message: 'x'.repeat(298) + '😀 trailing'.repeat(100) }, { status: 403 }));
  const suffix = long.message.slice(denialPrefix.length + 2);
  assert.equal(suffix, 'x'.repeat(298) + '…');
  assert.equal(suffix.isWellFormed(), true);
});

test('issue API preserves optional 404, other failures, success, 204 and job logs', async () => {
  const optional = Response.json({ message: denialCondition }, { status: 404 });
  const optionalApi = createIssueApi('owner/repo', {}, async () => optional);
  assert.equal(await optionalApi('missing', 'GET', undefined, true), null);
  assert.equal(optional.bodyUsed, false);
  for (const status of [404, 422, 500]) {
    const error = await deniedResponse(new Response(null, { status }));
    assert.equal(error.message, `GitHub POST pulls: ${status}`);
    const enriched = await deniedResponse(Response.json({ message: 'Permission condition' }, { status }));
    assert.equal(enriched.message, `GitHub POST pulls: ${status}: Permission condition`);
  }
  const responses = [Response.json({ id: 18 }), new Response(null, { status: 204 }), new Response('job log'), new Response('x'.repeat(4 * 1024 * 1024 + 1))];
  let calls = 0;
  const api = createIssueApi('owner/repo', {}, async () => { calls++; return responses.shift(); });
  assert.deepEqual(await api('issues/18'), { id: 18 });
  assert.equal(await api('issues/18', 'DELETE'), null);
  assert.equal(await api('actions/jobs/18/logs'), 'job log');
  await assert.rejects(api('actions/jobs/18/logs'), /Job log exceeds recovery bounds/);
  assert.equal(calls, 4);
});

test('wired CLI displays safe denial text and still exits unsuccessfully', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-denial-'));
  try {
    const token = ['private', 'cli', 'credential'].join('-');
    await writeFile(join(dir, 'event.json'), JSON.stringify({ action: 'labeled', issue: { number: 18 }, label: { name: 'refine' } }));
    await writeFile(join(dir, 'mock.mjs'), `globalThis.fetch = async () => Response.json({ message: ${JSON.stringify(denialCondition)} + ' ' + process.env.GH_TOKEN, errors: 'RAW_SENTINEL', documentation_url: '<html>HOSTILE_SENTINEL</html>' }, { status: 403 });`);
    const run = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'route'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: 'owner', GITHUB_EVENT_NAME: 'issues', GITHUB_EVENT_PATH: join(dir, 'event.json'), RUNNER_TEMP: dir, GH_TOKEN: token } });
    assert.equal(run.status, 1, run.stderr);
    assert.ok(run.stderr.includes(denialCondition));
    assert.match(run.stderr, /GitHub GET issues\/18\/comments\?per_page=100&page=1: 403/);
    assert.ok(!run.stderr.includes(token));
    assert.doesNotMatch(run.stderr + run.stdout, /RAW_SENTINEL|HOSTILE_SENTINEL|<html>/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

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

test('wired router ignores feedback on closed PRs without delivery effects and retains actor authorization', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-closed-review-'));
  try {
    const candidate = { number: 18, state: 'closed', merged: true, head: { ref: 'lighthouse/implement-47-aaaaaaaaaaaa' } };
    await writeFile(join(dir, 'mock.mjs'), `globalThis.fetch = async (url, options) => {
      if (url !== 'https://api.github.com/repos/owner/repo/pulls/18' || options.method !== 'GET') throw Error('Unexpected delivery effect: ' + options.method + ' ' + url);
      return Response.json({ ...${JSON.stringify(candidate)}, merged: process.env.LIGHTHOUSE_TEST_PR_MERGED === 'true' });
    };`);
    for (const merged of [true, false]) {
      const event = { action: 'submitted', pull_request: { ...candidate, merged }, review: { id: 81, state: 'commented', body: 'Technical history only.', user: { login: 'owner', type: 'User' } } };
      await writeFile(join(dir, 'event.json'), JSON.stringify(event));
      for (const actor of ['owner', 'outsider']) {
        const output = join(dir, 'output'), summary = join(dir, 'summary');
        await writeFile(output, ''); await writeFile(summary, '');
        const run = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'route'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: actor, GITHUB_TRIGGERING_ACTOR: actor, GITHUB_EVENT_NAME: 'pull_request_review', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary, LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: '', LIGHTHOUSE_TEST_PR_MERGED: String(merged), RUNNER_TEMP: dir } });
        if (actor === 'outsider') { assert.equal(run.status, 1); assert.match(run.stderr, /Review actor is not authorized/); continue; }
        assert.equal(run.status, 0, run.stderr);
        assert.match(await readFile(output, 'utf8'), /run=false/);
        assert.match(await readFile(summary, 'utf8'), /closed PR/);
        assert.doesNotMatch(run.stderr, /Unexpected delivery effect/);
      }
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

function repeatedEpicTriage(status = 'running') {
  const repository = 'owner/repo', epic = { parent: 146, slice: 'A', planDigest: 'b'.repeat(64), sourceRevision: 'a'.repeat(40), base: 'lighthouse/epic-146' };
  const epicKey = epicTriageKey(repository, epic.parent, 10, epic.planDigest);
  const request = { repository, issue: 10, stage: 'triage', epic, epicKey, id: dispatchId(repository, epicKey, 'triage'), taskDigest: 'c'.repeat(64), sourceRevision: epic.sourceRevision, workflowRevision: epic.sourceRevision, handoff: false, autoImplement: false, productChangeEnabled: false };
  request.intent = dispatchIntent(request);
  const receipt = { schemaVersion: 1, stage: 'triage', epicKey, id: request.id, intent: request.intent, digest: 'd'.repeat(64), routerRunId: '700', routerAttempt: 1, workerRunId: status === 'requested' || status === 'unknown' ? null : '800', status };
  const issue = { number: 10, state: 'open', labels: [{ name: 'agent-working' }] };
  const comment = { id: 12, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repository}/issues/10`, html_url: 'https://github.com/owner/repo/issues/10#issuecomment-12', body: dispatchReceiptBody(repository, receipt) };
  return { request, issue, comment, receipt };
}

test('repeated epic triage observes the original recorded request despite its reservation', () => {
  for (const status of ['requested', 'running', 'completed', 'unknown']) {
    const f = repeatedEpicTriage(status);
    assert.equal(existingEpicTriage(f.request, f.issue, [f.comment]), f.comment);
  }
});

test('epic triage reconciliation rejects changed intent, identity, untrusted receipts and pauses', () => {
  for (const patch of [{ taskDigest: 'e'.repeat(64) }, { sourceRevision: 'e'.repeat(40) }, { workflowRevision: 'e'.repeat(40) }, { epic: { ...repeatedEpicTriage().request.epic, planDigest: 'e'.repeat(64) } }, { issue: 11 }, { stage: 'implement' }, { worker: 'apply-review' }]) {
    const f = repeatedEpicTriage(); Object.assign(f.request, patch); f.request.intent = dispatchIntent(f.request);
    assert.equal(existingEpicTriage(f.request, f.issue, [f.comment]), null);
  }
  for (const label of ['future', 'human-working', 'needs-info', 'waiting-review']) {
    const f = repeatedEpicTriage(); f.issue.labels.push({ name: label }); assert.equal(existingEpicTriage(f.request, f.issue, [f.comment]), null);
  }
  for (const user of [{ login: 'owner', type: 'User' }, { login: 'github-actions[bot]', type: 'User' }]) {
    const f = repeatedEpicTriage(); f.comment.user = user; assert.equal(existingEpicTriage(f.request, f.issue, [f.comment]), null);
  }
  const f = repeatedEpicTriage(); f.comment.body = f.comment.body.replace(f.receipt.intent, 'e'.repeat(64)); assert.equal(existingEpicTriage(f.request, f.issue, [f.comment]), null);
  f.comment.issue_url += '/wrong'; assert.throws(() => existingEpicTriage(f.request, f.issue, [f.comment]), /Untrusted dispatch receipt/);
});
