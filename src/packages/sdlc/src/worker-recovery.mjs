import { digest, validateStageEnvelope } from './host-contract.mjs';
import { issueComments, readDispatchReceipt, loadDispatch, workerFor, stagePath, recordDispatch, checkDispatchClaim } from './stage-dispatch.mjs';
import { publishObservedStop, handoff, pendingQuestion, resultHandoffState, visibleNextAction } from './handoff.mjs';
import { readActionsJson } from './actions-artifact.mjs';

export const maintenancePath = '.github/workflows/lighthouse-worker-maintenance.yml';
export const retryLimit = 2;
export const retryDelayMs = 30 * 60 * 1000;
export const recoveryId = (repository, rootId, attempt) => digest(`${repository}:${rootId}:retry:${attempt}`);
const identity = r => ({ issue: r.request.issue, worker: workerFor(r.request), runId: String(r.run.id), rootId: r.request.recovery?.rootId ?? r.request.id, attempt: r.request.recovery?.attempt ?? 0 });
const ownerAnswers = comments => comments.filter(c => c.user?.login === c.owner && !c.body.includes('<!-- lighthouse-run:') && !c.body.includes('<!-- lighthouse-actions:'));
const intent = (issue, comments, owner) => digest(JSON.stringify({ title: issue.title, body: issue.body, comments: ownerAnswers(comments.map(c => ({ ...c, owner }))).map(c => ({ id: c.id, body: c.body, updated_at: c.updated_at })) }));

export function recoveryDecision({ request, receipt, run, jobs, issue, comments, owner, revision, workflowRevision, now = Date.now() }) {
  const base = identity({ request, run });
  const result = (state, code, nextAction, extra = {}) => ({ ...base, state, code, nextAction, ...extra });
  if (run.status !== 'completed') {
    const updated = Date.parse(run.updated_at);
    if (Number.isFinite(updated) && now - updated >= 2 * 60 * 60 * 1000) return result('stalled', 'worker-stalled', 'Inspect the runner and current execution; maintenance never cancels or duplicates active work.');
    return result('active', 'worker-active', 'Inspect the current Actions execution; do not start another.');
  }
  if (run.run_attempt !== 1) return result('uncertain', 'execution-rerun', 'Inspect all attempts; a rerun does not reclaim the original request.');
  if (String(receipt.workerRunId) !== String(run.id)) return result('uncertain', 'dispatch-unconfirmed', 'Reconcile the request with the observed execution.');
  if (receipt.status === 'waiting') return result('waiting-human', 'human-decision', 'Answer the recorded question; no automatic retry.');
  if (receipt.status === 'blocked') return result('blocked', 'stage-blocked', 'Resolve the recorded blocker before requesting an authorized continuation.');
  if (receipt.status === 'completed' && run.conclusion === 'success') return result('succeeded', 'worker-completed', 'No recovery needed.');
  if (issue.state !== 'open' || issue.user?.login !== owner || issue.pull_request || issue.labels.some(l => ['future', 'needs-info', 'waiting-review', 'human-working', 'agent-working'].includes(l.name))) return result('blocked', 'issue-paused', 'Inspect the issue decision or reservation before requesting work.');
  if (request.sourceRevision !== revision || request.workflowRevision !== workflowRevision || request.taskDigest !== intent(issue, comments, owner)) return result('blocked', 'authority-changed', 'Request fresh work against the current source and owner intent.');
  if (!['refine', 'propose', 'implement'].includes(request.stage) || !['failure', 'timed_out'].includes(run.conclusion)) return result('uncertain', 'manual-recovery', 'Inspect the outcome and request a new authorized execution if needed.');
  const preparation = jobs.find(j => j.name === 'Authorize and reserve issue');
  const publication = jobs.find(j => j.name === 'Validate, publish and release');
  const publishStep = publication?.steps?.find(s => s.name === 'Recheck authority and publish the validated result');
  const failedExecution = jobs.some(j => ['pre_activation', 'activation', 'agent'].includes(j.name) && ['failure', 'timed_out'].includes(j.conclusion));
  if (preparation?.conclusion !== 'success' || !failedExecution || publishStep?.conclusion !== 'skipped') return result('uncertain', 'publication-uncertain', 'Inspect publication and remote effects before creating another request.');
  if (base.attempt >= retryLimit) return result('exhausted', 'worker-technical-failure', 'Retry budget exhausted. Inspect the failure and make a new owner decision.');
  const ended = Date.parse(run.updated_at);
  if (!Number.isFinite(ended) || !Number.isFinite(now)) return result('uncertain', 'execution-time-unknown', 'Inspect the execution timestamps.');
  const retryAt = new Date(ended + retryDelayMs).toISOString();
  if (now < ended + retryDelayMs) return result('delayed', 'worker-technical-failure', 'Wait until the recovery delay has elapsed.', { retryAt });
  return result('retryable', 'worker-technical-failure', 'Record one linked retry under the adopted policy.', { retryAt });
}

export async function observeDispatch(api, repository, owner, comment, issue, comments, now = Date.now(), readArtifact = readActionsJson) {
  const receipt = readDispatchReceipt(comment, repository, issue.number);
  if (!receipt.workerRunId) {
    // A visible matching run helps the operator reconcile; absence is never permission to resend.
    const found = await api(`actions/workflows/${stagePath(workerFor(receipt)).split('/').at(-1)}/runs?event=workflow_dispatch&per_page=100`);
    const matches = found.workflow_runs.filter(r => r.display_title === `${workerFor(receipt)} #${issue.number} · request ${comment.id}`);
    let observedRunId;
    if (matches.length === 1 && found.total_count <= 100) {
      const run = await api(`actions/runs/${matches[0].id}`);
      await loadDispatch(api, repository, owner, issue.number, comment.id, run, readArtifact);
      observedRunId = String(run.id);
    }
    return { issue: issue.number, worker: workerFor(receipt), rootId: receipt.recovery?.rootId ?? receipt.id, attempt: receipt.recovery?.attempt ?? 0, state: 'uncertain', code: 'dispatch-unconfirmed', nextAction: 'Inspect the request and matching Actions execution; never resend an unconfirmed dispatch.', ...(observedRunId ? { observedRunId } : {}) };
  }
  const run = await api(`actions/runs/${receipt.workerRunId}`);
  const dispatch = await loadDispatch(api, repository, owner, issue.number, comment.id, run, readArtifact);
  const jobs = await api(`actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`);
  if (jobs.total_count > 100) throw Error('Execution job inventory exceeds recovery bounds');
  const repo = await api('');
  const revision = (await api(`commits/${encodeURIComponent(repo.default_branch)}`)).sha;
  const workflowRevision = (await api(`commits/${encodeURIComponent(dispatch.request.ref)}`)).sha;
  const agent = jobs.jobs.find(job => job.name === 'agent');
  const publishJob = jobs.jobs.find(job => job.name === 'Validate, publish and release');
  const publish = publishJob?.steps?.find(step => step.name === 'Recheck authority and publish the validated result');
  const prepare = jobs.jobs.find(job => job.name === 'Authorize and reserve issue');
  const unpublished = publish?.conclusion === 'skipped' || publishJob?.conclusion === 'skipped';
  const notStarted = !agent || agent.conclusion === 'skipped';
  const activationFailed = jobs.jobs.some(job => ['pre_activation', 'activation'].includes(job.name) && ['failure', 'timed_out'].includes(job.conclusion));
  const observation = ['completed', 'waiting', 'blocked'].includes(receipt.status) ? null
    : agent?.conclusion === 'success' && ['failure', 'timed_out', 'cancelled'].includes(publish?.conclusion) ? 'publication-unknown'
    : ['failure', 'timed_out'].includes(prepare?.conclusion) && notStarted ? 'preparation-failure'
    : prepare?.conclusion === 'success' && activationFailed && notStarted && unpublished ? 'activation-failure'
    : unpublished && ['failure', 'timed_out'].includes(agent?.conclusion) ? 'failure'
    : unpublished && agent?.conclusion === 'cancelled' ? 'cancelled'
    : run.conclusion === 'cancelled' && notStarted && (unpublished || !publishJob) ? 'pre-agent-cancelled' : null;
  const event = dispatch.request.event;
  const answered = dispatch.request.eventName === 'issue_comment' && event?.action === 'created' && event.issue?.number === issue.number && !event.issue.pull_request && event.comment?.user?.login === owner && event.comment.user.type === 'User' && typeof event.comment.body === 'string' && !!event.comment.body.trim() && !dispatch.request.feedbackKey;
  const stop = run.status === 'completed' && observation ? { run: String(run.id), attempt: String(run.run_attempt), observation, answerRetained: answered } : null;
  return { ...recoveryDecision({ ...dispatch, run, jobs: jobs.jobs, issue, comments, owner, revision, workflowRevision, now }), dispatch, stop, run, revision, workflowRevision };
}

// Restore only a completed, read-only stage whose authority and label still match.
export async function reconcilePublishedStage(api, repository, owner, issue, comments, observation, readArtifact = readActionsJson) {
  const { dispatch, run, revision, workflowRevision } = observation;
  if (!dispatch || !run) return 'not-applicable';
  if (run.status !== 'completed' || run.conclusion !== 'success' || run.run_attempt !== 1 || !['triage', 'refine'].includes(dispatch.request.stage) || dispatch.request.worker || !['completed', 'waiting'].includes(dispatch.receipt.status)) return 'not-applicable';
  const id = digest(`${repository}:${issue.number}:${dispatch.request.stage}:${run.id}:${run.run_attempt}`);
  const marker = `<!-- lighthouse-actions:${id} -->`;
  if (comments.some(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body?.includes(marker))) return 'present';
  if (issue.state !== 'open' || issue.pull_request || issue.user?.login !== owner || issue.labels.some(l => ['agent-working', 'human-working', dispatch.request.stage].includes(l.name)) || dispatch.request.sourceRevision !== revision || dispatch.request.workflowRevision !== workflowRevision || dispatch.request.taskDigest !== intent(issue, comments, owner)) return 'uncertain';
  let snapshot, envelope;
  try {
    snapshot = await readArtifact(api, repository, run.id, `lighthouse-input-${issue.number}-${run.run_attempt}`, 'request.json');
    envelope = await readArtifact(api, repository, run.id, `lighthouse-result-${issue.number}-${run.run_attempt}`, 'envelope.json');
  } catch { return 'uncertain'; }
  if (snapshot?.runId !== id || snapshot.issue !== issue.number || snapshot.stage !== dispatch.request.stage || String(snapshot.workflowRunId) !== String(run.id) || snapshot.sourceRevision !== revision || snapshot.workflowRevision !== workflowRevision || snapshot.taskDigest !== dispatch.request.taskDigest || snapshot.autoImplement !== (dispatch.request.autoImplement === true) || snapshot.dispatch?.requestId !== dispatch.request.id || snapshot.dispatch?.digest !== dispatch.receipt.digest || snapshot.dispatch?.commentId !== dispatch.commentId || validateStageEnvelope(envelope, snapshot).length) return 'uncertain';
  const result = envelope.result;
  if (!['passed', 'blocked'].includes(result.status)) return 'uncertain';
  const question = result.status === 'blocked' ? pendingQuestion(result.output?.handoff?.question) : null;
  if ((dispatch.receipt.status === 'waiting') !== !!question || (dispatch.receipt.status === 'completed') !== (result.status === 'passed')) return 'uncertain';
  const projection = resultHandoffState({ status: result.status, stage: snapshot.stage, question });
  if (!projection.label || !issue.labels.some(l => l.name === projection.label) || issue.labels.some(l => ['ready', 'triaged', 'needs-info', 'waiting-review', 'execution-failed', 'pr-draft', 'pr-ready'].includes(l.name) && l.name !== projection.label)) return 'uncertain';
  let action = question ? `Owner: ${question} Reply here.` : 'None.';
  let next = question ? `The answer will be checked against this question before ${snapshot.stage} continues.` : 'Any continuation follows the configured authorization.';
  if (snapshot.stage === 'refine' && result.status === 'passed') {
    const paused = issue.labels.some(l => l.name === 'future');
    action = !snapshot.autoImplement ? 'Owner: review the refinement and request the next authorized stage through the configured workflow.' : paused ? 'Owner: remove the future label when implementation may resume.' : 'None.';
    next = !snapshot.autoImplement ? 'No automatic continuation is configured for this refinement.' : paused ? 'The workflow will recheck the authorized implementation request.' : 'The workflow will request implementation under the configured continuation policy; the owner can pause it with the future label.';
  } else if (result.status === 'blocked' && !question) action = visibleNextAction(result.nextAction);
  const body = handoff({ status: projection.status, stage: snapshot.stage, happened: `A previous handoff was restored from retained execution evidence.\n\n${envelope.effect.body}`, action, next, details: `Outcome: ${result.status}\n\n[Workflow run](https://github.com/${repository}/actions/runs/${run.id}) · source \`${snapshot.sourceRevision}\`\n\n${marker}\n<!-- lighthouse-handoff:v1 -->\n<!-- lighthouse-stage:${snapshot.stage}:${result.status} -->${question ? '\n<!-- lighthouse-question -->' : ''}` });
  await checkDispatchClaim(api, repository, issue.number, { commentId: dispatch.commentId, requestId: dispatch.request.id, digest: dispatch.receipt.digest }, run.id);
  await api(`issues/${issue.number}/comments`, 'POST', { body });
  return 'restored';
}

// Called again by the worker, before claiming a maintenance-created retry.
export async function verifyRecoveryOrigin(api, repository, owner, dispatch, parent, readArtifact, depth, revalidate = false) {
  const r = dispatch.request, retry = r.recovery;
  if (parent.path !== maintenancePath || !retry || !Number.isSafeInteger(retry.attempt) || retry.attempt < 1 || retry.attempt > retryLimit || !/^[1-9][0-9]*$/.test(String(retry.previousComment))) throw Error('Invalid recovery origin');
  const comment = await api(`issues/comments/${retry.previousComment}`);
  const receipt = readDispatchReceipt(comment, repository, r.issue);
  if (!receipt.workerRunId) throw Error('Cannot recover unconfirmed dispatch');
  const priorRun = await api(`actions/runs/${receipt.workerRunId}`);
  const prior = await loadDispatch(api, repository, owner, r.issue, comment.id, priorRun, readArtifact, depth + 1);
  if (retry.rootId !== (prior.request.recovery?.rootId ?? prior.request.id) || retry.attempt !== (prior.request.recovery?.attempt ?? 0) + 1) throw Error('Recovery chain or budget changed');
  const originalFields = value => Object.fromEntries(Object.entries(value).filter(([key]) => !['id', 'routerRunId', 'routerAttempt', 'routerRevision', 'routerRef', 'routerEventName', 'recovery'].includes(key)).sort(([a], [b]) => a.localeCompare(b)));
  if (JSON.stringify(originalFields(r)) !== JSON.stringify(originalFields(prior.request))) throw Error('Recovery changed the original authorization');
  if (!revalidate) return;
  const jobs = await api(`actions/runs/${priorRun.id}/attempts/${priorRun.run_attempt}/jobs?per_page=100`);
  if (jobs.total_count > 100) throw Error('Execution job inventory exceeds recovery bounds');
  const issue = await api(`issues/${r.issue}`), comments = await issueComments(api, r.issue), repo = await api('');
  const revision = (await api(`commits/${encodeURIComponent(repo.default_branch)}`)).sha;
  const workflowRevision = (await api(`commits/${encodeURIComponent(r.ref)}`)).sha;
  const decision = recoveryDecision({ ...prior, run: priorRun, jobs: jobs.jobs, issue, comments, owner, revision, workflowRevision });
  if (decision.state !== 'retryable') throw Error(`Recovery no longer authorized: ${decision.code}`);
}

export async function prepareRecovery(api, repository, owner, issueNumber, parent, enabled, now = Date.now(), readArtifact = readActionsJson) {
  const issue = await api(`issues/${issueNumber}`), comments = await issueComments(api, issueNumber);
  const entries = comments.filter(c => c.user?.login === 'github-actions[bot]' && c.body.includes('<!-- lighthouse-dispatch:')).map(comment => ({ comment, receipt: readDispatchReceipt(comment, repository, issueNumber) }));
  const latest = new Map();
  for (const entry of entries) latest.set(entry.receipt.recovery?.rootId ?? entry.receipt.id, entry);
  const observations = [];
  const currentRoot = entries.at(-1)?.receipt.recovery?.rootId ?? entries.at(-1)?.receipt.id;
  for (const { comment } of latest.values()) {
    const observation = await observeDispatch(api, repository, owner, comment, issue, comments, now, readArtifact);
    const { dispatch, stop, run, revision, workflowRevision, ...publicObservation } = observation;
    if (observation.rootId === currentRoot) {
      const reconciliation = await reconcilePublishedStage(api, repository, owner, issue, comments, observation, readArtifact);
      if (reconciliation === 'uncertain') Object.assign(publicObservation, { state: 'uncertain', code: 'handoff-unconfirmed', nextAction: 'Inspect the retained result and current issue state before restoring its handoff.' });
    }
    observations.push(publicObservation);
    if (stop && observation.rootId === currentRoot) await publishObservedStop(api, { repository, issue: issueNumber, stage: dispatch.request.stage, ...stop, sourceRevision: dispatch.request.sourceRevision, dispatch: { commentId: dispatch.commentId, requestId: dispatch.request.id, digest: dispatch.receipt.digest } });
    if (observation.state !== 'retryable' || enabled !== true || observation.rootId !== currentRoot) continue;
    const attempt = observation.attempt + 1;
    const request = { ...dispatch.request, id: recoveryId(repository, observation.rootId, attempt), routerRunId: String(parent.id), routerAttempt: parent.run_attempt, routerRevision: parent.head_sha, routerRef: parent.head_branch, routerEventName: parent.event, recovery: { rootId: observation.rootId, previousComment: comment.id, attempt } };
    const recorded = await recordDispatch(api, repository, request);
    // One new retry per issue per maintenance execution, even if several historical roots failed.
    return { observations, ...(recorded.send ? { request, commentId: recorded.comment.id } : {}) };
  }
  return { observations };
}
