import { loadRefinement, loadStageReport } from './proposal.mjs';
import { validateStageEnvelope } from './host-contract.mjs';
import { isIssuePublicationBranch } from './publication-branch.mjs';
import { proposalRoot } from './proposal-files.mjs';

export const ownerIntentComments = (comments, owner) => comments.filter(comment => comment.user.login === owner
  && !comment.body.includes('<!-- lighthouse-run:') && !comment.body.includes('<!-- lighthouse-actions:'));

export async function collectTriageAdmission({ api, repository, owner, issue, comments, sourceRevision, readArtifact }) {
  const report = [...comments].reverse().find(comment => comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot'
    && comment.body.includes('<!-- lighthouse-stage:triage:passed -->'));
  if (!report && issue.user.login !== owner) throw Error('External request requires authenticated passed triage before later work');
  if (!report) return undefined;
  const evidence = await loadStageReport(api, repository, report, { owner, issue: issue.number }, readArtifact);
  const errors = validateStageEnvelope(evidence.envelope, evidence.request);
  if (errors.length || evidence.request.stage !== 'triage' || evidence.envelope.result.status !== 'passed'
      || evidence.request.sourceRevision !== sourceRevision || evidence.request.originalRequest !== (issue.body ?? ''))
    throw Error('Triage evidence is invalid or stale; request triage again');
  return evidence;
}

export async function collectProposalAdmission({ api, repository, owner, issue, comments, sourceRevision,
  proposalRevision = sourceRevision, taskDigest, predecessor, readArtifact }) {
  if (!issue.labels.some(label => label.name === 'ready')) throw Error('Proposal requires a ready issue');
  predecessor ??= await loadRefinement(api, repository, comments, { owner, issue: issue.number, sourceRevision, taskDigest }, readArtifact);
  if (predecessor.request.stage !== 'refine' || predecessor.request.issue !== issue.number || predecessor.request.sourceRevision !== sourceRevision
      || predecessor.envelope.result.status !== 'passed') throw Error('Continuation refinement is invalid');
  const errors = validateStageEnvelope(predecessor.envelope, predecessor.request);
  if (errors.length) throw Error(errors.join('\n'));
  if (await api(`contents/${proposalRoot(issue.number)}?ref=${proposalRevision}`, 'GET', undefined, true))
    throw Error('Proposal directory already exists; review the existing proposal');
  const pulls = await api('pulls?state=open&per_page=100');
  if (pulls.length >= 100 || pulls.some(pr => isIssuePublicationBranch(pr.head.ref, issue.number, 'propose')))
    throw Error('Review the existing proposal PR before requesting another');
  return predecessor;
}
