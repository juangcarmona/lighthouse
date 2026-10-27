import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { validateEstimate, validateRequestTriage, validateEstimateRevision, eligibleIssueAuthor } from '../packages/sdlc/src/request-triage.mjs';
import { routeIssue, pendingReply } from '../packages/sdlc/src/issue-actions.mjs';
import { validateStageEnvelope } from '../packages/sdlc/src/host-contract.mjs';
import { stagePath } from '../packages/sdlc/src/stage-dispatch.mjs';

const estimate = { points: 5, status: 'provisional', rationale: { scope: 'Intake and routing contracts', dependencies: 'Existing dispatcher and schemas', verification: 'Unit and adapter fixtures' }, confidence: 'medium', uncertainty: ['Initial anchors await calibration'] };
const originalRequest = 'Please make requests easier.\nKeep these words.';
const output = { estimate, requestAnalysis: { originalRequest, problem: 'Intake requires engineering detail', desiredResult: 'Simple request form', inferences: [{ inference: 'Reuse dispatcher', source: 'src/packages/sdlc/src/stage-dispatch.mjs' }], unknowns: [], questions: [] } };
const request = { runId: 'a'.repeat(64), stage: 'triage', originalRequest };
const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'triage', gate: 'triaged', status: 'passed', evidence: [{ id: 'request', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'await owner refinement decision', output }, effect: { type: 'issue-comment', body: 'Provisional 5 points: intake and routing, using existing dispatcher, verified with adapter tests. Owner decides whether to refine.' } };

test('approved numeric points require independent explanations, confidence and uncertainty', () => {
  for (const points of [1, 2, 3, 5, 8, 13]) assert.deepEqual(validateEstimate({ ...estimate, points }), []);
  for (const points of [0, 4, 9, 21, '5', 'M', null]) assert.ok(validateEstimate({ ...estimate, points }).length);
  for (const change of [{ rationale: {} }, { confidence: 'certain' }, { uncertainty: 'high' }, { status: 'final' }]) assert.ok(validateEstimate({ ...estimate, ...change }).length);
  for (const factor of ['scope', 'dependencies', 'verification']) assert.ok(validateEstimate({ ...estimate, rationale: { ...estimate.rationale, [factor]: ' ' } }).length);
  assert.ok(validateEstimate({ ...estimate, status: 'confirmed' }, { provisional: true }).length);
});

test('native completion preserves exact words and rejects unsupported inferences or blocking questions', () => {
  assert.deepEqual(validateRequestTriage(output, originalRequest), []);
  assert.deepEqual(validateStageEnvelope(envelope, request), []);
  for (const change of [{ originalRequest: 'rewritten' }, { inferences: [{ inference: 'Guess' }] }, { unknowns: 'none' }, { questions: [{ question: 'Which outcome?', blocks: 'Determines expected behavior' }] }]) {
    const candidate = { ...output, requestAnalysis: { ...output.requestAnalysis, ...change } };
    assert.ok(validateRequestTriage(candidate, originalRequest).length);
    assert.ok(validateStageEnvelope({ ...envelope, result: { ...envelope.result, output: candidate } }, request).length);
  }
  assert.ok(validateStageEnvelope({ ...envelope, result: { ...envelope.result, output: {} } }, request).length);
  assert.deepEqual(validateStageEnvelope({ ...envelope, result: { ...envelope.result, status: 'blocked', output: {}, missingEvidence: ['estimate'] } }, request), []);
});

test('refinement rechecks and retains a supplied initial estimate, even when unchanged', () => {
  const revised = { estimate: { ...estimate, points: 8, status: 'confirmed' }, estimateRevision: { previous: estimate, reason: 'Migration adds a verification path' } };
  assert.deepEqual(validateEstimateRevision(revised, estimate), []);
  assert.deepEqual(validateEstimateRevision({}, undefined), []);
  assert.ok(validateEstimateRevision({}, estimate).length);
  assert.ok(validateEstimateRevision({ ...revised, estimateRevision: { previous: { ...estimate, points: 3 }, reason: 'Changed' } }, estimate).length);
  const refineRequest = { ...request, stage: 'refine', triageEstimate: estimate };
  const refine = { ...envelope, result: { ...envelope.result, stage: 'refine', gate: 'ready', output: revised } };
  assert.deepEqual(validateStageEnvelope(refine, refineRequest), []);
  assert.ok(validateStageEnvelope({ ...refine, result: { ...refine.result, output: {} } }, refineRequest).length);
});

test('external requests need owner admission and a triaged issue before later stages', () => {
  const issue = { number: 18, user: { login: 'external' }, state: 'open', labels: [] };
  const event = { action: 'labeled', issue, label: { name: 'triage' } };
  assert.equal(routeIssue(event, 'owner', 'owner', 'issues').stage, 'triage');
  assert.equal(routeIssue(event, 'external', 'owner', 'issues').run, false);
  assert.equal(routeIssue({ ...event, action: 'opened' }, 'owner', 'owner', 'issues').run, false);
  assert.equal(routeIssue({ ...event, issue: { ...issue, state: 'closed' } }, 'owner', 'owner', 'issues').run, false);
  assert.equal(routeIssue({ ...event, issue: { ...issue, pull_request: {} } }, 'owner', 'owner', 'issues').run, false);
  for (const name of ['human-working', 'agent-working']) assert.equal(routeIssue({ ...event, issue: { ...issue, labels: [{ name }] } }, 'owner', 'owner', 'issues').run, false);
  assert.equal(eligibleIssueAuthor(issue, 'owner', 'triage'), true);
  for (const stage of ['refine', 'propose', 'implement', 'integrate', 'review']) assert.equal(eligibleIssueAuthor(issue, 'owner', stage), false);
  const triaged = { ...issue, labels: [{ name: 'triaged' }] };
  for (const stage of ['refine', 'propose', 'implement', 'integrate', 'review']) assert.equal(eligibleIssueAuthor(triaged, 'owner', stage), true);
  assert.equal(routeIssue({ action: 'labeled', issue: triaged, label: { name: 'refine' } }, 'owner', 'owner', 'issues').stage, 'refine');
  assert.equal(routeIssue({ action: 'labeled', issue: triaged, label: { name: 'refine' } }, 'external', 'owner', 'issues').run, false);
  assert.equal(routeIssue({ inputs: { issue: '18', stage: 'triage' } }, 'owner', 'owner', 'workflow_dispatch').stage, 'triage');
  assert.equal(stagePath('triage'), '.github/workflows/lighthouse-sdlc-triage.lock.yml');
});

test('only matching owner replies resume blocked triage and never start refinement', () => {
  const report = { user: { login: 'github-actions[bot]', type: 'Bot' }, created_at: '2026-10-27T10:00:00Z', body: `Outcome: blocked\n<!-- lighthouse-actions:${'a'.repeat(64)} -->\n<!-- lighthouse-stage:triage:blocked -->` };
  const event = { action: 'created', issue: { number: 18, state: 'open', labels: [{ name: 'needs-info' }] }, comment: { body: 'Use the simpler outcome', created_at: '2026-10-27T11:00:00Z', user: { login: 'owner', type: 'User' } } };
  assert.equal(pendingReply(event, [report]).stage, 'triage');
  assert.equal(routeIssue(event, 'owner', 'owner', 'issue_comment', [report]).stage, 'triage');
  assert.equal(routeIssue(event, 'external', 'owner', 'issue_comment', [report]).run, false);
  assert.equal(pendingReply(event, [{ ...report, body: report.body.replaceAll('blocked', 'passed') }]), null);
});

test('a triaged label alone cannot start refinement of an external request', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-external-refine-'));
  try {
    const issue = { number: 18, title: 'External request', body: originalRequest, user: { login: 'external' }, state: 'open', labels: [{ name: 'triaged' }, { name: 'refine' }] };
    await writeFile(join(dir, 'event.json'), JSON.stringify({ action: 'labeled', issue, label: { name: 'refine' } }));
    await writeFile(join(dir, 'mock.mjs'), `globalThis.fetch = async url => ({ ok: true, status: 200, json: async () => url.endsWith('/repos/owner/repo') ? { default_branch: 'main' } : url.includes('/commits/') ? { sha: '${'b'.repeat(40)}' } : url.includes('/comments?') ? [] : ${JSON.stringify(issue)} });`);
    const run = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'prepare'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: 'owner', GITHUB_TRIGGERING_ACTOR: 'owner', GITHUB_EVENT_NAME: 'issues', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_SHA: 'b'.repeat(40), GITHUB_RUN_ID: '123', RUNNER_TEMP: dir, GH_TOKEN: 'fixture' } });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /authenticated passed triage/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('packaged public form asks only for problem and desired result', async () => {
  const form = parse(await readFile('src/packages/sdlc/templates/change-request.yml', 'utf8'));
  assert.deepEqual(form.body.filter(item => item.validations?.required).map(item => item.id), ['problem', 'result']);
  assert.deepEqual(form.body.filter(item => !item.validations?.required).map(item => item.id), ['context']);
});

test('the published triage result label is declared for adopters', async () => {
  const catalog = JSON.parse(await readFile('src/packages/sdlc/capabilities.json', 'utf8'));
  const labels = catalog.capabilities.find(capability => capability.id === 'labels').configuration.labels;
  assert.ok(labels.some(label => label.name === 'triaged' && label.role === 'state'));
});

test('installer preview includes triage, preserves existing form and writes nothing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-request-form-'));
  try {
    await mkdir(join(dir, '.github/ISSUE_TEMPLATE'), { recursive: true });
    await writeFile(join(dir, '.github/ISSUE_TEMPLATE/change-request.yml'), 'author owned form');
    const run = spawnSync(process.execPath, ['src/packages/sdlc/src/install-workflows.mjs', dir, 'a'.repeat(40)], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /lighthouse-sdlc-triage.md/);
    assert.match(run.stdout, /Preserve existing request form/);
    assert.equal(await readFile(join(dir, '.github/ISSUE_TEMPLATE/change-request.yml'), 'utf8'), 'author owned form');
    await assert.rejects(readFile(join(dir, '.github/workflows/lighthouse-sdlc-triage.md')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('native triage source reuses authenticated dispatch and never requests continuation', async () => {
  const source = await readFile('src/packages/sdlc/workflows/lighthouse-sdlc-triage.md', 'utf8');
  assert.match(source, /LIGHTHOUSE_DISPATCH_REQUIRED: "true"/);
  assert.match(source, /LIGHTHOUSE_STAGE: triage/);
  assert.match(source, /issue-actions.mjs prepare/);
  assert.match(source, /issue-actions.mjs publish/);
  assert.doesNotMatch(source, /continue-refinement|LIGHTHOUSE_AUTO_IMPLEMENT/);
});

test('external issue preparation and publication retain intent and stop at triaged', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-triage-adapter-'));
  try {
    const issue = { number: 18, title: 'Simple request', body: originalRequest, user: { login: 'external' }, state: 'open', labels: [{ name: 'triage' }] };
    const event = { action: 'labeled', issue, label: { name: 'triage' } };
    await writeFile(join(dir, 'event.json'), JSON.stringify(event));
    await writeFile(join(dir, 'mock.mjs'), `import { appendFileSync } from 'node:fs';
      const issue = ${JSON.stringify(issue)};
      globalThis.fetch = async (url, options) => {
        appendFileSync(${JSON.stringify(join(dir, 'calls.jsonl'))}, JSON.stringify({url, method: options.method, body: options.body}) + '\\n');
        const value = url.endsWith('/repos/owner/repo') ? {default_branch: 'main'}
          : url.includes('/commits/') ? {sha: '${'b'.repeat(40)}'}
          : url.includes('/comments?') ? []
          : options.method === 'POST' && url.endsWith('/comments') ? {html_url: 'https://example.test/report'}
          : {...issue, labels: [{name: 'triage'}, {name: 'agent-working'}]};
        return {ok: true, status: 200, json: async () => value};
      };`);
    // Preparation observes the issue before the agent reservation; publication observes it after.
    const prepareMock = (await readFile(join(dir, 'mock.mjs'), 'utf8')).replace("labels: [{name: 'triage'}, {name: 'agent-working'}]", "labels: [{name: 'triage'}]");
    await writeFile(join(dir, 'prepare-mock.mjs'), prepareMock);
    const env = { ...process.env, GITHUB_REPOSITORY: 'owner/repo', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: 'owner', GITHUB_TRIGGERING_ACTOR: 'owner', GITHUB_EVENT_NAME: 'issues', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: 'b'.repeat(40), LIGHTHOUSE_RUN_DIR: dir, RUNNER_TEMP: dir, GH_TOKEN: 'fixture' };
    const run = (command, mock) => spawnSync(process.execPath, ['--import', join(dir, mock), 'src/packages/sdlc/src/issue-actions.mjs', command], { encoding: 'utf8', env });
    const prepared = run('prepare', 'prepare-mock.mjs');
    assert.equal(prepared.status, 0, prepared.stderr);
    const snapshot = JSON.parse(await readFile(join(dir, 'request.json'), 'utf8'));
    assert.equal(snapshot.stage, 'triage');
    assert.equal(snapshot.originalRequest, originalRequest);
    assert.equal(snapshot.autoImplement, false);
    const context = JSON.parse(await readFile(join(dir, 'context.json'), 'utf8'));
    assert.equal(context.issue.body, originalRequest);
    await writeFile(join(dir, 'envelope.json'), JSON.stringify({ ...envelope, result: { ...envelope.result, runId: snapshot.runId } }));
    const published = run('publish', 'mock.mjs');
    assert.equal(published.status, 0, published.stderr);
    const calls = (await readFile(join(dir, 'calls.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    const labels = calls.filter(call => call.method === 'POST' && call.url.endsWith('/labels')).flatMap(call => JSON.parse(call.body).labels);
    assert.deepEqual(labels, ['agent-working', 'triaged']);
    assert.equal(calls.some(call => call.url.includes('/dispatches')), false);
    assert.equal(calls.some(call => call.method === 'PATCH' && call.url.endsWith('/issues/18')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
