import { checkImplementationPullRequest } from './proposal-review.mjs';
import { implementationPrProof } from './pr-state.mjs';
import { issueComments, loadDispatch, stagePath, workerFor } from './stage-dispatch.mjs';
import { readActionsJson } from './actions-artifact.mjs';

// Resolve the existing candidate before recording another implementation request.
export async function implementationContinuation(api, repository, owner, request, readArtifact = readActionsJson) {
  if (workerFor(request) !== 'implement' || request.productResume || request.productAlignment) return null;
  const pulls = await api('pulls?state=open&per_page=100');
  if (pulls.length >= 100) throw Error('Implementation candidate lookup exceeds bounds');
  const candidates = pulls.filter(pr => pr.head?.ref?.startsWith(`lighthouse/implement-${request.issue}-`));
  if (!candidates.length) return null;
  if (candidates.length !== 1) return { status: 'blocked', reason: 'Multiple implementation PRs exist; resolve the ambiguity before continuing.' };
  const pr = await api(`pulls/${candidates[0].number}`);
  const result = { status: 'blocked', pr: pr.number, head: pr.head?.sha, url: pr.html_url };
  try {
    const target = checkImplementationPullRequest(pr, repository);
    const metadata = await api('');
    if (target.issue !== request.issue || target.base !== (request.epic?.base ?? metadata.default_branch)) throw Error('Candidate issue or base differs from the authorized request');
    const proof = implementationPrProof(await issueComments(api, request.issue), pr);
    if (!proof) throw Error('Current-head implementation evidence is unavailable; review this PR before requesting another');
    const run = await api(`actions/runs/${proof.run}`);
    if (![stagePath('implement'), stagePath('apply-review')].includes(run.path) || run.status !== 'completed' || run.conclusion !== 'success' || run.repository?.full_name !== repository) throw Error('Candidate publication has no successful implementation execution');
    const prior = await readArtifact(api, repository, run.id, `lighthouse-implement-input-${request.issue}-${run.run_attempt}`, 'request.json');
    if (prior.issue !== request.issue || prior.stage !== 'implement' || String(prior.workflowRunId) !== String(run.id) || !prior.dispatch || (prior.implementationReview?.implementationIdentity ?? prior.runId) !== target.implementationIdentity) throw Error('Candidate implementation identity is unavailable or changed');
    const origin = await loadDispatch(api, repository, owner, request.issue, prior.dispatch.commentId, run, readArtifact);
    if (String(origin.receipt.workerRunId) !== String(run.id) || origin.receipt.status !== 'completed' || origin.request.id !== prior.dispatch.requestId || origin.receipt.digest !== prior.dispatch.digest || origin.request.taskDigest !== prior.taskDigest || prior.taskDigest !== request.taskDigest) throw Error('Candidate owner intent changed; request a correction on the existing PR');
    if ((prior.baseRevision ?? prior.sourceRevision) !== request.sourceRevision) throw Error('Candidate source evidence is stale; revalidate the existing PR against the current base');
    return { ...result, status: proof.complete ? 'completed' : 'blocked', reason: proof.complete ? 'An authenticated current candidate already exists; continue its CI and review.' : 'An authenticated partial candidate already exists; request its correction on this PR.' };
  } catch (error) {
    return { ...result, reason: error.message };
  }
}
