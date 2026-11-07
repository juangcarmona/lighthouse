import { inspectCompletion, postMergeRuns, list } from './completion.mjs';
import { readIntegrationEvidence } from './integration-evidence.mjs';
import { issueComments, readDispatchReceipt } from './stage-dispatch.mjs';
import { validPendingReview } from './completion-status.mjs';

const paused = issue => issue.state !== 'open' || issue.labels.some(label => ['agent-working', 'human-working', 'future', 'needs-info', 'waiting-review'].includes(label.name));
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
