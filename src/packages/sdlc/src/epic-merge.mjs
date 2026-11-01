import { checkImplementationPullRequest } from './proposal-review.mjs';
import { checkCommit, list, loadProfile, requiredPolicy } from './completion.mjs';
import { isDeepStrictEqual } from 'node:util';
import { epicCorrelation, epicJournalKey } from './epic-github.mjs';

const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');

// The caller authenticates the owner's decision and holds the parent lease.
export async function observeEpicMerge(api, { repository, owner, child, epic, decision }, { authenticateChild, authenticatePullRequest, authorizeDecision, loadPolicy = async () => {
  const profile = await loadProfile(api, repository, epic.sourceRevision);
  return requiredPolicy(api, epic.base, profile);
} }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || typeof owner !== 'string' || !owner || !Number.isSafeInteger(child) || child < 1 || !Number.isSafeInteger(epic?.parent) || epic.parent < 1 || epic.parent === child || epic.base !== `lighthouse/epic-${epic.parent}` || typeof epic.slice !== 'string' || !epic.slice.trim() || !/^[a-f0-9]{64}$/.test(epic.planDigest ?? '') || !sha(epic.sourceRevision) || !Number.isSafeInteger(decision?.pr) || decision.pr < 1 || !Number.isSafeInteger(decision.review) || decision.review < 1 || !sha(decision.head) || !sha(decision.base) || typeof authenticateChild !== 'function' || typeof authenticatePullRequest !== 'function' || typeof authorizeDecision !== 'function') throw Error('Invalid epic merge decision');
  if (await authorizeDecision(decision) !== true) throw Error('Epic merge decision is not authorized');
  const current = await authenticateChild();
  if (current.parent !== epic.parent || current.slice !== epic.slice || current.planDigest !== epic.planDigest || current.base !== epic.base || current.sourceRevision !== epic.sourceRevision) throw Error('Epic child authority changed');
  const branch = await api(`git/ref/heads/${epic.base}`);
  if (branch.ref !== `refs/heads/${epic.base}` || branch.object?.sha !== decision.base) throw Error('Epic base changed before merge');
  const pr = await api(`pulls/${decision.pr}`);
  const target = checkImplementationPullRequest(pr, repository);
  if (target.issue !== child || target.base !== epic.base || target.head !== decision.head || pr.draft || pr.mergeable !== true || !sha(pr.merge_commit_sha)) throw Error('Epic child PR is not eligible for the approved head and base');
  if (await authenticatePullRequest(pr, target) !== true) throw Error('Epic child PR lacks an authenticated receipt');
  const merge = await api(`git/commits/${pr.merge_commit_sha}`);
  if (!Array.isArray(merge.parents) || merge.parents.length !== 2 || merge.parents[0].sha !== decision.base || merge.parents[1].sha !== decision.head) throw Error('GitHub test merge does not bind the approved head and current base');
  const reviews = await list(api, `pulls/${decision.pr}/reviews`);
  const latest = reviews.filter(review => review.user?.login === owner && review.user.type === 'User' && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)).sort((a, b) => b.id - a.id)[0];
  if (latest?.id !== decision.review || latest.state !== 'APPROVED' || latest.commit_id !== decision.head) throw Error('Current owner review does not approve this child head');
  const policy = await loadPolicy();
  if (!Array.isArray(policy?.checks) || !policy.checks.length) throw Error('Epic merge has no enforced checks');
  const checks = await checkCommit(api, pr.merge_commit_sha, policy.checks);
  if (checks.some(check => check.status !== 'passed')) throw Error('Epic merge checks are missing, pending or failed');
  if (await authorizeDecision(decision) !== true) throw Error('Epic merge decision was revoked');
  const childAgain = await authenticateChild();
  if (childAgain.parent !== current.parent || childAgain.slice !== current.slice || childAgain.planDigest !== current.planDigest || childAgain.base !== current.base || childAgain.sourceRevision !== current.sourceRevision) throw Error('Epic child authority changed');
  const fresh = await api(`pulls/${decision.pr}`), freshBranch = await api(`git/ref/heads/${epic.base}`);
  const freshTarget = checkImplementationPullRequest(fresh, repository, target);
  const freshReviews = await list(api, `pulls/${decision.pr}/reviews`);
  const freshReview = freshReviews.filter(review => review.user?.login === owner && review.user.type === 'User' && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)).sort((a, b) => b.id - a.id)[0];
  if (await authenticatePullRequest(fresh, freshTarget) !== true || fresh.mergeable !== true || fresh.merge_commit_sha !== pr.merge_commit_sha || fresh.draft || freshBranch.object?.sha !== decision.base || freshReview?.id !== decision.review || freshReview.state !== 'APPROVED' || freshReview.commit_id !== decision.head) throw Error('Epic merge evidence changed while checking');
  return { child, parent: epic.parent, slice: epic.slice, planDigest: epic.planDigest, pr: target.number, head: decision.head, base: decision.base, mergeCandidate: pr.merge_commit_sha, review: latest.id, checks };
}

// The caller supplies an authenticated journal, owner decision and the parent lease.
export async function mergeEpicChild(api, { correlation, resource }, { journal, observe, authorize, verifyChecks }) {
  if (correlation?.kind !== 'pull-request' || !isDeepStrictEqual(correlation, epicCorrelation(correlation)) || !Number.isSafeInteger(resource?.id) || resource.id < 1 || !Number.isSafeInteger(resource.number) || resource.number < 1 || typeof journal?.readReceipt !== 'function' || typeof journal?.writeReceipt !== 'function' || typeof observe !== 'function' || typeof authorize !== 'function' || typeof verifyChecks !== 'function') throw Error('Invalid epic merge context');
  const key = epicJournalKey(correlation), receipt = await journal.readReceipt(key);
  if (!receipt || !isDeepStrictEqual(receipt.correlation, correlation) || receipt.resource?.id !== resource.id || receipt.resource?.number !== resource.number || !['linked', 'merging', 'accepted'].includes(receipt.state)) throw Error('Epic PR receipt is missing or changed');
  const confirm = async binding => {
    const pr = await api(`pulls/${resource.number}`);
    if (pr.id !== resource.id || pr.number !== resource.number || !pr.merged || pr.head?.sha !== binding.head || pr.base?.ref !== correlation.base || pr.head.repo?.full_name !== correlation.repository || pr.base.repo?.full_name !== correlation.repository || !sha(pr.merge_commit_sha) || pr.merged_by?.login !== 'github-actions[bot]' || pr.merged_by.type !== 'Bot') throw Error('Epic merge outcome is unconfirmed');
    const actual = await api(`git/commits/${pr.merge_commit_sha}`), candidate = await api(`git/commits/${binding.candidate}`);
    if (!Array.isArray(actual.parents) || actual.parents.length !== 1 || actual.parents[0].sha !== binding.base || !sha(actual.tree?.sha) || actual.tree.sha !== candidate.tree?.sha) throw Error('Epic merge commit does not match the approved base and candidate');
    return pr.merge_commit_sha;
  };
  if (receipt.state === 'accepted') {
    if (await authorize() !== true || await verifyChecks(receipt.merge) !== true) throw Error('Accepted epic merge authority or checks changed');
    if (await confirm(receipt.merge) !== receipt.merge.commit) throw Error('Accepted epic merge changed');
    return { status: 'accepted', commit: receipt.merge.commit, recovered: true };
  }
  if (receipt.state === 'merging') {
    if (await authorize() !== true) throw Error('Epic merge reconciliation is not authorized');
    const commit = await confirm(receipt.merge);
    if (await verifyChecks(receipt.merge) !== true || await authorize() !== true) throw Error('Epic merge authority or checks are no longer valid');
    await journal.writeReceipt(key, { ...receipt, state: 'accepted', merge: { ...receipt.merge, commit } });
    return { status: 'accepted', commit, recovered: true };
  }
  const initial = await observe();
  if (initial.parent !== correlation.parent || initial.slice !== correlation.slice || initial.planDigest !== correlation.planDigest || initial.pr !== resource.number || !sha(initial.head) || initial.head !== receipt.publication?.head || !sha(initial.base) || !sha(initial.mergeCandidate) || !Number.isSafeInteger(initial.review) || initial.review < 1) throw Error('Epic merge observation does not match the receipt');
  const merge = { head: initial.head, base: initial.base, candidate: initial.mergeCandidate, review: initial.review };
  const intent = { ...receipt, state: 'merging', merge };
  if (await authorize() !== true) throw Error('Epic merge is not authorized');
  await journal.writeReceipt(key, intent);
  const fresh = await observe();
  if (!isDeepStrictEqual(fresh, initial)) throw Error('Epic merge evidence changed before publication');
  if (await authorize() !== true) throw Error('Epic merge authorization changed');
  let response;
  try { response = await api(`pulls/${resource.number}/merge`, 'PUT', { sha: merge.head, merge_method: 'squash' }); }
  catch (error) {
    const commit = await confirm(merge).catch(() => null);
    if (!commit) throw error;
    if (await verifyChecks(merge) !== true || await authorize() !== true) throw Error('Epic merge authority or checks are no longer valid');
    await journal.writeReceipt(key, { ...intent, state: 'accepted', merge: { ...merge, commit } });
    return { status: 'accepted', commit, recovered: true };
  }
  if (!response?.merged || !sha(response.sha)) throw Error('Epic merge response is unconfirmed');
  const commit = await confirm(merge);
  if (commit !== response.sha) throw Error('Epic merge response does not match GitHub state');
  if (await verifyChecks(merge) !== true || await authorize() !== true) throw Error('Epic merge authority or checks are no longer valid');
  await journal.writeReceipt(key, { ...intent, state: 'accepted', merge: { ...merge, commit } });
  return { status: 'accepted', commit, recovered: false };
}
