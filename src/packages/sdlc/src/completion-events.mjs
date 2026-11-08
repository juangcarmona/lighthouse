import { authorizeCompletion, fingerprint } from './completion-contract.mjs';
import { list } from './completion-state.mjs';
import { deliveryAfterChecks } from './delivery-events.mjs';
import { loadProposalReview } from './proposal-review.mjs';

export async function authorizeCompletionEvent(api, repository, event, env, stage, expectedIntegration = null) {
  if (env.GITHUB_EVENT_NAME === 'issues') {
    if (stage !== 'integrate') throw Error('Label requests only integration assessment');
    return (await import('./integration-request.mjs')).integrationLabelRequest(api, repository, env.GITHUB_REPOSITORY_OWNER, event, env, expectedIntegration);
  }
  if (env.GITHUB_EVENT_NAME === 'workflow_run') {
    if (event.completionRecovery) {
      if (stage !== 'review') throw Error('Recovered completion can authorize review only');
      const run = await api(`actions/runs/${event.completionRecovery.maintenance}`);
      const verified = await (await import('./completion-recovery.mjs')).recoveredCompletionEvent(api, repository, env.GITHUB_REPOSITORY_OWNER, run, event.completionRecovery.issue);
      if (fingerprint(event.completionRecovery) !== fingerprint(verified.completionRecovery)) throw Error('Recovered completion authorization changed');
      return verified.completionAuthorization;
    }
    const next = await deliveryAfterChecks(api, repository, env.GITHUB_REPOSITORY_OWNER, event);
    if (!next || next.stage !== stage) throw Error('No current delivery authorization after checks');
    const { stage: ignored, ...authorization } = next;
    return authorization;
  }
  if (env.GITHUB_EVENT_NAME !== 'pull_request_review') return authorizeCompletion(event, env, stage);
  const owner = env.GITHUB_REPOSITORY_OWNER;
  if (stage !== 'integrate' || event.action !== 'submitted' || env.GITHUB_ACTOR !== owner || env.GITHUB_TRIGGERING_ACTOR !== owner) throw Error('Merge requires the owner review');
  const review = await loadProposalReview(api, repository, owner, event, env.GITHUB_EVENT_NAME, true);
  if (!review.approved) throw Error('The PR review does not approve this head');
  const reviews = await list(api, `pulls/${review.number}/reviews`);
  const latest = reviews.filter(r => r.user?.login === owner && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(r.state)).sort((a, b) => b.id - a.id)[0];
  if (latest?.id !== review.id || latest.state !== 'APPROVED') throw Error('Owner approval was superseded');
  return { issue: review.issue, pr: review.number, head: review.head, merge: true, approval: { id: review.id, owner, head: review.head } };
}

// Observation only: authorizeCompletionEvent has already verified the retained grant and recovery artifact.
export async function readCompletionContinuation(api, repository, event, request = null) {
  if (!event?.workflow_run) return null;
  const read = async (id, sha = null) => {
    if (!Number.isSafeInteger(id) || id < 1) throw Error('Invalid completion continuation');
    const run = await api(`actions/runs/${id}`);
    if (run.id !== id || run.repository?.full_name !== repository || run.status !== 'completed' || run.conclusion !== 'success' || sha && run.head_sha !== sha) throw Error('Completion continuation observation changed');
    return { id, attempt: run.run_attempt, path: run.path, event: run.event, head: run.head_sha, status: run.status, conclusion: run.conclusion, url: `https://github.com/${repository}/actions/runs/${id}` };
  };
  const ci = await read(event.workflow_run.id, event.workflow_run.head_sha);
  let recovery = null;
  if (event.completionRecovery) {
    if (event.completionRecovery.ci !== ci.id) throw Error('Completion continuation CI changed');
    recovery = await read(event.completionRecovery.maintenance);
    if (recovery.path !== '.github/workflows/lighthouse-worker-maintenance.yml' || recovery.attempt !== event.completionRecovery.attempt || !['schedule', 'workflow_dispatch'].includes(recovery.event)) throw Error('Completion continuation recovery changed');
  }
  if (!recovery && request?.recovery?.kind === 'before-admission') {
    const run = await api(`actions/runs/${request.routerRunId}/attempts/${request.routerAttempt}`);
    if (String(run.id) !== request.routerRunId || run.run_attempt !== request.routerAttempt || run.repository?.full_name !== repository || run.path !== '.github/workflows/lighthouse-worker-maintenance.yml' || run.event !== request.routerEventName || run.head_sha !== request.routerRevision || run.head_branch !== request.routerRef) throw Error('Authenticated admission recovery observation changed');
    recovery = { id: run.id, attempt: run.run_attempt, path: run.path, event: run.event, head: run.head_sha, status: run.status, conclusion: run.conclusion, actor: run.actor?.login, triggeringActor: run.triggering_actor?.login, automatic: ['schedule', 'workflow_run'].includes(run.event) || run.actor?.login === 'github-actions[bot]' && run.triggering_actor?.login === run.actor.login && !!request.recovery.wake, wake: request.recovery.wake ?? null, url: `https://github.com/${repository}/actions/runs/${run.id}` };
  }
  return { ci, recovery };
}
