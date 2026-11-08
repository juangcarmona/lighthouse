import test from 'node:test';
import assert from 'node:assert/strict';
import { digest } from '../packages/sdlc/src/digests.mjs';
import { createIssueIntent } from '../packages/sdlc/src/issue-control-intent.mjs';
import { formatIssueComment } from '../packages/sdlc/src/issue-comment-intent.mjs';
import { createControlRequest, createControlResult, controlIndexArtifact } from '../packages/sdlc/src/issue-control-ledger.mjs';
import { controlStageDispatch } from '../packages/sdlc/src/issue-control-admission.mjs';
import { observeControlExecution, resolveControlAlias } from '../packages/sdlc/src/issue-control-execution.mjs';
import { dispatchReceiptBody } from '../packages/sdlc/src/stage-dispatch.mjs';
import { stageContext } from '../packages/sdlc/src/unattended-runtime.mjs';

function fixture() {
  const repository = 'owner/repo', actor = { id: 11, login: 'owner', type: 'User' };
  const metadata = { id: 22, full_name: repository, owner: actor };
  const question = { commentId: 55, requestId: 'e'.repeat(64), questionDigest: 'f'.repeat(64), grantDigest: 'd'.repeat(64),
    stage: 'refine', request: { autoImplement: false, productChangeEnabled: false } };
  const facts = { availability: 'available', repository: { id: 22, name: repository }, issue: { id: 33, number: 7 }, actor,
    sourceRevision: 'a'.repeat(40), defaultBranch: 'main', inputDigest: 'b'.repeat(64), policy: { digest: 'c'.repeat(64) }, capability: { stages: ['refine'] },
    question, actions: { continue: { eligible: true } } };
  const intent = createIssueIntent({ id: '12345678-1234-4234-8234-123456789abc', facts, action: 'continue', body: 'Use the repository in this issue.' });
  const comment = { id: 90, user: actor, body: formatIssueComment({ ...intent, intent: 'continue' }) };
  const event = { action: 'created', issue: { id: 33, number: 7 }, sender: actor, comment };
  const router = { id: 44, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'issue_comment',
    head_sha: facts.sourceRevision, head_branch: 'main', repository: metadata, actor, triggering_actor: actor };
  const request = createControlRequest(intent, facts.sourceRevision, 44, 1, { commentId: 90 });
  const native = controlStageDispatch({ request, facts, run: router, event, repository, owner: 'owner' });
  const receipt = { schemaVersion: 1, id: native.id, digest: digest(JSON.stringify(native)), intent: native.intent, stage: 'refine',
    routerRunId: '44', routerAttempt: 1, workerRunId: '77', status: 'completed', clientKey: native.client.key, clientPayloadDigest: native.client.payloadDigest };
  const worker = { id: 77, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-refine.lock.yml', event: 'workflow_dispatch',
    head_sha: facts.sourceRevision, head_branch: 'main', repository: metadata, actor, triggering_actor: actor, status: 'completed', conclusion: 'success' };
  const snapshot = { ...native, workflowRunId: '77', attempt: 1, runId: '9'.repeat(64), replyTo: question.requestId, commentId: 90,
    dispatch: { commentId: 66, requestId: native.id, digest: receipt.digest } };
  const envelope = stageContext(snapshot, {}).contract.envelope;
  const report = { id: 88, user: { login: 'github-actions[bot]', type: 'Bot' }, html_url: `https://github.com/${repository}/issues/7#issuecomment-88`,
    body: `<!-- lighthouse-actions:${snapshot.runId} -->\n<!-- lighthouse-stage:refine:passed -->\n[Workflow run](https://github.com/${repository}/actions/runs/77)` };
  const state = { mutations: 0, receipt, worker, snapshot, envelope, report, index: null };
  const api = async (path, method = 'GET') => {
    assert.equal(method, 'GET');
    if (path === '') return metadata;
    if (path === 'issues/comments/66') return { id: 66, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repository}/issues/7`, body: dispatchReceiptBody(repository, receipt) };
    if (path === 'actions/runs/77') return worker;
    if (path === 'actions/runs/44/attempts/1') return router;
    if (path.startsWith('issues/7/comments?')) return [report];
    if (path.startsWith('actions/artifacts?')) return state.index;
    throw Error('Unexpected API read ' + path);
  };
  const record = { request, result: createControlResult(request, { status: 'admitted', dispatchCommentId: 66 }) };
  const readArtifact = async (_api, _repository, runId, name, member) => {
    if (name.startsWith('lighthouse-dispatch-')) return native;
    if (name.startsWith('lighthouse-issue-control-result-')) return record.result;
    if (name.startsWith('lighthouse-issue-control-')) return request;
    if (runId === '77') return member === 'request.json' ? snapshot : envelope;
    throw Error('Unexpected artifact ' + name);
  };
  return { options: { api, repository, actor, metadata, record, readArtifact }, state, request, facts };
}

test('only the exact validated published continuation can consume and resolve its original question', async () => {
  const { options, state } = fixture();
  let observation = await observeControlExecution(options);
  assert.equal(observation.workerRunId, 77); assert.equal(observation.workerAttempt, 1);
  assert.equal(observation.questionConsumed, true); assert.equal(observation.questionResolved, true);
  state.envelope.result.status = 'blocked';
  observation = await observeControlExecution(options);
  assert.equal(observation.questionConsumed, true); assert.equal(observation.questionResolved, false);
  state.worker.status = 'in_progress';
  assert.equal((await observeControlExecution(options)).questionConsumed, false);
  state.worker.status = 'completed'; state.snapshot.replyTo = '0'.repeat(64);
  await assert.rejects(observeControlExecution(options), /snapshot-grant|consumption/);
});

test('dispatch acknowledgment, missing publication and altered client metadata cannot clear a wait', async () => {
  const { options, state } = fixture(); state.receipt.workerRunId = null;
  const requested = await observeControlExecution(options);
  assert.equal(requested.status, 'requested'); assert.equal(requested.questionResolved, false);
  state.receipt.workerRunId = '77'; state.report.body = 'Unverified prose';
  assert.equal((await observeControlExecution(options)).availability, 'unavailable');
  state.receipt.clientKey = '0'.repeat(64);
  await assert.rejects(observeControlExecution(options), /receipt changed/);
});

test('a durable alias follows only its unique authenticated original with the same payload', async () => {
  const { options, state, facts } = fixture();
  const intent = createIssueIntent({ id: '12345678-1234-4234-8234-123456789abd', facts, action: 'continue', body: options.record.request.intent.body });
  const request = createControlRequest(intent, 'a'.repeat(40), 45, 1, { commentId: 91 });
  const result = createControlResult(request, { status: 'alias', aliasKey: options.record.result.key });
  state.index = { total_count: 1, artifacts: [{ name: controlIndexArtifact('key', result.aliasKey), expired: false, workflow_run: { id: 44 } }] };
  const original = await resolveControlAlias({ ...options, record: { request, result } });
  assert.deepEqual(original.request, options.record.request);
  state.index.total_count = 2;
  await assert.rejects(resolveControlAlias({ ...options, record: { request, result } }), /ambiguous/);
});
