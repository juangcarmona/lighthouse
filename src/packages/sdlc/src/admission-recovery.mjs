import { productModelDirectoryFromConfig } from './product-change.mjs';
import { readActionsJson } from './actions-artifact.mjs';
import { digest } from './digests.mjs';
import { inspectCompletion, assertChecks, postMergeRuns } from './completion-state.mjs';
import { deliveryAfterChecks } from './delivery-events.mjs';
import { dispatchIntent, dispatchReceiptBody, isBotContinuation, loadDispatch, readDispatchReceipt, stagePath } from './stage-dispatch.mjs';

const stop = 'Inspect the rejected execution and current authority before requesting fresh work. No automatic replay is authorized.';
const same = (a, b) => digest(JSON.stringify(a)) === digest(JSON.stringify(b));
const preparation = 'Verify accepted commit, checks and evidence protection';

async function rejectedJobs(api, { dispatch, run }) {
  if (run.status !== 'completed' || run.run_attempt !== 1 || run.conclusion !== 'failure') return null;
  if (dispatch.receipt.workerRunId && String(dispatch.receipt.workerRunId) !== String(run.id)) return null;
  const inventory = await api(`actions/runs/${run.id}/attempts/1/jobs?per_page=100`);
  if (!Array.isArray(inventory.jobs) || inventory.total_count !== inventory.jobs.length || inventory.total_count > 100) return null;
  const jobs = inventory.jobs;
  const preparationJobs = jobs.filter(job => job.name === preparation), publicationJobs = jobs.filter(job => job.name === 'Validate, publish and release');
  if (preparationJobs.length !== 1 || preparationJobs[0].conclusion !== 'failure' || publicationJobs.length !== 1 || publicationJobs[0].conclusion !== 'skipped' || ['pre_activation', 'activation', 'agent'].some(name => jobs.filter(job => job.name === name).length !== 1 || jobs.find(job => job.name === name).conclusion !== 'skipped') || jobs.some(job => job.name !== preparation && job.conclusion !== 'skipped')) return null;
  return jobs;
}

// Completion is a wake-up only: admission still rechecks the original grant and current authority.
export async function admissionCompletion(api, repository, owner, event, readArtifact = readActionsJson) {
  const signal = event.workflow_run;
  if (event.action !== 'completed' || signal?.repository?.full_name !== repository || !Number.isSafeInteger(signal.id) || signal.id < 1 || signal.run_attempt !== 1 || signal.status !== 'completed' || signal.conclusion !== 'failure') return null;
  const run = await api(`actions/runs/${signal.id}/attempts/${signal.run_attempt}`);
  if (run?.repository?.full_name !== repository || run.path !== stagePath('review') || run.event !== 'workflow_dispatch' || run.head_sha !== signal.head_sha || run.run_attempt !== signal.run_attempt || run.status !== 'completed' || run.conclusion !== 'failure') return null;
  const match = /^review #([1-9][0-9]*) · request ([1-9][0-9]*)$/.exec(run.display_title ?? '');
  if (!match) return null;
  let rejection;
  try { await loadDispatch(api, repository, owner, Number(match[1]), Number(match[2]), run, readArtifact); }
  catch (error) { rejection = error.rejection; }
  const request = rejection?.dispatch.request;
  if (!request || request.recovery || request.stage !== 'review' || request.worker || request.handoff || request.completionRecovery || !isBotContinuation(request.event, rejection.parent.event, rejection.parent.actor?.login, rejection.parent.triggering_actor?.login) || !await rejectedJobs(api, rejection)) return null;
  return { issue: Number(match[1]), runId: String(run.id), attempt: run.run_attempt, revision: run.head_sha, commentId: Number(match[2]) };
}

// A changed ref never admits work; only a terminal native job inventory can establish skipped effects.
export async function observeAdmissionRejection(api, repository, owner, rejection, issue, comments) {
  const { dispatch, parent, run } = rejection, request = dispatch.request;
  const base = { issue: issue.number, worker: request.worker ?? request.stage, runId: String(run.id), rootId: request.recovery?.rootId ?? request.id, attempt: request.recovery?.attempt ?? 0, outcome: 'failed', admissionRejected: true, dispatch, run };
  const result = (state, code, nextAction = stop, extra = {}) => ({ ...base, state, code, nextAction, ...extra });
  const jobs = await rejectedJobs(api, rejection);
  if (!jobs) return result('uncertain', 'admission-effects-unconfirmed');
  const confirmed = extra => result('blocked', 'admission-authority-changed', stop, { confirmed: true, jobs, ...extra });
  if (request.recovery) return result('exhausted', 'admission-retry-exhausted', stop, { confirmed: true, jobs });
  if (request.stage !== 'review' || request.worker || request.handoff || request.completionRecovery || !request.admissionBinding || !isBotContinuation(request.event, parent.event, parent.actor?.login, parent.triggering_actor?.login)) return confirmed();
  if (!['open', 'closed'].includes(issue.state) || issue.state_reason === 'not_planned' || issue.user?.login !== owner || issue.pull_request || issue.labels.some(label => ['future', 'human-working', 'agent-working', 'needs-info', 'waiting-review'].includes(label.name)) || comments.some(comment => Number(comment.id) > dispatch.commentId && comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && comment.body?.includes('<!-- lighthouse-dispatch:'))) return confirmed();
  try {
    const repo = await api(''), revision = (await api(`commits/${encodeURIComponent(repo.default_branch)}`)).sha;
    if (request.ref !== repo.default_branch || request.sourceRevision !== request.workflowRevision || !/^[a-f0-9]{40}$/.test(revision)) return confirmed();
    // Conservative bound: automatic rebasing permits documentation alone, never product definitions or executable policy.
    const comparison = await api(`compare/${request.sourceRevision}...${revision}`);
    const config = await api(`contents/.product/config.yaml?ref=${revision}`, 'GET', undefined, true);
    if (config && (config.encoding !== 'base64' || !Number.isSafeInteger(config.size) || config.size > 96000)) return confirmed();
    const productRoot = productModelDirectoryFromConfig(config ? Buffer.from(config.content, 'base64').toString('utf8') : '').replace(/\/model$/, '');
    const documentation = path => typeof path === 'string' && (path === 'README.md' || path.startsWith('docs/') && !path.startsWith('docs/product/') && path !== productRoot && !path.startsWith(`${productRoot}/`)) && !/(^|\/)(AGENTS|CLAUDE)\.md$/.test(path);
    if (!['ahead', 'identical'].includes(comparison.status) || comparison.base_commit?.sha !== request.sourceRevision || comparison.merge_base_commit?.sha !== request.sourceRevision || !Number.isSafeInteger(comparison.total_commits) || comparison.total_commits > 250 || !Array.isArray(comparison.files) || comparison.files.length >= 300 || comparison.files.some(file => !documentation(file.filename) || file.previous_filename && !documentation(file.previous_filename))) return confirmed();
    const ci = await api(`actions/runs/${request.event.inputs.after_run}`);
    const next = await deliveryAfterChecks(api, repository, owner, { action: 'completed', workflow_run: { id: ci.id, head_sha: ci.head_sha } });
    const { stage, ...authorization } = next ?? {};
    if (stage !== 'review' || !same(authorization, request.completionAuthorization)) return confirmed();
    const current = await inspectCompletion(api, repository, owner, request.completionAuthorization, 'review');
    assertChecks(current);
    if (current.currentRevision !== revision || !same(current.binding, request.admissionBinding) || digest(JSON.stringify(current.pullRequest.reviews)) !== request.admissionReviewsDigest || (await postMergeRuns(api, current, current.merge)).some(check => check.status !== 'passed')) return confirmed();
    return result('retryable', 'workflow-revision-rejected', 'Record one linked review retry at the current default revision; reuse the original merge, CI and product apply.', { confirmed: true, jobs, revision, workflowRevision: revision });
  } catch { return confirmed(); }
}

export async function reconcileAdmissionRejection(api, repository, observation) {
  if (!observation.confirmed) return;
  const { dispatch, run } = observation;
  const receipt = readDispatchReceipt(await api(`issues/comments/${dispatch.commentId}`), repository, dispatch.request.issue);
  if (receipt.digest !== dispatch.receipt.digest || receipt.workerRunId && String(receipt.workerRunId) !== String(run.id)) throw Error('Rejected dispatch receipt changed');
  receipt.workerRunId = String(run.id); receipt.status = 'failed';
  receipt.admissionRejected = { code: 'workflow-revision-rejected', attempt: run.run_attempt, expectedRevision: dispatch.request.workflowRevision, observedRevision: run.head_sha, recovery: observation.code, nextAction: observation.nextAction };
  if (same(receipt, dispatch.receipt)) return;
  await api(`issues/comments/${dispatch.commentId}`, 'PATCH', { body: dispatchReceiptBody(repository, receipt) });
  dispatch.receipt = receipt;
}

export function admissionRetryRequest(observation, parent) {
  const { request } = observation.dispatch;
  const recovery = { kind: 'before-admission', rootId: observation.rootId, previousComment: observation.dispatch.commentId, attempt: 1, ...(observation.wake ? { wake: observation.wake } : {}) };
  const next = { ...request, id: digest(`${request.repository}:${recovery.rootId}:retry:1`), sourceRevision: observation.revision, workflowRevision: observation.revision, routerRunId: String(parent.id), routerAttempt: parent.run_attempt, routerRevision: parent.head_sha, routerRef: parent.head_branch, routerEventName: parent.event, recovery };
  next.intent = dispatchIntent(next);
  return next;
}

export async function verifyAdmissionRecovery(api, repository, owner, dispatch, parent, readArtifact, revalidate = false) {
  const request = dispatch.request, retry = request.recovery;
  if (parent.path !== '.github/workflows/lighthouse-worker-maintenance.yml' || retry.attempt !== 1 || !/^[1-9][0-9]*$/.test(String(retry.previousComment))) throw Error('Invalid before-admission recovery');
  const comment = await api(`issues/comments/${retry.previousComment}`), receipt = readDispatchReceipt(comment, repository, request.issue);
  if (!receipt.workerRunId || !receipt.admissionRejected || receipt.status !== 'failed') throw Error('Original rejection is unconfirmed');
  const run = await api(`actions/runs/${receipt.workerRunId}`);
  let rejection;
  try { await loadDispatch(api, repository, owner, request.issue, comment.id, run, readArtifact); }
  catch (error) { rejection = error.rejection; }
  if (!rejection || rejection.dispatch.request.recovery || retry.rootId !== rejection.dispatch.request.id || run.path !== stagePath('review')) throw Error('Invalid original admission rejection');
  if (!await rejectedJobs(api, rejection)) throw Error('Original admission rejection effects are unconfirmed');
  let wake;
  if (parent.event === 'workflow_run') {
    wake = { issue: request.issue, runId: String(run.id), attempt: run.run_attempt, revision: run.head_sha, commentId: Number(comment.id) };
    if (![owner, 'github-actions[bot]'].includes(parent.actor?.login) || parent.triggering_actor?.login !== parent.actor?.login || !same(retry.wake, wake)) throw Error('Invalid admission completion wake');
  } else if (retry.wake !== undefined) throw Error('Unexpected admission completion wake');
  const expected = admissionRetryRequest({ dispatch: rejection.dispatch, rootId: retry.rootId, revision: request.sourceRevision, wake }, parent);
  if (!same(request, expected)) throw Error('Before-admission recovery authorization changed');
  if (!revalidate) return;
  const issue = await api(`issues/${request.issue}`);
  const comments = await (await import('./stage-dispatch.mjs')).issueComments(api, request.issue);
  // The current retry is allowed; any other newer dispatch supersedes the original request.
  const originalComments = comments.filter(item => item.id !== dispatch.commentId);
  const observation = await observeAdmissionRejection(api, repository, owner, rejection, issue, originalComments);
  observation.wake = wake;
  if (observation.state !== 'retryable' || !same(request, admissionRetryRequest(observation, parent))) throw Error('Before-admission recovery authority changed');
}
