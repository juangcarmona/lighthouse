import { digest } from './digests.mjs';
import { validateStageEnvelope } from './host-contract.mjs';
import { loadStageReport } from './proposal.mjs';
import { checkImplementationPullRequest } from './proposal-review.mjs';
import { loadImplementation, validateCheckReceipt } from './implementation.mjs';
import { dispatchDeliveryChecks, ciFailureSummary, ciRequestFailure } from './delivery-events.mjs';
import { issueComments } from './stage-dispatch.mjs';
import { readActionsJson } from './actions-artifact.mjs';
import { handoff } from './handoff.mjs';

// Resume verification of a confirmed publication; never replay the agent or branch write.
export async function reconcilePublishedCi(api, repository, owner, issue, comments, observation, parent, enabled, now = Date.now(), { readArtifact = readActionsJson, readReport = loadStageReport, save = null, ciTrigger = null } = {}) {
  const { dispatch, run, revision } = observation;
  if (issue.user?.login !== owner) return null;
  if (!dispatch || dispatch.request.stage !== 'implement' || run?.status !== 'completed' || run.conclusion !== 'success' || run.run_attempt !== 1) return null;
  const report = [...comments].reverse().find(comment => comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && comment.body?.includes(`"run":${run.id}`) && comment.body.includes('<!-- lighthouse-pr-state:'));
  if (!report) return null;
  const proofs = [...report.body.matchAll(/<!-- lighthouse-pr-state:(\{[^\n]*\}) -->/g)];
  if (proofs.length !== 1) return null;
  const proof = JSON.parse(proofs[0][1]);
  if (proof.complete !== true || proof.run !== Number(run.id)) return null;
  const subject = { pr: proof.pr, head: proof.head };
  const stopped = (code, nextAction) => ({ ...subject, state: 'uncertain', code, nextAction });
  const retained = await readReport(api, repository, report, { issue: issue.number, owner }, readArtifact);
  const request = retained.request;
  if (String(request.workflowRunId) !== String(run.id) || request.stage !== 'implement' || retained.envelope.result.status !== 'passed' || validateStageEnvelope(retained.envelope, request).length) return stopped('publication-unconfirmed', 'Inspect the original publication and validated outcome.');
  const published = await readArtifact(api, repository, run.id, `lighthouse-implement-publication-${issue.number}-${run.run_attempt}`, 'published-pr.json', true);
  if (published?.number !== proof.pr || published.head !== proof.head) return stopped('publication-unconfirmed', 'Restore the original authenticated publication receipt before recovery.');
  const pr = await api(`pulls/${proof.pr}`), target = checkImplementationPullRequest(pr, repository);
  if (target.issue !== issue.number || pr.head.sha !== proof.head || issue.state !== 'open' || issue.labels.some(label => ['agent-working', 'human-working', 'future', 'needs-info', 'waiting-review'].includes(label.name))) return null;
  const reviewCurrent = async () => {
    const reviews = await api(`pulls/${pr.number}/reviews?per_page=100`);
    if (reviews.length >= 100) throw Error('Publication recovery review lookup exceeds bounds');
    const decision = reviews.filter(item => item.user?.login === owner && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(item.state)).sort((a, b) => b.id - a.id)[0];
    if (decision && decision.state !== 'APPROVED') throw Error('Owner review requires resolution before CI recovery');
  };
  await reviewCurrent();
  const answers = comments.filter(comment => comment.user?.login === owner && !/<!-- lighthouse-(?:run|actions):/.test(comment.body));
  const intent = digest(JSON.stringify({ title: issue.title, body: issue.body, comments: answers.map(comment => ({ id: comment.id, body: comment.body, updated_at: comment.updated_at })) }));
  const currentPolicy = await loadImplementation(api, issue.number, owner, revision, pr.base.ref);
  if (request.taskDigest !== intent || JSON.stringify(request.implementation) !== JSON.stringify(currentPolicy)) return stopped('authority-changed', 'Request fresh verification under the current owner intent and implementation policy.');
  const changes = await readArtifact(api, repository, run.id, `lighthouse-implement-result-${issue.number}-${run.run_attempt}`, 'changes.json');
  const checks = await readArtifact(api, repository, run.id, `lighthouse-implement-result-${issue.number}-${run.run_attempt}`, 'checks.json');
  if (!validateCheckReceipt(checks, request, changes)) return stopped('checks-unconfirmed', 'Resolve the retained host-check failure before CI recovery.');
  if (comments.some(comment => comment.user?.login === 'github-actions[bot]' && comment.body?.includes(`<!-- lighthouse-pr-hold:${pr.number}:${pr.head.sha} -->`))) return null;
  const prior = await readArtifact(api, repository, run.id, `lighthouse-implement-publication-${issue.number}-${run.run_attempt}`, 'ci-requests.json', true);
  if (!Array.isArray(prior)) return stopped('ci-request-evidence-missing', 'The legacy CI request has no retained send-state proof. Reconcile its effects before an explicit owner verification request.');
  if (!enabled) return { ...subject, state: 'observed', code: 'ci-recovery-disabled', nextAction: 'Enable bounded recovery explicitly to reconcile the retained CI request.' };
  if (!save) return stopped('recovery-evidence-unavailable', 'Retain native recovery evidence before requesting CI.');
  const key = digest(JSON.stringify({ pr: pr.number, head: pr.head.sha, origin: String(run.id) }));
  const pattern = new RegExp(`<!-- lighthouse-ci-recovery:${key}:(\\{[^\\n]*\\}) -->`);
  const freshComments = await issueComments(api, issue.number);
  const matches = freshComments.filter(comment => comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && pattern.test(comment.body));
  if (matches.length > 1) return stopped('ci-recovery-ambiguous', 'Reconcile duplicate recovery receipts before another CI request.');
  let comment = matches[0], previous = prior;
  if (comment) {
    const previousState = JSON.parse(comment.body.match(pattern)[1]);
    const origin = await api(`actions/runs/${previousState.maintenance}/attempts/${previousState.maintenanceAttempt}`);
    if (origin.path !== '.github/workflows/lighthouse-worker-maintenance.yml' || origin.repository?.full_name !== repository || !['schedule', 'workflow_dispatch'].includes(origin.event) || origin.actor?.login !== owner || origin.triggering_actor?.login !== owner || origin.status !== 'completed' || previousState.origin !== String(run.id)) return stopped('ci-recovery-unconfirmed', 'Reconcile the original native maintenance execution before another effect.');
    const retainedState = await readArtifact(api, repository, origin.id, `lighthouse-recovery-effects-${issue.number}-${origin.run_attempt}`, 'ci-recovery.json');
    if (JSON.stringify(retainedState) !== JSON.stringify(previousState)) return stopped('ci-recovery-unconfirmed', 'The native recovery artifact does not bind this request state.');
    previous = previousState.requests;
  }
  // Legacy receipts contained arbitrary exception messages; do not republish them.
  previous = previous.map(({ error, ...request }) => ({ ...request, ...(error?.schemaVersion === 1 ? { error: ciRequestFailure({ status: error.status, name: error.exception }, pr, error) } : {}) }));
  const state = { origin: String(run.id), maintenance: String(parent.id), maintenanceAttempt: parent.run_attempt, requests: previous };
  const body = () => handoff({ status: state.requests.some(item => ['unknown', 'requested', 'rejected'].includes(item.state)) ? 'blocked' : state.requests.every(item => item.state === 'observed') ? 'completed' : 'queued', stage: 'implement', happened: 'Reconciling CI for the retained candidate without rerunning its agent.', action: 'None. Follow the linked candidate and retained request state.', next: 'Only confirmed unsent or rejected requests may be retried within the existing delay and budget.', link: `[PR #${pr.number}](${pr.html_url})`, details: `<!-- lighthouse-ci-recovery:${key}:${JSON.stringify(state)} -->` });
  await save(state);
  if (!comment) comment = await api(`issues/${issue.number}/comments`, 'POST', { body: body() });
  const checkpoint = async requests => {
    const current = await api(`pulls/${pr.number}`), currentIssue = await api(`issues/${issue.number}`), latest = await issueComments(api, issue.number);
    if (current.head.sha !== pr.head.sha || current.state !== 'open' || currentIssue.state !== 'open' || currentIssue.labels.some(label => ['agent-working', 'human-working', 'future', 'needs-info', 'waiting-review'].includes(label.name)) || latest.some(item => item.user?.login === 'github-actions[bot]' && item.body?.includes('<!-- lighthouse-dispatch:') && Number(item.id) > dispatch.commentId)) throw Error('Publication recovery authority or candidate changed');
    const latestAnswers = latest.filter(item => item.user?.login === owner && !/<!-- lighthouse-(?:run|actions):/.test(item.body));
    if (intent !== digest(JSON.stringify({ title: currentIssue.title, body: currentIssue.body, comments: latestAnswers.map(item => ({ id: item.id, body: item.body, updated_at: item.updated_at })) }))) throw Error('Publication recovery owner intent changed');
    if ((await api(`commits/${pr.base.ref}`)).sha !== revision) throw Error('Publication recovery source changed');
    await reviewCurrent();
    state.requests = requests;
    await save(state);
    await api(`issues/comments/${comment.id}`, 'PATCH', { body: body() });
  };
  try {
    const result = await dispatchDeliveryChecks(api, revision, pr, { previous, checkpoint, now, ciTrigger });
    return { ...subject, state: 'reconciled', code: result.every(item => item.state === 'observed') ? 'ci-observed' : 'ci-requested', nextAction: 'Follow the existing candidate CI; no agent or source effect was repeated.' };
  } catch (error) {
    const failure = error.ciRequestFailure;
    const state = failure?.code === 'budget-exhausted' ? 'exhausted' : failure?.code === 'delay-pending' ? 'delayed' : 'uncertain';
    return { ...stopped('ci-start-unconfirmed', failure ? ciFailureSummary(failure) : 'Maintainer: inspect the retained CI request and current authority before any resend.'), state };
  }
}
