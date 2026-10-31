import test from 'node:test';
import assert from 'node:assert/strict';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { dispatchArtifact, dispatchId, dispatchReceiptBody, stagePath } from '../packages/sdlc/src/stage-dispatch.mjs';
import { productGapAfterRun, verifyProductParent } from '../packages/sdlc/src/stage-transition.mjs';

const repository = 'owner/repo', owner = 'owner', issue = { number: 18, title: 'Bounded request', body: 'Known scope', state: 'open', labels: [] };
const sha = digit => digit.repeat(64), revision = digit => digit.repeat(40);
const bot = { login: 'github-actions[bot]', type: 'Bot' };
const ownerAnswer = { id: 99, body: 'The repository enables the option.', updated_at: '2026-10-31T10:00:00Z', user: { login: owner, type: 'User' } };
const taskDigest = comments => digest(JSON.stringify({ title: issue.title, body: issue.body, comments: comments.map(c => ({ id: c.id, body: c.body, updated_at: c.updated_at })) }));
function execution({ routerId, workerId, stage, worker, eventName, event, task, extras = {} }) {
  const request = { schemaVersion: 1, id: dispatchId(repository, String(routerId), stage), repository, issue: issue.number, stage, ...(worker ? { worker } : {}), routerRunId: String(routerId), routerAttempt: 1, workflowRevision: revision('a'), sourceRevision: revision('b'), taskDigest: task, ref: 'main', eventName, event, handoff: false, ...extras };
  const receipt = { schemaVersion: 1, stage, ...(worker ? { worker } : {}), id: request.id, digest: digest(JSON.stringify(request)), routerRunId: String(routerId), routerAttempt: 1, workerRunId: String(workerId) };
  const comment = { id: routerId + 1000, issue_url: `https://api.github.com/repos/${repository}/issues/${issue.number}`, user: bot, body: dispatchReceiptBody(repository, receipt) };
  const router = { id: routerId, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: eventName, actor: { login: owner }, triggering_actor: { login: owner }, head_sha: revision('a'), head_branch: 'main', repository: { full_name: repository } };
  const run = { id: workerId, run_attempt: 1, path: stagePath(worker ?? stage), event: 'workflow_dispatch', actor: { login: 'github-actions[bot]' }, triggering_actor: { login: 'github-actions[bot]' }, head_sha: revision('a'), head_branch: 'main', repository: { full_name: repository }, status: 'completed', conclusion: 'success' };
  return { request, receipt, comment, router, run, dispatch: { commentId: comment.id, requestId: request.id, digest: receipt.digest } };
}
const result = (runId, stage, status, output) => ({ schemaVersion: 1, result: { schemaVersion: 1, runId, stage, gate: 'ready', status, evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Continue the authorized work.', output }, effect: { type: 'issue-comment', body: 'Bounded result.' } });

test('an owner answer remains bound to its actual product question and original parent', async () => {
  const base = execution({ routerId: 100, workerId: 200, stage: 'refine', eventName: 'workflow_dispatch', event: { inputs: { issue: '18', stage: 'refine' } }, task: taskDigest([]) });
  const gap = { summary: 'The product intent is missing.', scope: 'The authorized issue.' };
  const parentSnapshot = { issue: 18, stage: 'refine', runId: sha('c'), workflowRunId: '200', workflowRevision: revision('a'), sourceRevision: revision('b'), taskDigest: taskDigest([]), autoImplement: false, dispatch: base.dispatch };
  const parentEnvelope = result(parentSnapshot.runId, 'refine', 'blocked', { productGap: gap });
  const parentReport = { user: bot, body: `<!-- lighthouse-actions:${parentSnapshot.runId} -->\n<!-- lighthouse-stage:refine:blocked -->` };
  const question = 'Who enables the option?';
  const prior = execution({ routerId: 150, workerId: 250, stage: 'refine', worker: 'product-change', eventName: 'workflow_dispatch', event: { inputs: { issue: '18', workflow: 'product-change' } }, task: taskDigest([]) });
  const answer = execution({ routerId: 300, workerId: 350, stage: 'refine', worker: 'product-change', eventName: 'issue_comment', event: { comment: ownerAnswer }, task: taskDigest([ownerAnswer]), extras: { productFeedback: { action: 'answer', changeName: 'example', text: ownerAnswer.body, sourceCommentId: 99 } } });
  const reports = [parentReport, ownerAnswer];
  const runs = new Map([[200, base.run], [250, prior.run], [350, answer.run]]), routers = new Map([[100, base.router], [150, prior.router], [300, answer.router]]), comments = new Map([[base.comment.id, base.comment], [prior.comment.id, prior.comment], [answer.comment.id, answer.comment]]), snapshots = new Map(), envelopes = new Map(), dispatches = new Map([[100, base.request], [150, prior.request], [300, answer.request]]);
  snapshots.set(200, parentSnapshot); envelopes.set(200, parentEnvelope);
  const api = async path => {
    if (path === 'actions/runs/200/artifacts?per_page=100') return { total_count: 1, artifacts: [{ name: 'lighthouse-input-18-1' }] };
    if (path.startsWith('issues/18/comments?')) return reports;
    let match = path.match(/^actions\/runs\/(\d+)\/attempts\/1$/); if (match) return routers.get(Number(match[1]));
    match = path.match(/^actions\/runs\/(\d+)$/); if (match) return runs.get(Number(match[1]));
    match = path.match(/^issues\/comments\/(\d+)$/); if (match) return comments.get(Number(match[1]));
    throw Error(`Unexpected API path: ${path}`);
  };
  const readArtifact = async (_api, _repo, run, _name, file) => file === 'dispatch.json' ? dispatches.get(Number(run)) : file === 'request.json' ? snapshots.get(Number(run)) : envelopes.get(Number(run));
  const original = await productGapAfterRun(api, repository, owner, { action: 'completed', workflow_run: { id: 200, head_sha: revision('a') } }, readArtifact);
  prior.request.productParent = original;
  prior.receipt.digest = digest(JSON.stringify(prior.request));
  prior.comment.body = dispatchReceiptBody(repository, prior.receipt);
  prior.dispatch.digest = prior.receipt.digest;
  const priorSnapshot = { issue: 18, stage: 'refine', worker: 'product-change', runId: sha('d'), workflowRunId: '250', workflowRevision: revision('a'), sourceRevision: revision('b'), taskDigest: taskDigest([]), productParent: original, dispatch: prior.dispatch };
  const priorEnvelope = result(priorSnapshot.runId, 'refine', 'blocked', { productChange: { schemaVersion: 1, outcome: 'blocked', entry: 'parent-handoff', affectedAreas: [], decisions: [], question } });
  const priorReport = { user: bot, body: `[Workflow run](https://github.com/${repository}/actions/runs/250)\n<!-- lighthouse-actions:${priorSnapshot.runId} -->\n<!-- lighthouse-question -->` };
  reports.splice(1, 0, priorReport); snapshots.set(250, priorSnapshot); envelopes.set(250, priorEnvelope);
  const root = 'openspec/changes/example';
  const files = [{ path: `${root}/.openspec.yaml`, content: 'schema: product-change\n' }, { path: `${root}/product-change/change.md`, content: '---\nid: CHG-EXAMPLE\nstatus: draft\n---\n' }, { path: `${root}/product-change/proposed/example.md`, content: 'Proposed artifact' }];
  const answerSnapshot = { issue: 18, stage: 'refine', worker: 'product-change', runId: sha('e'), workflowRunId: '350', workflowRevision: revision('a'), sourceRevision: revision('b'), taskDigest: taskDigest([ownerAnswer]), productParent: original, replyTo: priorSnapshot.runId, commentId: ownerAnswer.id, answerHistory: [{ question, answer: { body: ownerAnswer.body } }], dispatch: answer.dispatch };
  const candidate = { schemaVersion: 1, outcome: 'candidate', entry: 'feedback', affectedAreas: [], decisions: [], changeName: 'example', changeId: 'CHG-EXAMPLE', files, baselineDigest: sha('f'), providerValidation: { status: 'pending', diagnosticCount: 0 } };
  snapshots.set(350, answerSnapshot); envelopes.set(350, result(answerSnapshot.runId, 'refine', 'passed', { productChange: candidate }));
  reports.push({ user: bot, body: `<!-- lighthouse-actions:${answerSnapshot.runId} -->\n<!-- lighthouse-stage:refine:passed -->` });
  const parent = { ...original, feedback: { runId: '350', attempt: 1, taskDigest: answerSnapshot.taskDigest, replyTo: priorSnapshot.runId, commentId: ownerAnswer.id } };
  assert.equal(await verifyProductParent(api, repository, owner, parent, issue, reports, revision('b'), readArtifact), true);
  answerSnapshot.answerHistory[0].question = 'A different question?';
  await assert.rejects(verifyProductParent(api, repository, owner, parent, issue, reports, revision('b'), readArtifact), /pending question/);
  answerSnapshot.answerHistory[0].question = question;
  reports[2] = { ...ownerAnswer, body: 'Changed after the decision.', updated_at: '2026-10-31T11:00:00Z' };
  await assert.rejects(verifyProductParent(api, repository, owner, parent, issue, reports, revision('b'), readArtifact), /owner intent changed|authenticated owner reply|pending question/);
});
