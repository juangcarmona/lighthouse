import { inspectCompletion, postMergeRuns, list } from './completion-state.mjs';
import { readIntegrationEvidence } from './integration-evidence.mjs';
import { isBotContinuation, issueComments, readDispatchReceipt } from './stage-dispatch.mjs';
import { validPendingReview } from './completion-status.mjs';

const ownerPaused = issue => issue.state !== 'open' || issue.labels.some(label => ['human-working', 'future', 'needs-info', 'waiting-review'].includes(label.name));
const paused = issue => ownerPaused(issue) || issue.labels.some(label => label.name === 'agent-working');
function pending(comments, repository, issue) {
  return comments.flatMap(comment => {
    if (comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot' || comment.issue_url !== `https://api.github.com/repos/${repository}/issues/${issue}`) return [];
    const matches = [...(comment.body ?? '').matchAll(/<!-- lighthouse-pending-review:(\{[^\n]*\}) -->/g)];
    if (matches.length !== 1) return [];
    try {
      const hint = JSON.parse(matches[0][1]);
      return validPendingReview(hint) && hint.repository === repository && hint.issue === issue ? [{ hint, comment }] : [];
    } catch { return []; }
  }).sort((a, b) => b.comment.id - a.comment.id)[0];
}
function laterDispatch(comments, entry, repository) {
  for (const comment of comments.filter(comment => comment.id > entry.comment.id).sort((a, b) => b.id - a.id)) {
    if (comment.user?.login !== 'github-actions[bot]' || !comment.body?.includes('<!-- lighthouse-dispatch:')) continue;
    const receipt = readDispatchReceipt(comment, repository, entry.hint.issue);
    return receipt.stage === 'review' ? receipt.workerRunId ? 'recorded' : 'uncertain' : 'superseded';
  }
  return null;
}

// Reuse the scheduled PR reconciler and original CI identity, never dispatch a worker here.
export async function reconcilePostMergeReviews(api, repository, owner, branch, { inspect = inspectCompletion, readIntegration = readIntegrationEvidence, postMerge = postMergeRuns } = {}) {
  const issues = await list(api, `issues?state=open&creator=${encodeURIComponent(owner)}`);
  const outcomes = [];
  for (const issue of issues) {
    if (issue.pull_request || issue.user?.login !== owner || paused(issue)) continue;
    const comments = await issueComments(api, issue.number), entry = pending(comments, repository, issue.number);
    if (!entry) continue;
    const result = state => ({ issue: issue.number, integrationRun: entry.hint.run, state });
    const recorded = laterDispatch(comments, entry, repository);
    if (recorded) { outcomes.push(result(recorded)); continue; }
    const { hint } = entry;
    const observe = async () => {
      const current = await inspect(api, repository, owner, { issue: issue.number, pr: hint.pr, head: hint.head, merge: false }, 'review');
      if (!current.merged || current.merge !== hint.merge || current.binding.head !== hint.head) return null;
      const integration = await readIntegration(api, current);
      if (!integration || String(integration.workflow.runId) !== hint.run || String(integration.workflow.attempt) !== hint.attempt || integration.receipt.sha !== hint.merge) return null;
      const checks = await postMerge(api, current, hint.merge);
      return checks.length && checks.every(check => check.status === 'passed' && Number.isSafeInteger(check.runId) && check.runId > 0) ? checks[0].runId : null;
    };
    let ciRun;
    try {
      ciRun = await observe();
      if (!ciRun) { outcomes.push(result('pending')); continue; }
      const freshIssue = await api(`issues/${issue.number}`), freshComments = await issueComments(api, issue.number);
      const freshEntry = pending(freshComments, repository, issue.number), recorded = laterDispatch(freshComments, entry, repository);
      if (paused(freshIssue) || freshIssue.user?.login !== owner || freshEntry?.comment.id !== entry.comment.id) { outcomes.push(result('superseded')); continue; }
      if (recorded) { outcomes.push(result(recorded)); continue; }
      if (await observe() !== ciRun) { outcomes.push(result('pending')); continue; }
    } catch {
      // Delayed PR/run/evidence visibility cannot discard the retained hint.
      outcomes.push(result('pending')); continue;
    }
    try {
      await api('actions/workflows/lighthouse-sdlc-router.yml/dispatches', 'POST', { ref: branch, inputs: { issue: String(issue.number), stage: 'review', workflow: 'stage', after_run: String(ciRun) } });
      outcomes.push(result('signalled'));
    } catch {
      // Only the router signal may recur; its original CI dispatch receipt prevents another worker.
      outcomes.push(result('signal-unconfirmed'));
    }
  }
  return outcomes;
}


// A hint can delay observation only. The caller must still authenticate completion and the current grant.
export async function waitForPendingIntegration(api, repository, owner, event, after, env, wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  if (env.LIGHTHOUSE_COMPLETION_ENABLED !== 'true' || !isBotContinuation(event, env.GITHUB_EVENT_NAME, env.GITHUB_ACTOR, env.GITHUB_TRIGGERING_ACTOR) || event.inputs.stage !== 'review' || after?.completionRecovery || String(after?.workflow_run?.id) !== event.inputs.after_run) return { state: 'not-applicable' };
  const ci = await api(`actions/runs/${after.workflow_run.id}`);
  if (ci.id !== after.workflow_run.id || ci.repository?.full_name !== repository || ci.head_sha !== after.workflow_run.head_sha || ci.status !== 'completed' || ci.conclusion !== 'success') return { state: 'unavailable' };
  const issue = Number(event.inputs.issue), branch = (await api('')).default_branch, deadline = Date.now() + 300000;
  let entry;
  for (let attempt = 0; attempt <= 60; attempt++) {
    const current = await api(`issues/${issue}`);
    if (ownerPaused(current) || current.user?.login !== owner) return { state: 'paused' };
    entry ??= pending(await issueComments(api, issue), repository, issue);
    if (entry) {
      if (entry.hint.merge !== ci.head_sha) return { state: 'superseded' };
      const run = await api(`actions/runs/${entry.hint.run}`, 'GET', undefined, true);
      if (run && (String(run.id) !== entry.hint.run || run.repository?.full_name !== repository || !['.github/workflows/lighthouse-sdlc-integrate.lock.yml', '.github/workflows/lighthouse-sdlc-unattended.yml'].includes(run.path) || run.event !== 'workflow_dispatch' || run.head_branch !== branch || String(run.run_attempt) !== entry.hint.attempt)) return { state: 'unavailable' };
      if (run?.status === 'completed' && !current.labels.some(label => label.name === 'agent-working')) return { state: 'terminal', integrationRun: entry.hint.run };
    }
    if (attempt === 60 || Date.now() >= deadline) break;
    await wait(Math.min(5000, Math.max(1, deadline - Date.now())));
  }
  return { state: 'pending' };
}
