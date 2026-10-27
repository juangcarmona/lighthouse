import { digest } from './host-contract.mjs';
import { readActionsJson } from './actions-artifact.mjs';

const routerPath = '.github/workflows/lighthouse-sdlc-router.yml';
export const stages = ['refine', 'propose', 'implement', 'integrate', 'review'];
export const stagePath = stage => { if (!stages.includes(stage)) throw Error('Unknown dispatch stage'); return `.github/workflows/lighthouse-sdlc-${stage}.lock.yml`; };
export const implementPath = stagePath('implement');
export const statusText = (stage, status) => `${({ requested: '📥 Requested', running: '▶️ Execution admitted', completed: '✅ Completed', waiting: '⏸️ Waiting for your response', failed: '❌ Failed or cancelled' })[status]} · ${stage}`;
const positive = value => /^[1-9][0-9]*$/.test(String(value));
const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
const hash = value => /^[a-f0-9]{64}$/.test(value ?? '');
export const dispatchId = (repository, runId, stage = 'implement') => digest(`${repository}:${runId}:${stage}`);
export const dispatchArtifact = request => `lighthouse-dispatch-${request.id}`;

export function readDispatchReceipt(comment, repository, issue) {
  if (comment?.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot' || comment.issue_url !== `https://api.github.com/repos/${repository}/issues/${issue}`) throw Error('Untrusted dispatch receipt');
  const matches = [...comment.body.matchAll(/<!-- lighthouse-dispatch:(\{[^\n]*\}) -->/g)];
  if (matches.length !== 1) throw Error('Missing or ambiguous dispatch receipt');
  const receipt = JSON.parse(matches[0][1]);
  if (receipt.schemaVersion !== 1 || !hash(receipt.id) || !hash(receipt.digest) || !positive(receipt.routerRunId) || !positive(receipt.routerAttempt) || !stages.includes(receipt.stage ?? 'implement') || (receipt.eventRunId !== undefined && !positive(receipt.eventRunId)) || receipt.id !== dispatchId(repository, receipt.eventRunId ?? receipt.routerRunId, receipt.stage ?? 'implement') || (receipt.workerRunId !== null && !positive(receipt.workerRunId))) throw Error('Invalid dispatch receipt');
  return receipt;
}

export function dispatchReceiptBody(repository, receipt) {
  const root = `https://github.com/${repository}/actions/runs/`;
  const heading = statusText(receipt.stage ?? 'implement', receipt.status ?? (receipt.workerRunId ? 'running' : 'requested'));
  const status = receipt.workerRunId ? `[Execution](${root}${receipt.workerRunId}). Open the execution for its current status and result.` : 'Execution requested; execution is not yet confirmed. Do not resend while confirmation is pending.';
  return `${heading}\n\n${status}\n\n[Router request](${root}${receipt.routerRunId})\n\n<!-- lighthouse-dispatch:${JSON.stringify(receipt)} -->`;
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
    if (!receipt.workerRunId) throw Error('An earlier stage dispatch is unconfirmed; reconcile it before requesting another');
    const run = await api(`actions/runs/${receipt.workerRunId}`);
    if (run.path !== stagePath(receipt.stage ?? 'implement') || run.status !== 'completed' && request.queue !== true) throw Error('A stage execution is still pending or running');
  }
  const receipt = { schemaVersion: 1, stage: request.stage, status: 'requested', ...(request.eventRunId ? { eventRunId: request.eventRunId } : {}), id: request.id, digest: digest(JSON.stringify(request)), routerRunId: request.routerRunId, routerAttempt: request.routerAttempt, workerRunId: null };
  const comment = await api(`issues/${request.issue}/comments`, 'POST', { body: dispatchReceiptBody(repository, receipt) });
  return { send: true, comment, receipt };
}

export async function sendDispatch(api, repository, request, commentId) {
  const receipt = readDispatchReceipt(await api(`issues/comments/${commentId}`), repository, request.issue);
  if (receipt.id !== request.id || receipt.digest !== digest(JSON.stringify(request))) throw Error('Dispatch request changed');
  if (receipt.workerRunId) return;
  // Never retry this POST automatically: its response can be lost after admission.
  return api(`actions/workflows/lighthouse-sdlc-${request.stage}.lock.yml/dispatches`, 'POST', { ref: request.ref, inputs: { issue: String(request.issue), 'dispatch-request': String(commentId) } });
}

export function verifyDispatchOrigin(request, receipt, parent, worker, repository, owner, issue) {
  const events = ['issues', 'issue_comment', 'pull_request_review', 'pull_request_review_comment', 'workflow_dispatch', 'workflow_run'];
  if (request.schemaVersion !== 1 || request.id !== receipt.id || request.repository !== repository || request.issue !== issue || request.stage !== (receipt.stage ?? 'implement') || !stages.includes(request.stage) || !sha(request.sourceRevision) || !sha(request.workflowRevision) || !hash(request.taskDigest) || typeof request.handoff !== 'boolean' || digest(JSON.stringify(request)) !== receipt.digest) throw Error('Dispatch artifact identity mismatch');
  if (String(parent.id) !== String(receipt.routerRunId) || parent.run_attempt !== receipt.routerAttempt || request.routerRunId !== receipt.routerRunId || request.routerAttempt !== receipt.routerAttempt || parent.path !== routerPath || (parent.event !== 'workflow_run' && (parent.actor?.login !== owner || parent.triggering_actor?.login !== owner)) || !events.includes(parent.event) || parent.event !== request.eventName || parent.head_sha !== request.workflowRevision || parent.head_branch !== request.ref || parent.repository?.full_name !== repository) throw Error('Dispatch origin is not an authorized router execution');
  const eventRunId = request.eventName === 'workflow_run' ? request.event?.workflow_run?.id : request.event?.inputs?.after_run;
  if (String(eventRunId ?? '') !== String(receipt.eventRunId ?? '') || String(request.eventRunId ?? '') !== String(receipt.eventRunId ?? '')) throw Error('Completion event identity mismatch');
  if (worker.path !== stagePath(request.stage) || worker.event !== 'workflow_dispatch' || worker.head_sha !== request.workflowRevision || worker.head_branch !== request.ref || worker.repository?.full_name !== repository || ![owner, 'github-actions[bot]'].includes(worker.actor?.login) || ![owner, 'github-actions[bot]'].includes(worker.triggering_actor?.login)) throw Error('Dispatch worker identity mismatch');
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
  fresh.workerRunId = String(workerId); fresh.status = 'running';
  await api(`issues/comments/${dispatch.commentId}`, 'PATCH', { body: dispatchReceiptBody(repository, fresh) });
  dispatch.receipt = fresh;
  return true;
}

export async function checkDispatchClaim(api, repository, issue, dispatch, workerId) {
  const receipt = readDispatchReceipt(await api(`issues/comments/${dispatch.commentId}`), repository, issue);
  if (receipt.id !== dispatch.requestId || receipt.digest !== dispatch.digest || String(receipt.workerRunId) !== String(workerId)) throw Error('Dispatch admission receipt revoked or changed');
}


// Every dispatched worker shares the literal issue concurrency key before this call.
export async function admitDispatch(api, repository, owner, env, event) {
  const issue = Number(env.LIGHTHOUSE_ISSUE);
  if (!Number.isSafeInteger(issue) || issue < 1 || String(issue) !== env.LIGHTHOUSE_ISSUE) throw Error('Dispatch issue must be a canonical positive integer');
  const worker = await api(`actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT}`);
  const dispatch = await loadDispatch(api, repository, owner, issue, event.inputs?.['dispatch-request'], worker);
  if (dispatch.request.stage !== env.LIGHTHOUSE_STAGE) throw Error('Dispatch targets a different stage');
  const admitted = await claimDispatch(api, repository, dispatch, env.GITHUB_RUN_ID);
  return { ...dispatch, admitted };
}

export async function finishDispatch(api, repository, issue, commentId, workerId, outcome) {
  if (!positive(commentId)) return;
  const receipt = readDispatchReceipt(await api(`issues/comments/${commentId}`), repository, issue);
  if (String(receipt.workerRunId) !== String(workerId)) return;
  receipt.status = outcome === 'passed' ? 'completed' : outcome === 'blocked' ? 'waiting' : 'failed';
  await api(`issues/comments/${commentId}`, 'PATCH', { body: dispatchReceiptBody(repository, receipt) });
}

// An owner can replay a completed run on a reviewed workflow branch for acceptance.
// Automated events and manual replays use the same fresh GitHub observation.
export async function completedEvent(api, event, env) {
  if (env.GITHUB_EVENT_NAME === 'workflow_run') return event;
  const id = event.inputs?.after_run;
  if (!id) return null;
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_ACTOR !== env.GITHUB_REPOSITORY_OWNER || env.GITHUB_TRIGGERING_ACTOR !== env.GITHUB_REPOSITORY_OWNER || !positive(id)) throw Error('Completion replay requires an owner and a run ID');
  const run = await api(`actions/runs/${id}`);
  return { action: 'completed', workflow_run: { id: run.id, head_sha: run.head_sha } };
}
