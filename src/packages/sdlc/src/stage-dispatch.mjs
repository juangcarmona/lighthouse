import { digest } from './host-contract.mjs';
import { readActionsJson } from './actions-artifact.mjs';
import { handoff } from './handoff.mjs';

const routerPath = '.github/workflows/lighthouse-sdlc-router.yml';
export const stages = ['triage', 'refine', 'propose', 'implement', 'integrate', 'review'];
export const workers = [...stages, 'apply-review', 'product-change', 'apply-product-change'];
export const workerFor = request => request.worker ?? request.stage ?? 'implement';
export const stagePath = stage => { if (!workers.includes(stage)) throw Error('Unknown dispatch worker'); return `.github/workflows/lighthouse-sdlc-${stage}.lock.yml`; };
export const implementPath = stagePath('implement');
export const statusText = (stage, status) => `${({ requested: '📥 Requested', running: '▶️ Execution admitted', completed: '✅ Completed', waiting: '⏸️ Waiting for your response', failed: '❌ Failed or cancelled' })[status]} · ${stage}`;
const positive = value => /^[1-9][0-9]*$/.test(String(value));
export const isBotContinuation = (event, eventName, actor, triggeringActor) => eventName === 'workflow_dispatch' && actor === 'github-actions[bot]' && triggeringActor === actor && event.inputs?.stage === 'implement' && positive(event.inputs?.issue) && positive(event.inputs?.after_run);
const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
const hash = value => /^[a-f0-9]{64}$/.test(value ?? '');
export const dispatchId = (repository, runId, stage = 'implement') => digest(`${repository}:${runId}:${stage}`);
export const receiptId = (repository, receipt) => receipt.recovery ? digest(`${repository}:${receipt.recovery.rootId}:retry:${receipt.recovery.attempt}`) : dispatchId(repository, receipt.feedbackKey ?? receipt.eventRunId ?? receipt.routerRunId, receipt.stage ?? 'implement');
export const dispatchArtifact = request => `lighthouse-dispatch-${request.id}`;

export function readDispatchReceipt(comment, repository, issue) {
  if (comment?.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot' || comment.issue_url !== `https://api.github.com/repos/${repository}/issues/${issue}`) throw Error('Untrusted dispatch receipt');
  const matches = [...comment.body.matchAll(/<!-- lighthouse-dispatch:(\{[^\n]*\}) -->/g)];
  if (matches.length !== 1) throw Error('Missing or ambiguous dispatch receipt');
  const receipt = JSON.parse(matches[0][1]);
  if (receipt.recovery && (!hash(receipt.recovery.rootId) || !positive(receipt.recovery.previousComment) || !Number.isSafeInteger(receipt.recovery.attempt) || receipt.recovery.attempt < 1 || receipt.recovery.attempt > 2)) throw Error('Invalid recovery receipt');
  if (receipt.schemaVersion !== 1 || !hash(receipt.id) || !hash(receipt.digest) || !positive(receipt.routerRunId) || !positive(receipt.routerAttempt) || !stages.includes(receipt.stage ?? 'implement') || !workers.includes(workerFor(receipt)) || (receipt.feedbackKey !== undefined && !hash(receipt.feedbackKey)) || (receipt.eventRunId !== undefined && !positive(receipt.eventRunId)) || receipt.id !== receiptId(repository, receipt) || (receipt.workerRunId !== null && !positive(receipt.workerRunId))) throw Error('Invalid dispatch receipt');
  return receipt;
}

export function dispatchReceiptBody(repository, receipt) {
  const root = `https://github.com/${repository}/actions/runs/`;
  const status = receipt.status ?? (receipt.workerRunId ? 'running' : 'requested');
  const states = {
    requested: ['requested', 'The request is recorded; execution is not confirmed.', 'None. Wait for admission.', 'The workflow will report the outcome when the request is processed.'],
    running: ['queued', 'The worker admitted the request; agent execution is not yet confirmed.', 'None. Wait for the result.', 'The workflow will publish a result or an actionable stop.'],
    completed: ['completed', 'The stage published a validated result.', 'Follow the latest stage handoff.', 'The configured continuation applies only when authorized.'],
    waiting: ['blocked', 'The stage published a blocked result.', 'Follow the latest stage handoff.', 'Continuation depends on the recorded blocker and authorization.'],
    failed: ['failed', 'This attempt did not publish a validated result.', 'The workflow maintainer should inspect the execution and recovery policy.', 'Any retry requires the configured authorization.'],
    unknown: ['unknown', 'Publication of a validated result could not be confirmed.', 'The workflow maintainer should inspect the execution.', 'Reconcile the outcome before requesting another attempt.'],
  };
  const item = states[status];
  if (!item) throw Error('Unknown dispatch status');
  const recovery = receipt.recovery ? `\nRetry ${receipt.recovery.attempt}/2 · [Previous request](https://github.com/${repository}/issues/${receipt.issue ?? ''}#issuecomment-${receipt.recovery.previousComment})` : '';
  const details = `[Dispatch origin](${root}${receipt.routerRunId})${receipt.workerRunId ? ` · [Execution](${root}${receipt.workerRunId})` : ''}${recovery}\n\n<!-- lighthouse-dispatch:${JSON.stringify(receipt)} -->`;
  return handoff({ status: item[0], stage: workerFor(receipt), happened: item[1], action: item[2], next: item[3], details });
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
    if (run.path !== stagePath(workerFor(receipt)) || run.status !== 'completed' && request.queue !== true) throw Error('A stage execution is still pending or running');
  }
  const receipt = { schemaVersion: 1, stage: request.stage, ...(request.recovery ? { recovery: request.recovery, issue: request.issue } : {}), ...(request.worker ? { worker: request.worker } : {}), ...(request.feedbackKey ? { feedbackKey: request.feedbackKey } : {}), status: 'requested', ...(request.eventRunId ? { eventRunId: request.eventRunId } : {}), id: request.id, digest: digest(JSON.stringify(request)), routerRunId: request.routerRunId, routerAttempt: request.routerAttempt, workerRunId: null };
  const comment = await api(`issues/${request.issue}/comments`, 'POST', { body: dispatchReceiptBody(repository, receipt) });
  return { send: true, comment, receipt };
}

export async function sendDispatch(api, repository, request, commentId) {
  const receipt = readDispatchReceipt(await api(`issues/comments/${commentId}`), repository, request.issue);
  if (receipt.id !== request.id || receipt.digest !== digest(JSON.stringify(request))) throw Error('Dispatch request changed');
  if (receipt.workerRunId) return;
  // Never retry this POST automatically: its response can be lost after admission.
  return api(`actions/workflows/lighthouse-sdlc-${workerFor(request)}.lock.yml/dispatches`, 'POST', { ref: request.ref, inputs: { issue: String(request.issue), 'dispatch-request': String(commentId), ...(workerFor(request) === 'apply-product-change' ? { 'pull-request': String(request.productApproval.pullRequest), head: request.productApproval.head } : {}) } });
}

// Called only for a dispatch whose router identity is authenticated by the host.
export function executionModelSelection(request) {
  const input = request?.event?.inputs?.model_selection;
  if (input === undefined || input === '') return undefined;
  if (request.eventName !== 'workflow_dispatch' || request.recovery || request.handoff || request.worker || request.event.inputs.after_run || (request.event.inputs.workflow && request.event.inputs.workflow !== 'stage')) throw Error('Model selection requires a direct owner stage dispatch');
  if (typeof input !== 'string' || Buffer.byteLength(input) > 512) throw Error('Invalid execution model selection');
  let value;
  try { value = JSON.parse(input); } catch { throw Error('Invalid execution model selection JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid execution model selection');
  return value;
}

export function verifyDispatchOrigin(request, receipt, parent, worker, repository, owner, issue) {
  const delegatedWorker = workerFor(request) === 'apply-review' && ['propose', 'implement'].includes(request.stage) || workerFor(request) === 'product-change' && ['propose', 'implement'].includes(request.stage);
  const applyProductWorker = workerFor(request) === 'apply-product-change' && ['propose', 'implement'].includes(request.stage);
  if (workerFor(request) !== workerFor(receipt) || request.feedbackKey !== receipt.feedbackKey || workerFor(request) !== request.stage && !delegatedWorker && !applyProductWorker) throw Error('Dispatch worker responsibility mismatch');
  if (workerFor(request) === 'product-change') {
    const idea = request.eventName === 'workflow_dispatch' && request.event?.inputs?.workflow === 'product-change';
    const feedback = request.productFeedback && ['answer', 'request-changes'].includes(request.productFeedback.action) && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(request.productFeedback.changeName ?? '') && typeof request.productFeedback.text === 'string' && request.productFeedback.text.trim().length > 0 && request.productFeedback.text.length <= 12000 && ['issue_comment', 'pull_request_review'].includes(request.eventName);
    if (!idea && !feedback) throw Error('Product Change worker needs an authorized idea selector or authenticated owner feedback');
  }
  if (workerFor(request) === 'apply-product-change' && (!request.productApproval || request.productApproval.kind !== 'approval' || !hash(request.productApproval.reviewKey))) throw Error('Trusted Product Change apply requires a bound approval');
  if (JSON.stringify(request.recovery) !== JSON.stringify(receipt.recovery)) throw Error('Recovery receipt identity mismatch');
  const events = ['issues', 'issue_comment', 'pull_request_review', 'pull_request_review_comment', 'workflow_dispatch', 'workflow_run'];
  if (request.schemaVersion !== 1 || request.id !== receipt.id || request.repository !== repository || request.issue !== issue || request.stage !== (receipt.stage ?? 'implement') || !stages.includes(request.stage) || !sha(request.sourceRevision) || !sha(request.workflowRevision) || !hash(request.taskDigest) || typeof request.handoff !== 'boolean' || digest(JSON.stringify(request)) !== receipt.digest) throw Error('Dispatch artifact identity mismatch');
  const recovery = !!request.recovery;
  const originPath = recovery ? '.github/workflows/lighthouse-worker-maintenance.yml' : routerPath;
  const originEvent = recovery ? request.routerEventName : request.eventName;
  const continuation = !recovery && isBotContinuation(request.event, parent.event, parent.actor?.login, parent.triggering_actor?.login) && request.stage === 'implement' && request.handoff && !request.worker && !request.feedbackKey && Number(request.event.inputs.issue) === issue && request.predecessor?.runId === request.event.inputs.after_run;
  if (String(parent.id) !== String(receipt.routerRunId) || parent.run_attempt !== receipt.routerAttempt || request.routerRunId !== receipt.routerRunId || request.routerAttempt !== receipt.routerAttempt || parent.path !== originPath || (parent.event !== 'workflow_run' && !continuation && (parent.actor?.login !== owner || parent.triggering_actor?.login !== owner)) || !(recovery ? ['schedule', 'workflow_dispatch'] : events).includes(parent.event) || parent.event !== originEvent || parent.head_sha !== (request.routerRevision ?? request.workflowRevision) || parent.head_branch !== (request.routerRef ?? request.ref) || parent.repository?.full_name !== repository) throw Error('Dispatch origin is not an authorized router execution');
  executionModelSelection(request);
  const eventRunId = request.eventName === 'workflow_run' ? request.event?.workflow_run?.id : request.event?.inputs?.after_run;
  if (String(eventRunId ?? '') !== String(receipt.eventRunId ?? '') || String(request.eventRunId ?? '') !== String(receipt.eventRunId ?? '')) throw Error('Completion event identity mismatch');
  if (worker.path !== stagePath(workerFor(request)) || worker.event !== 'workflow_dispatch' || worker.head_sha !== request.workflowRevision || worker.head_branch !== request.ref || worker.repository?.full_name !== repository || ![owner, 'github-actions[bot]'].includes(worker.actor?.login) || ![owner, 'github-actions[bot]'].includes(worker.triggering_actor?.login)) throw Error('Dispatch worker identity mismatch');
}

export async function loadDispatch(api, repository, owner, issue, commentId, worker, readArtifact = readActionsJson, depth = 0) {
  if (depth > 2) throw Error('Recovery chain exceeds its bound');
  if (!positive(commentId)) throw Error('Invalid dispatch receipt identifier');
  const comment = await api(`issues/comments/${commentId}`);
  const receipt = readDispatchReceipt(comment, repository, issue);
  const parent = await api(`actions/runs/${receipt.routerRunId}/attempts/${receipt.routerAttempt}`);
  const request = await readArtifact(api, repository, receipt.routerRunId, dispatchArtifact(receipt), 'dispatch.json');
  verifyDispatchOrigin(request, receipt, parent, worker, repository, owner, issue);
  if (isBotContinuation(request.event, parent.event, parent.actor?.login, parent.triggering_actor?.login)) {
    const predecessor = await api(`actions/runs/${request.predecessor.runId}`);
    const next = await (await import('./stage-transition.mjs')).refinementAfterRun(api, repository, owner, { action: 'completed', workflow_run: { id: predecessor.id, head_sha: predecessor.head_sha } }, readArtifact);
    if (next?.issue !== issue || JSON.stringify(next.predecessor) !== JSON.stringify(request.predecessor)) throw Error('Bot continuation lacks an authenticated refinement');
  }
  const dispatch = { request, receipt, commentId: Number(commentId) };
  if (request.recovery) await (await import('./worker-recovery.mjs')).verifyRecoveryOrigin(api, repository, owner, dispatch, parent, readArtifact, depth);
  return dispatch;
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
  if (env.LIGHTHOUSE_WORKER ? workerFor(dispatch.request) !== env.LIGHTHOUSE_WORKER : dispatch.request.stage !== env.LIGHTHOUSE_STAGE) throw Error('Dispatch targets a different stage or worker');
  if (dispatch.request.recovery) {
    if (env.LIGHTHOUSE_RECOVERY_ENABLED !== 'true') throw Error('Automatic recovery has been disabled');
    const parent = await api(`actions/runs/${dispatch.receipt.routerRunId}/attempts/${dispatch.receipt.routerAttempt}`);
    await (await import('./worker-recovery.mjs')).verifyRecoveryOrigin(api, repository, owner, dispatch, parent, readActionsJson, 0, true);
  }
  const admitted = await claimDispatch(api, repository, dispatch, env.GITHUB_RUN_ID);
  return { ...dispatch, admitted };
}

export async function finishDispatch(api, repository, issue, commentId, workerId, outcome) {
  if (!positive(commentId)) return;
  const receipt = readDispatchReceipt(await api(`issues/comments/${commentId}`), repository, issue);
  if (String(receipt.workerRunId) !== String(workerId)) return;
  receipt.status = outcome === 'passed' ? 'completed' : outcome === 'blocked' ? 'waiting' : outcome === 'failed' ? 'failed' : 'unknown';
  await api(`issues/comments/${commentId}`, 'PATCH', { body: dispatchReceiptBody(repository, receipt) });
}

// An owner can replay a completed run on a reviewed workflow branch for acceptance.
// Automated events and manual replays use the same fresh GitHub observation.
export async function completedEvent(api, event, env, wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  if (env.GITHUB_EVENT_NAME === 'workflow_run') return event;
  const id = event.inputs?.after_run;
  if (!id) return null;
  const bot = isBotContinuation(event, env.GITHUB_EVENT_NAME, env.GITHUB_ACTOR, env.GITHUB_TRIGGERING_ACTOR);
  if (!bot && (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_ACTOR !== env.GITHUB_REPOSITORY_OWNER || env.GITHUB_TRIGGERING_ACTOR !== env.GITHUB_REPOSITORY_OWNER || !positive(id))) throw Error('Completion replay requires an owner and a run ID, or a verified refinement continuation');
  let run = await api(`actions/runs/${id}`);
  if (bot) {
    if (run.path !== stagePath('refine')) throw Error('Bot continuation must reference a refinement');
    // The publisher signals before its own workflow has finished its final jobs.
    for (let attempt = 0; run.status !== 'completed' && attempt < 24; attempt++) {
      await wait(5000); run = await api(`actions/runs/${id}`);
    }
    if (run.status !== 'completed') throw Error('Refinement completion timed out; replay after the execution completes');
  }
  return { action: 'completed', workflow_run: { id: run.id, head_sha: run.head_sha } };
}
