import { fingerprint, inspectCompletion, postMergeRuns } from './completion.mjs';
import { completionBundle, publishProcessBundle, readPublishedBundle } from './process-publication.mjs';
import { readIntegrationEvidence } from './integration-evidence.mjs';
import { digest, validateStageEnvelope } from './host-contract.mjs';
import { issueComments, loadDispatch, finishDispatch } from './stage-dispatch.mjs';
import { readActionsJson } from './actions-artifact.mjs';
import { handoff, pendingQuestion, visibleNextAction } from './handoff.mjs';

const stableBinding = binding => Object.fromEntries(['repository', 'issue', 'pr', 'head', 'intent', 'policy', 'reviews', 'prIntent', 'files'].map(key => [key, binding[key]]));

// A confirmed merge may need publication and review; it must never enter merge again.
export async function reconcileCompletion(api, repository, owner, issue, observation, parent, enabled, { readArtifact = readActionsJson, save = null, inspect = inspectCompletion, readIntegration = readIntegrationEvidence, publish = publishProcessBundle, postMerge = postMergeRuns, readPublication = readPublishedBundle } = {}) {
  const { dispatch, run } = observation;
  if (!dispatch || dispatch.request.stage !== 'integrate' || run.status !== 'completed' || run.run_attempt !== 1 || !['success', 'failure', 'timed_out'].includes(run.conclusion)) return null;
  if (observation.jobs?.find(job => job.name === 'agent')?.conclusion !== 'success') return null;
  const stopped = nextAction => ({ state: 'uncertain', code: 'completion-unconfirmed', nextAction });
  if (issue.state !== 'open' || issue.user?.login !== owner || issue.labels.some(label => ['agent-working', 'human-working', 'future', 'waiting-review'].includes(label.name))) return null;
  const request = await readArtifact(api, repository, run.id, `lighthouse-input-${issue.number}-${run.run_attempt}`, 'request.json');
  const envelope = await readArtifact(api, repository, run.id, `lighthouse-result-${issue.number}-${run.run_attempt}`, 'envelope.json');
  const receipt = await readArtifact(api, repository, run.id, `lighthouse-completion-${issue.number}-${run.run_attempt}`, 'integration-receipt.json', true);
  const id = fingerprint({ repository, stage: 'integrate', issue: issue.number, run: String(run.id), attempt: String(run.run_attempt) });
  if (request.runId !== id || String(request.workflowRunId) !== String(run.id) || request.stage !== 'integrate' || request.dispatch?.requestId !== dispatch.request.id || request.dispatch?.digest !== dispatch.receipt.digest || request.dispatch?.commentId !== dispatch.commentId || request.taskDigest !== dispatch.request.taskDigest || validateStageEnvelope(envelope, request).length) return stopped('The original integration assessment is missing or does not match its authenticated request.');
  if (envelope.result.status === 'blocked') {
    if (!enabled || !receipt || !['blocked', 'merged-review-blocked'].includes(receipt.state)) return null;
    const fresh = await inspect(api, repository, owner, request.authorization, 'integrate');
    if (fingerprint(stableBinding(fresh.binding)) !== fingerprint(stableBinding(request.completion.binding))) return stopped('The retained blocked outcome no longer matches current authority.');
    const publication = await readArtifact(api, repository, run.id, `lighthouse-completion-${issue.number}-${run.run_attempt}`, 'publication-receipt.json');
    const retained = await readPublication(api, { ...request, completion: { ...request.completion, merged: fresh.merged } }, completionBundle({ ...request, completion: { ...request.completion, merged: fresh.merged } }, envelope, receipt), publication);
    const marker = `<!-- lighthouse-completion:${request.runId} -->`, question = pendingQuestion(envelope.result.output?.handoff?.question);
    const body = handoff({ status: question ? 'question' : 'blocked', stage: 'integrate', happened: envelope.effect.body, action: question ? `Owner: ${question} Reply on the issue.` : visibleNextAction(envelope.result.nextAction), next: 'Work remains stopped until the blocker is resolved and continuation is authorized.', link: `[Report and retrospective](${retained.url})`, details: `[Original execution](${request.runUrl})\n\n${marker}` });
    for (const target of new Set([issue.number, request.authorization.pr])) {
      const currentIssue = await api(`issues/${issue.number}`), currentComments = await issueComments(api, issue.number);
      const current = await inspect(api, repository, owner, request.authorization, 'integrate');
      if (currentIssue.state !== 'open' || currentIssue.labels.some(label => ['agent-working', 'human-working', 'future', 'waiting-review'].includes(label.name)) || currentComments.some(comment => comment.user?.login === 'github-actions[bot]' && comment.body?.includes('<!-- lighthouse-dispatch:') && Number(comment.id) > dispatch.commentId) || fingerprint(stableBinding(current.binding)) !== fingerprint(stableBinding(fresh.binding))) throw Error('Blocked handoff recovery was superseded or paused');
      const comments = target === issue.number ? currentComments : await issueComments(api, target);
      if (!comments.some(comment => comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && comment.body?.includes(marker))) await api(`issues/${target}/comments`, 'POST', { body });
    }
    await finishDispatch(api, repository, issue.number, dispatch.commentId, run.id, 'blocked');
    return { state: 'reconciled', code: 'blocked-handoff-restored', nextAction: 'The original blocker remains; no continuation was authorized.' };
  }
  if (envelope.result.status !== 'passed' || issue.labels.some(label => label.name === 'needs-info')) return null;
  if (!receipt || receipt.state !== 'merged' || receipt.acceptedHead !== request.authorization.head || receipt.authorization?.merge !== true || fingerprint(receipt.authorization) !== fingerprint(request.authorization) || fingerprint(receipt.binding) !== fingerprint(request.completion.binding)) return stopped('No original confirmed merge receipt is available. Inspect the PR and original integration attempt; never repeat an uncertain merge.');
  const fresh = await inspect(api, repository, owner, request.authorization, 'integrate');
  if (!fresh.merged || fresh.merge !== receipt.sha || fingerprint(stableBinding(request.completion.binding)) !== fingerprint(stableBinding(fresh.binding))) return stopped('Accepted head, current owner intent, policy, discussion or confirmed merge changed.');
  const checks = await postMerge(api, fresh, receipt.sha);
  if (checks.some(check => check.status !== 'passed')) return { state: 'observed', code: 'post-merge-ci-pending', nextAction: 'Wait for the existing post-merge CI; recovery does not rerun it.' };
  if (!enabled || !save) return { state: 'observed', code: 'completion-recovery-disabled', nextAction: 'Enable scoped recovery explicitly before completing the retained publication.' };
  const recheck = async () => {
    const currentIssue = await api(`issues/${issue.number}`), comments = await issueComments(api, issue.number);
    if (currentIssue.state !== 'open' || currentIssue.labels.some(label => ['agent-working', 'human-working', 'future', 'needs-info', 'waiting-review'].includes(label.name)) || comments.some(comment => comment.user?.login === 'github-actions[bot]' && comment.body?.includes('<!-- lighthouse-dispatch:') && Number(comment.id) > dispatch.commentId)) throw Error('Completion recovery was superseded or paused');
    const current = await inspect(api, repository, owner, request.authorization, 'integrate');
    if (!current.merged || current.merge !== receipt.sha || fingerprint(stableBinding(current.binding)) !== fingerprint(stableBinding(fresh.binding)) || (await postMerge(api, current, receipt.sha)).some(check => check.status !== 'passed')) throw Error('Completion recovery authority or verification changed');
  };
  const prior = await readIntegration(api, fresh, null, { interruptedRun: String(run.id), readArtifact });
  let publication = prior?.workflow.conclusion === 'success' || prior?.workflow.recovery ? { commit: prior.commit, url: prior.url } : null;
  if (!publication) {
    const recoveredReceipt = { ...receipt, postMerge: checks };
    const recovered = { ...request, workflowRunId: String(parent.id), attempt: String(parent.run_attempt), completion: { ...request.completion, merged: true }, recoveryPublication: { runId: String(run.id), attempt: String(run.run_attempt), url: request.runUrl, revision: parent.head_sha } };
    const files = completionBundle(recovered, envelope, recoveredReceipt);
    publication = await publish(api, recovered, files, recheck);
    const proof = { schemaVersion: 1, issue: issue.number, originalRun: String(run.id), originalAttempt: run.run_attempt, recordSha256: digest(files['evidence-record.json']), receiptDigest: fingerprint(recoveredReceipt), publication };
    await save(proof);
  } else {
    await save({ schemaVersion: 1, issue: issue.number, originalRun: String(run.id), originalAttempt: run.run_attempt, recordSha256: prior.recordSha256, receiptDigest: fingerprint(prior.receipt), publication });
  }
  await recheck();
  const marker = `<!-- lighthouse-completion:${request.runId} -->`;
  const body = handoff({ status: 'completed', stage: 'integrate', happened: 'The confirmed integration publication was reconciled from its original assessment and merge receipt. No merge, agent execution, source edit or CI run was repeated.', action: 'None.', next: 'The existing passed post-merge CI can resume the authorized review.', link: `[Report and retrospective](${publication.url})`, details: `[Original execution](${request.runUrl})\n\n${marker}` });
  for (const target of new Set([issue.number, request.authorization.pr])) {
    const comments = await issueComments(api, target);
    if (!comments.some(comment => comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && comment.body?.includes(marker))) { await recheck(); await api(`issues/${target}/comments`, 'POST', { body }); }
  }
  await recheck();
  await finishDispatch(api, repository, issue.number, dispatch.commentId, run.id, 'passed');
  return { state: 'reconciled', code: 'completion-restored', nextAction: 'Review resumes from the retained original grant and existing green CI.', review: { issue: issue.number, ciRun: checks[0]?.runId, publication: publication.url } };
}

export async function recoveredCompletionEvent(api, repository, owner, run, issue, readArtifact = readActionsJson) {
  if (run.path !== '.github/workflows/lighthouse-worker-maintenance.yml' || run.repository?.full_name !== repository || run.status !== 'completed' || run.conclusion !== 'success' || run.actor?.login !== owner || run.triggering_actor?.login !== owner || !['schedule', 'workflow_dispatch'].includes(run.event)) throw Error('Completion recovery lacks a successful owner maintenance origin');
  const proof = await readArtifact(api, repository, run.id, `lighthouse-recovery-effects-${issue}-${run.run_attempt}`, 'completion-recovery.json');
  if (proof?.issue !== issue || proof.schemaVersion !== 1) throw Error('Recovered completion subject differs from its native artifact');
  const original = await api(`actions/runs/${proof.originalRun}`);
  const request = await readArtifact(api, repository, original.id, `lighthouse-input-${issue}-${proof.originalAttempt}`, 'request.json');
  await loadDispatch(api, repository, owner, issue, request.dispatch.commentId, original, readArtifact);
  const current = await inspectCompletion(api, repository, owner, request.authorization, 'review');
  const retained = await readIntegrationEvidence(api, current, null, { readArtifact });
  if (!retained || retained.recordSha256 !== proof.recordSha256) throw Error('Recovered completion does not bind the current retained integration');
  const checks = await postMergeRuns(api, current, current.merge);
  if (checks.some(check => check.status !== 'passed') || !checks[0]?.runId) throw Error('Recovered completion has no current passed post-merge CI');
  const ci = await api(`actions/runs/${checks[0].runId}`);
  return { action: 'completed', workflow_run: ci, completionAuthorization: { issue, pr: current.binding.pr, head: current.binding.head, merge: false }, completionRecovery: { maintenance: Number(run.id), attempt: run.run_attempt, issue, ci: ci.id, pr: current.binding.pr, head: current.binding.head } };
}
