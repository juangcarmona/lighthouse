import { checkImplementationPullRequest } from './proposal-review.mjs';
import { implementationPrProof } from './implementation-proof.mjs';
import { list, loadProfile, requiredPolicy, checkCommit } from './completion-state.mjs';

export function assertIntegrationLabelCurrent(repository, owner, authorization, pr, issue, comments, reviews) {
  if (authorization.merge !== false || issue.state !== 'open' || issue.pull_request || issue.user?.login !== owner || issue.labels.some(l => l.name === 'human-working')) throw Error('Owner: integration assessment is no longer authorized; release human work before requesting it again.');
  checkImplementationPullRequest(pr, repository, { number: authorization.pr, issue: authorization.issue, head: authorization.head, branch: authorization.integrationLabel.branch, base: pr.base.ref, implementationIdentity: authorization.integrationLabel.implementationIdentity });
  if (pr.draft) throw Error(`Owner: PR #${pr.number} is a draft; complete its candidate and required CI before requesting integrate.`);
  if (!implementationPrProof(comments, pr)?.complete) throw Error(`Owner: PR #${pr.number} has no complete implementation receipt for its current head; request a correction on that PR.`);
  const approval = reviews.filter(r => r.user?.login === owner && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(r.state)).sort((a, b) => b.id - a.id)[0];
  if (!approval || approval.state !== 'APPROVED' || approval.commit_id !== pr.head.sha || approval.id !== authorization.integrationLabel.approvalId) throw Error(`Owner: approve the current head of PR #${pr.number}, then request integrate again. The label never authorizes merge.`);
}

export async function integrationLabelRequest(api, repository, owner, event, env, expected = null) {
  if (env.GITHUB_EVENT_NAME !== 'issues' || event.action !== 'labeled' || event.label?.name !== 'integrate' || env.GITHUB_ACTOR !== owner || env.GITHUB_TRIGGERING_ACTOR !== owner || event.issue?.pull_request) throw Error('Only the repository owner may request integration assessment with this label.');
  const issue = await api(`issues/${event.issue.number}`);
  if (issue.state !== 'open' || !issue.labels.some(l => l.name === 'integrate') || issue.labels.some(l => ['agent-working', 'human-working'].includes(l.name))) throw Error('Owner: integrate requires an open issue with the request label and no active reservation.');
  const repo = await api(''), pulls = await list(api, 'pulls?state=open');
  const candidates = pulls.filter(pr => {
    try { return pr.base.ref === repo.default_branch && checkImplementationPullRequest(pr, repository).issue === issue.number; } catch { return false; }
  });
  if (candidates.length !== 1) throw Error(candidates.length ? 'Owner: multiple implementation PRs match this issue; resolve the ambiguity or dispatch integrate with an explicit PR and full head SHA.' : 'Owner: no open Lighthouse implementation PR matches this issue; deliver its candidate before requesting integrate.');
  const pr = await api(`pulls/${candidates[0].number}`), target = checkImplementationPullRequest(pr, repository);
  if (target.base !== repo.default_branch || target.issue !== issue.number) throw Error('Implementation PR changed while resolving the integration request.');
  const reviews = await list(api, `pulls/${pr.number}/reviews`);
  const approval = reviews.filter(r => r.user?.login === owner && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(r.state)).sort((a, b) => b.id - a.id)[0];
  const authorization = { issue: issue.number, pr: pr.number, head: pr.head.sha, merge: false, integrationLabel: { branch: target.branch, implementationIdentity: target.implementationIdentity, approvalId: approval?.id ?? null } };
  if (expected && JSON.stringify(expected) !== JSON.stringify(authorization)) throw Error('Integration PR, head, identity or approval changed after routing; request a fresh assessment.');
  assertIntegrationLabelCurrent(repository, owner, authorization, pr, issue, await list(api, `issues/${issue.number}/comments`), reviews);
  const revision = (await api(`commits/${repo.default_branch}`)).sha;
  let profile;
  try { profile = await loadProfile(api, repository, revision); }
  catch (error) { throw Error(`Workflow maintainer: adopt a valid GitHub completion profile before requesting integrate. ${error.message}`); }
  const policy = await requiredPolicy(api, repo.default_branch, profile);
  const checks = await checkCommit(api, pr.head.sha, policy.checks);
  const missing = checks.filter(c => c.status !== 'passed');
  if (!checks.length || missing.length) throw Error(`Owner: required checks for PR #${pr.number} are not passed: ${missing.map(c => `${c.context} (${c.state})`).join(', ') || 'no checks configured'}. Resolve CI before requesting integrate.`);
  return authorization;
}
