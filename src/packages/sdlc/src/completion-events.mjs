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
