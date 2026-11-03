import { checkImplementationPullRequest } from './proposal-review.mjs';
import { implementationPrProof } from './pr-state.mjs';
import { issueComments, loadDispatch, stagePath, workerFor } from './stage-dispatch.mjs';
import { readActionsJson } from './actions-artifact.mjs';
import { taskDigest } from './issue-actions.mjs';
import { eligibleIssueAuthor } from './request-triage.mjs';

export async function consumeReconciledLabel(api, owner, request, state) {
  if (state !== 'completed' || request.eventName !== 'issues' || request.event.action !== 'labeled' || request.event.label?.name !== request.stage) return false;
  const issue = await api(`issues/${request.issue}`);
  const comments = await issueComments(api, request.issue);
  const answers = comments.filter(c => c.user?.login === owner && !c.body.includes('<!-- lighthouse-run:') && !c.body.includes('<!-- lighthouse-actions:'));
  const metadata = await api(''), revision = (await api(`commits/${metadata.default_branch}`)).sha;
  if (issue.state !== 'open' || !eligibleIssueAuthor(issue, owner, request.stage) || issue.pull_request || issue.labels.some(l => ['human-working', 'agent-working'].includes(l.name)) || taskDigest(issue, answers) !== request.taskDigest || revision !== request.sourceRevision) throw Error('Current authority or intent changed before consuming the reconciled request');
  if (!issue.labels.some(l => l.name === request.stage)) return false;
  await api(`issues/${request.issue}/labels/${encodeURIComponent(request.stage)}`, 'DELETE', undefined, true);
  return true;
}

// Resolve the existing candidate before recording another implementation request.
export async function implementationContinuation(api, repository, owner, request, readArtifact = readActionsJson) {
  if (workerFor(request) !== 'implement' || request.productResume || request.productAlignment) return null;
  const pulls = await api('pulls?state=open&per_page=100');
  if (pulls.length >= 100) throw Error('Implementation candidate lookup exceeds bounds');
  const candidates = pulls.filter(pr => {
    if (pr.head?.ref?.startsWith(`lighthouse/implement-${request.issue}-`)) return true;
    try { return checkImplementationPullRequest(pr, repository).issue === request.issue; } catch { return false; }
  });
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
    if ((prior.baseRevision ?? prior.sourceRevision) !== (request.epic?.baseSha ?? request.sourceRevision)) throw Error('Candidate source evidence is stale; revalidate the existing PR against the current base');
    return { ...result, status: proof.complete ? 'completed' : 'blocked', reason: proof.complete ? 'An authenticated current candidate already exists; continue its CI and review.' : 'An authenticated partial candidate already exists; request its correction on this PR.' };
  } catch (error) {
    return { ...result, reason: error.message };
  }
}
