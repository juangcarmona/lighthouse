import { digest } from './host-contract.mjs';
import { readActionsJson } from './actions-artifact.mjs';

const routerPath = '.github/workflows/lighthouse-sdlc-router.yml';
export const implementPath = '.github/workflows/lighthouse-sdlc-implement.lock.yml';
const positive = value => /^[1-9][0-9]*$/.test(String(value));
const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
const hash = value => /^[a-f0-9]{64}$/.test(value ?? '');
export const dispatchId = (repository, runId) => digest(`${repository}:${runId}:implement`);
export const dispatchArtifact = request => `lighthouse-dispatch-${request.id}`;

export function readDispatchReceipt(comment, repository, issue) {
  if (comment?.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot' || comment.issue_url !== `https://api.github.com/repos/${repository}/issues/${issue}`) throw Error('Untrusted dispatch receipt');
  const matches = [...comment.body.matchAll(/<!-- lighthouse-dispatch:(\{[^\n]*\}) -->/g)];
  if (matches.length !== 1) throw Error('Missing or ambiguous dispatch receipt');
  const receipt = JSON.parse(matches[0][1]);
  if (receipt.schemaVersion !== 1 || !hash(receipt.id) || !hash(receipt.digest) || !positive(receipt.routerRunId) || !positive(receipt.routerAttempt) || receipt.id !== dispatchId(repository, receipt.routerRunId) || (receipt.workerRunId !== null && !positive(receipt.workerRunId))) throw Error('Invalid dispatch receipt');
  return receipt;
}

export function dispatchReceiptBody(repository, receipt) {
  const root = `https://github.com/${repository}/actions/runs/`;
  const status = receipt.workerRunId ? `[Implementation execution](${root}${receipt.workerRunId}). Open the execution for its current status and result.` : 'Implementation requested; execution is not yet confirmed. Do not resend while confirmation is pending.';
  return `${status}\n\n[Router request](${root}${receipt.routerRunId})\n\n<!-- lighthouse-dispatch:${JSON.stringify(receipt)} -->`;
}

export async function issueComments(api, issue) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await api(`issues/${issue}/comments?per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
  throw Error('Comment history exceeds bounded intake');
}

// The router dispatch job serializes receipt creation per issue. Workers acquire
// the existing issue concurrency group before claiming a receipt.
export async function recordDispatch(api, repository, request) {
  if (Buffer.byteLength(JSON.stringify(request)) > 128000) throw Error('Dispatch request exceeds its artifact bound');
  const comments = await issueComments(api, request.issue);
  for (const comment of comments) {
    if (comment.user?.login !== 'github-actions[bot]' || !comment.body.includes('<!-- lighthouse-dispatch:')) continue;
    const receipt = readDispatchReceipt(comment, repository, request.issue);
    if (receipt.id === request.id) return { send: false, comment, receipt };
    if (!receipt.workerRunId) throw Error('An earlier implementation dispatch is unconfirmed; reconcile it before requesting another');
    const run = await api(`actions/runs/${receipt.workerRunId}`);
    if (run.path !== implementPath || run.status !== 'completed') throw Error('An implementation execution is still pending or running');
  }
  const receipt = { schemaVersion: 1, id: request.id, digest: digest(JSON.stringify(request)), routerRunId: request.routerRunId, routerAttempt: request.routerAttempt, workerRunId: null };
  const comment = await api(`issues/${request.issue}/comments`, 'POST', { body: dispatchReceiptBody(repository, receipt) });
  return { send: true, comment, receipt };
}

export async function sendDispatch(api, repository, request, commentId) {
  const receipt = readDispatchReceipt(await api(`issues/comments/${commentId}`), repository, request.issue);
  if (receipt.id !== request.id || receipt.digest !== digest(JSON.stringify(request))) throw Error('Dispatch request changed');
  if (receipt.workerRunId) return;
  // Never retry this POST automatically: its response can be lost after admission.
  return api('actions/workflows/lighthouse-sdlc-implement.lock.yml/dispatches', 'POST', { ref: request.ref, inputs: { issue: String(request.issue), 'dispatch-request': String(commentId) } });
}

export function verifyDispatchOrigin(request, receipt, parent, worker, repository, owner, issue) {
  const events = ['issues', 'issue_comment', 'pull_request_review', 'pull_request_review_comment', 'workflow_dispatch'];
  if (request.schemaVersion !== 1 || request.id !== receipt.id || request.repository !== repository || request.issue !== issue || request.stage !== 'implement' || !sha(request.sourceRevision) || !sha(request.workflowRevision) || !hash(request.taskDigest) || typeof request.handoff !== 'boolean' || digest(JSON.stringify(request)) !== receipt.digest) throw Error('Dispatch artifact identity mismatch');
  if (String(parent.id) !== String(receipt.routerRunId) || parent.run_attempt !== receipt.routerAttempt || request.routerRunId !== receipt.routerRunId || request.routerAttempt !== receipt.routerAttempt || parent.path !== routerPath || parent.actor?.login !== owner || parent.triggering_actor?.login !== owner || !events.includes(parent.event) || parent.event !== request.eventName || parent.head_sha !== request.workflowRevision || parent.head_branch !== request.ref || parent.repository?.full_name !== repository) throw Error('Dispatch origin is not an authorized router execution');
  if (worker.path !== implementPath || worker.event !== 'workflow_dispatch' || worker.head_sha !== request.workflowRevision || worker.head_branch !== request.ref || worker.repository?.full_name !== repository || ![owner, 'github-actions[bot]'].includes(worker.actor?.login) || ![owner, 'github-actions[bot]'].includes(worker.triggering_actor?.login)) throw Error('Dispatch worker identity mismatch');
}

export async function loadDispatch(api, repository, owner, issue, commentId, worker, readArtifact = readActionsJson) {
  if (!positive(commentId)) throw Error('Invalid dispatch receipt identifier');
  const comment = await api(`issues/comments/${commentId}`);
  const receipt = readDispatchReceipt(comment, repository, issue);
  const parent = await api(`actions/runs/${receipt.routerRunId}/attempts/${receipt.routerAttempt}`);
  const request = await readArtifact(api, repository, receipt.routerRunId, dispatchArtifact(receipt), 'dispatch.json');
  verifyDispatchOrigin(request, receipt, parent, worker, repository, owner, issue);
  return { request, receipt, commentId: Number(commentId) };
}

export async function claimDispatch(api, repository, dispatch, workerId) {
  const fresh = readDispatchReceipt(await api(`issues/comments/${dispatch.commentId}`), repository, dispatch.request.issue);
  if (fresh.id !== dispatch.receipt.id || fresh.digest !== dispatch.receipt.digest) throw Error('Dispatch receipt changed before admission');
  if (fresh.workerRunId) return false;
  fresh.workerRunId = String(workerId);
  await api(`issues/comments/${dispatch.commentId}`, 'PATCH', { body: dispatchReceiptBody(repository, fresh) });
  dispatch.receipt = fresh;
  return true;
}

export async function checkDispatchClaim(api, repository, issue, dispatch, workerId) {
  const receipt = readDispatchReceipt(await api(`issues/comments/${dispatch.commentId}`), repository, issue);
  if (receipt.id !== dispatch.requestId || receipt.digest !== dispatch.digest || String(receipt.workerRunId) !== String(workerId)) throw Error('Dispatch admission receipt revoked or changed');
}
