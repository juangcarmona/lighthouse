// Cost guardrails for automated agent stages. Every worker dispatch passes
// through recordDispatch, which asks this module whether another model run is
// affordable before it records a receipt. A refusal is typed, labelled and
// explained once; only an explicit owner action resumes the issue.

export const budgetLabel = 'lighthouse:budget-exceeded';
export const executionFailedLabel = 'execution-failed';
// Either label pauses automated dispatch until the owner removes it.
export const pauseLabels = [executionFailedLabel, budgetLabel];

export const budgetDefaults = Object.freeze({
  perIssueStage: 3,
  consecutiveFailures: 2,
  dailyAgentRuns: 20,
});

const dayMs = 24 * 60 * 60 * 1000;
const failedConclusions = ['failure', 'cancelled', 'timed_out', 'startup_failure'];
const budgetMarker = /<!-- lighthouse-budget:([a-z0-9:-]+) -->/;
const isBot = comment => comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot';

function positiveInteger(value, fallback) {
  return /^[1-9][0-9]*$/.test(String(value ?? '')) ? Number(value) : fallback;
}

// Repository variables reach the workflow as environment values. Invalid or
// missing values fall back to the defaults instead of disabling the guard.
export function readBudgetLimits(env = process.env) {
  return {
    perIssueStage: positiveInteger(env.LIGHTHOUSE_ISSUE_STAGE_RUNS, budgetDefaults.perIssueStage),
    consecutiveFailures: positiveInteger(env.LIGHTHOUSE_CONSECUTIVE_FAILURES, budgetDefaults.consecutiveFailures),
    dailyAgentRuns: positiveInteger(env.LIGHTHOUSE_DAILY_AGENT_RUNS, budgetDefaults.dailyAgentRuns),
  };
}

// A receipt counts as a failed attempt when its recorded outcome failed or
// when the worker run ended badly without publishing any outcome.
export function isFailedAttempt({ receipt, run }) {
  if (['failed', 'cancelled'].includes(receipt.status)) return true;
  if (['completed', 'waiting', 'blocked'].includes(receipt.status)) return false;
  return run?.status === 'completed' && failedConclusions.includes(run.conclusion);
}

const createdAt = comment => Date.parse(comment.created_at ?? '');

// Comments without a parseable timestamp are counted: the guard fails closed.
function withinWindow(comment, since) {
  const time = createdAt(comment);
  return Number.isNaN(time) || time >= since;
}

// history: [{ comment, receipt, run }] for one issue in comment order.
export function issueStageBudget(history, worker, { limits, now, resetAt = 0, workerOf }) {
  const since = Math.max(now - dayMs, resetAt);
  const attempts = history.filter(entry => workerOf(entry.receipt) === worker && withinWindow(entry.comment, since));
  let consecutive = 0;
  for (let index = attempts.length - 1; index >= 0 && isFailedAttempt(attempts[index]); index--) consecutive++;
  if (consecutive >= limits.consecutiveFailures) {
    return { scope: 'consecutive-failures', count: consecutive, limit: limits.consecutiveFailures,
      reason: `The last ${consecutive} ${worker} attempts on this issue failed or were cancelled.` };
  }
  if (attempts.length >= limits.perIssueStage) {
    return { scope: 'issue-stage', count: attempts.length, limit: limits.perIssueStage,
      reason: `${attempts.length} ${worker} attempts were requested for this issue in the last 24 hours.` };
  }
  return null;
}

// The owner resets an issue budget by removing the budget label. Only attempts
// requested after the latest human removal count again.
export async function budgetResetTime(api, issue) {
  let latest = 0;
  for (let page = 1; page <= 5; page++) {
    const events = await api(`issues/${issue}/events?per_page=100&page=${page}`);
    for (const event of events) {
      if (event.event !== 'unlabeled' || event.label?.name !== budgetLabel || event.actor?.type === 'Bot') continue;
      latest = Math.max(latest, Date.parse(event.created_at ?? '') || 0);
    }
    if (events.length < 100) break;
  }
  return latest;
}

// Counts agent worker runs dispatched in the repository during the last 24h.
// Stops early once the cap is reached; a failed lookup fails the dispatch.
export async function countDailyAgentRuns(api, { now, cap, workerPaths }) {
  const since = new Date(now - dayMs).toISOString();
  let count = 0;
  for (let page = 1; page <= 10; page++) {
    const result = await api(`actions/runs?event=workflow_dispatch&created=%3E%3D${encodeURIComponent(since)}&per_page=100&page=${page}`);
    const runs = result?.workflow_runs ?? [];
    count += runs.filter(run => workerPaths.includes(run.path)).length;
    if (count >= cap || runs.length < 100) return count;
  }
  return count;
}

export function dailyBudget(count, limits) {
  if (count < limits.dailyAgentRuns) return null;
  return { scope: 'repository-daily', count, limit: limits.dailyAgentRuns,
    reason: `${count} agent runs were dispatched in this repository in the last 24 hours (limit ${limits.dailyAgentRuns}).` };
}

const nextAction = {
  'issue-stage': `Owner: inspect the earlier attempts, then remove the \`${budgetLabel}\` label to allow new attempts.`,
  'consecutive-failures': `Owner: inspect the failed executions and fix the cause, then remove the \`${budgetLabel}\` label to allow new attempts.`,
  'repository-daily': 'Owner: wait for the 24-hour window to roll over, or raise `LIGHTHOUSE_DAILY_AGENT_RUNS` deliberately.',
  paused: 'Owner: inspect the latest outcome, then remove the pause label to allow new attempts.',
};

export function budgetCommentBody(worker, refusal, marker) {
  return [
    `### Agent budget reached · ${worker}`,
    '',
    `${refusal.reason} No worker was dispatched and no model tokens were spent.`,
    '',
    nextAction[refusal.scope],
    '',
    `<!-- lighthouse-budget:${marker} -->`,
  ].join('\n');
}

// Daily refusals share a marker per UTC day; issue refusals share one per worker.
function refusalMarker(worker, refusal, now) {
  return refusal.scope === 'repository-daily' ? `${worker}:daily:${new Date(now).toISOString().slice(0, 10)}` : `${worker}:${refusal.scope}`;
}

// Posts at most one explanation per worker and scope after the latest receipt.
export async function explainRefusal(api, request, worker, refusal, comments, { now, latestReceiptId = 0 }) {
  const marker = refusalMarker(worker, refusal, now);
  const existing = comments.find(comment => isBot(comment) && Number(comment.id) > Number(latestReceiptId) && comment.body?.match(budgetMarker)?.[1] === marker);
  if (refusal.scope !== 'repository-daily') await api(`issues/${request.issue}/labels`, 'POST', { labels: [budgetLabel] });
  if (existing) return existing;
  return api(`issues/${request.issue}/comments`, 'POST', { body: budgetCommentBody(worker, refusal, marker) });
}

export function budgetResult(refusal, comment) {
  return { send: false, code: refusal.scope === 'paused' ? 'dispatch-paused' : 'budget-exhausted', scope: refusal.scope,
    count: refusal.count, limit: refusal.limit, reason: refusal.reason, comment };
}
