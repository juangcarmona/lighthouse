import { checkImplementationPullRequest, checkProposal } from './proposal-review.mjs';
import { stagePath } from './stage-dispatch.mjs';
import { retryLimit, retryDelayMs } from './worker-recovery.mjs';

// Display names filter subscriptions only; actual paths, revisions and subjects admit work.
export async function completionSource(api, repository, event, env = {}) {
  if (event.action !== 'completed' || !Number.isSafeInteger(event.workflow_run?.id)) return null;
  const run = await api(`actions/runs/${event.workflow_run.id}`);
  if (run.status !== 'completed' || run.head_sha !== event.workflow_run.head_sha || run.repository?.full_name !== repository) return null;
  const parent = ['triage', 'refine', 'propose', 'implement', 'apply-review'].some(worker => run.path === stagePath(worker));
  if (run.conclusion === 'success' && (run.path === stagePath('refine') || env.LIGHTHOUSE_PRODUCT_CHANGE_ENABLED === 'true' && (parent || ['product-change', 'apply-product-change'].some(worker => run.path === stagePath(worker))))) return 'stage';
  const metadata = await api('');
  const config = await api(`contents/.lighthouse/github.json?ref=${metadata.default_branch}`, 'GET', undefined, true);
  if (!config) return null;
  const profile = JSON.parse(Buffer.from(config.content, 'base64').toString());
  if (!profile.completion?.postMergeWorkflows?.some(name => run.path === `.github/workflows/${name}`) || !['push', 'pull_request', 'workflow_dispatch'].includes(run.event)) return null;
  const pulls = await api(`commits/${run.head_sha}/pulls?per_page=100`);
  if (pulls.length >= 100) throw Error('Completion subject lookup exceeds bounds');
  return pulls.some(pr => {
    if (pr.base?.ref !== metadata.default_branch || pr.head?.sha !== run.head_sha && pr.merge_commit_sha !== run.head_sha) return false;
    try { checkImplementationPullRequest({ ...pr, state: 'open', merged: false }, repository); return true; } catch {
      try { checkProposal(pr, repository); return true; } catch { return false; }
    }
  }) ? 'checks' : null;
}

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

export async function dispatchDeliveryChecks(api, revision, pr, { checkpoint = async () => {}, previous = null, now = Date.now() } = {}) {
  const config = await api(`contents/.lighthouse/github.json?ref=${revision}`, 'GET', undefined, true);
  if (!config) return [];
  const workflows = JSON.parse(Buffer.from(config.content, 'base64').toString()).completion?.postMergeWorkflows ?? [];
  if (!Array.isArray(workflows) || workflows.length > 12 || workflows.some(w => !/^[\w.-]+\.ya?ml$/.test(w))) throw Error('Invalid repository check workflows');
  const requests = workflows.map(workflow => ({ schemaVersion: 1, pr: pr.number, head: pr.head.sha, branch: pr.head.ref, workflow, attempt: 1, observedAt: new Date(now).toISOString(), state: 'not-sent' }));
  for (const workflow of workflows) {
    const prior = previous?.find(item => item.workflow === workflow);
    if (previous && (!prior || prior.pr !== pr.number || prior.head !== pr.head.sha || prior.branch !== pr.head.ref || !Number.isSafeInteger(prior.attempt) || prior.attempt < 1 || prior.attempt > retryLimit + 1)) throw Error('CI recovery receipt differs from the retained candidate');
    const request = requests.find(item => item.workflow === workflow);
    request.attempt = prior?.attempt ?? 1;
    try {
      const current = await api(`pulls/${pr.number}`);
      if (current.head.sha !== pr.head.sha || current.head.ref !== pr.head.ref || current.state !== 'open') throw Error('PR changed before checks could start');
      const found = await api(`actions/workflows/${workflow}/runs?head_sha=${pr.head.sha}&per_page=100`);
      if (!Array.isArray(found.workflow_runs) || found.total_count > 100) throw Error('CI request inventory exceeds bounds');
      const existing = found.workflow_runs.filter(run => run.head_sha === pr.head.sha && run.head_branch === pr.head.ref && run.repository?.full_name === current.head.repo?.full_name && run.path === `.github/workflows/${workflow}` && ['push', 'workflow_dispatch'].includes(run.event)).sort((a, b) => b.id - a.id)[0];
      if (existing) { Object.assign(request, { state: 'observed', run: existing.id }); await checkpoint(requests); continue; }
      if (prior) {
        Object.assign(request, prior);
        if (!['not-sent', 'rejected'].includes(prior.state)) throw Error('CI dispatch acknowledgement is unconfirmed; reconcile the original request before any resend');
        if (prior.attempt >= retryLimit + 1) throw Error('CI launch retry budget exhausted');
        if (!Number.isFinite(Date.parse(prior.observedAt)) || now - Date.parse(prior.observedAt) < retryDelayMs) throw Error('CI launch retry delay has not elapsed');
        Object.assign(request, { attempt: prior.attempt + 1, state: 'not-sent', observedAt: new Date(now).toISOString() });
        delete request.error;
      }
      request.state = 'requested';
      await checkpoint(requests);
      try { await api(`actions/workflows/${workflow}/dispatches`, 'POST', { ref: current.head.ref }); }
      catch (error) {
        request.state = Number.isSafeInteger(error.status) && error.status >= 400 && error.status < 500 ? 'rejected' : 'unknown';
        throw error;
      }
      request.state = 'acknowledged';
      await checkpoint(requests);
    } catch (error) {
      request.error = { name: error.name, message: error.message, ...(Number.isSafeInteger(error.status) ? { status: error.status } : {}) };
      await checkpoint(requests);
      throw error;
    }
  }
  return requests;
}
