import { checkImplementationPullRequest } from './proposal-review.mjs';

// CI completion may resume delivery only for a matching bot PR and current owner decision.
export async function deliveryAfterChecks(api, repository, owner, event) {
  const id = event.workflow_run?.id;
  if (!Number.isSafeInteger(id) || event.action !== 'completed') return null;
  const run = await api(`actions/runs/${id}`);
  if (run.status !== 'completed' || run.conclusion !== 'success' || run.head_sha !== event.workflow_run.head_sha || !['push', 'pull_request', 'workflow_dispatch'].includes(run.event)) return null;
  const metadata = await api('');
  const config = await api(`contents/.lighthouse/github.json?ref=${metadata.default_branch}`, 'GET', undefined, true);
  if (!config) return null;
  const profile = JSON.parse(Buffer.from(config.content, 'base64').toString());
  if (!profile.completion?.postMergeWorkflows?.some(name => run.path === `.github/workflows/${name}`)) return null;
  const pulls = await api(`commits/${run.head_sha}/pulls?per_page=100`);
  if (pulls.length >= 100) throw Error('Delivery lookup exceeds bounds');
  for (const candidate of pulls) {
    if (candidate.head?.sha !== run.head_sha && candidate.merge_commit_sha !== run.head_sha) continue;
    const pr = await api(`pulls/${candidate.number}`);
    if (pr.base.ref !== metadata.default_branch) continue;
    let target;
    try { target = checkImplementationPullRequest({ ...pr, state: 'open', merged: false }, repository); } catch { continue; }
    if (pr.merged && pr.merge_commit_sha === run.head_sha && run.head_branch === metadata.default_branch) return { stage: 'review', issue: target.issue, pr: pr.number, head: pr.head.sha, merge: false };
    if (pr.state !== 'open' || pr.draft || pr.head.sha !== run.head_sha) continue;
    const reviews = await api(`pulls/${pr.number}/reviews?per_page=100`);
    if (reviews.length >= 100) throw Error('Review lookup exceeds bounds');
    const decision = reviews.filter(r => r.user?.login === owner && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(r.state)).sort((a, b) => b.id - a.id)[0];
    if (decision?.state === 'APPROVED' && decision.commit_id === pr.head.sha) return { stage: 'integrate', issue: target.issue, pr: pr.number, head: pr.head.sha, merge: true, approval: { id: decision.id, owner, head: pr.head.sha } };
  }
  return null;
}

export async function dispatchDeliveryChecks(api, revision, pr) {
  const config = await api(`contents/.lighthouse/github.json?ref=${revision}`, 'GET', undefined, true);
  if (!config) return;
  const workflows = JSON.parse(Buffer.from(config.content, 'base64').toString()).completion?.postMergeWorkflows ?? [];
  if (!Array.isArray(workflows) || workflows.length > 12 || workflows.some(w => !/^[\w.-]+\.ya?ml$/.test(w))) throw Error('Invalid repository check workflows');
  for (const workflow of workflows) {
    const current = await api(`pulls/${pr.number}`);
    if (current.head.sha !== pr.head.sha || current.head.ref !== pr.head.ref || current.state !== 'open') throw Error('PR changed before checks could start');
    await api(`actions/workflows/${workflow}/dispatches`, 'POST', { ref: current.head.ref });
  }
}
