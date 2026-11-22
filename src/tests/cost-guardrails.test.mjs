import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dispatchId, dispatchReceiptBody, recordDispatch, stagePath } from '../packages/sdlc/src/stage-dispatch.mjs';
import { budgetDefaults, budgetLabel, readBudgetLimits, isFailedAttempt } from '../packages/sdlc/src/dispatch-budget.mjs';
import { routeIssue } from '../packages/sdlc/src/issue-entry.mjs';
import { classifyTechnicalFailure } from '../packages/sdlc/src/worker-recovery.mjs';
import { executionTokenLimit, tokenMeter, executionFailure, executionLimits, defaultTokenLimits } from '../packages/sdlc/src/execution-resources.mjs';
import { tokenUsageSummary } from '../packages/sdlc/src/telemetry-opencode.mjs';
import { killSwitch, parseRepositories } from '../packages/sdlc/src/kill-switch.mjs';

const repo = 'owner/repo', issueNumber = 18, bot = { login: 'github-actions[bot]', type: 'Bot' };
const now = Date.parse('2026-11-22T12:00:00Z');
const hoursAgo = hours => new Date(now - hours * 3600_000).toISOString();
const limits = { ...budgetDefaults };

// A fake GitHub API holding prior dispatch receipts for one issue and worker.
function fixture({ prior = [], labels = [], events = [], dailyRuns = 0 } = {}) {
  const comments = [], runs = new Map(), posts = [];
  prior.forEach(({ hours, status = 'completed', conclusion = 'success', stage = 'implement' }, index) => {
    const routerRunId = String(100 + index), workerRunId = String(500 + index);
    const receipt = { schemaVersion: 1, stage, status, id: dispatchId(repo, routerRunId, stage), digest: 'd'.repeat(64), routerRunId, routerAttempt: 1, workerRunId };
    comments.push({ id: 30 + index, user: bot, created_at: hoursAgo(hours), issue_url: `https://api.github.com/repos/${repo}/issues/${issueNumber}`, html_url: `https://github.com/${repo}/issues/${issueNumber}#issuecomment-${30 + index}`, body: dispatchReceiptBody(repo, receipt) });
    runs.set(workerRunId, { id: Number(workerRunId), path: stagePath(stage), status: 'completed', conclusion, repository: { full_name: repo } });
  });
  const api = async (path, method = 'GET', body) => {
    if (method === 'POST') {
      posts.push({ path, body });
      if (path === `issues/${issueNumber}/comments`) { const comment = { id: 90 + posts.length, user: bot, created_at: new Date(now).toISOString(), html_url: `https://github.com/${repo}/issues/${issueNumber}#issuecomment-${90 + posts.length}`, issue_url: `https://api.github.com/repos/${repo}/issues/${issueNumber}`, body: body.body }; comments.push(comment); return comment; }
      return {};
    }
    if (path.startsWith(`issues/${issueNumber}/comments?`)) return comments;
    if (path === `issues/${issueNumber}`) return { number: issueNumber, state: 'open', labels: labels.map(name => ({ name })) };
    if (path.startsWith(`issues/${issueNumber}/events?`)) return events;
    if (path.startsWith('actions/runs/')) return runs.get(path.split('/')[2]);
    if (path.startsWith('actions/runs?')) return { total_count: dailyRuns, workflow_runs: Array.from({ length: dailyRuns }, (_, id) => ({ id, path: stagePath('refine') })) };
    throw Error(`Unexpected API request: ${method} ${path}`);
  };
  const request = (stage = 'implement') => ({ schemaVersion: 1, id: dispatchId(repo, '999', stage), repository: repo, issue: issueNumber, stage, routerRunId: '999', routerAttempt: 1 });
  return { api, comments, posts, request };
}

const record = (f, request = f.request(), options = {}) => recordDispatch(f.api, repo, request, { limits, now, ...options });
const labelPosts = f => f.posts.filter(post => post.path === `issues/${issueNumber}/labels`);
const commentPosts = f => f.posts.filter(post => post.path === `issues/${issueNumber}/comments`);

test('budget limits default sanely and ignore invalid repository variables', () => {
  assert.deepEqual(readBudgetLimits({}), { perIssueStage: 3, consecutiveFailures: 2, dailyAgentRuns: 20 });
  assert.deepEqual(readBudgetLimits({ LIGHTHOUSE_ISSUE_STAGE_RUNS: '5', LIGHTHOUSE_CONSECUTIVE_FAILURES: '0', LIGHTHOUSE_DAILY_AGENT_RUNS: 'many' }), { perIssueStage: 5, consecutiveFailures: 2, dailyAgentRuns: 20 });
});

test('a worker run that ended badly without an outcome counts as a failed attempt', () => {
  assert.equal(isFailedAttempt({ receipt: { status: 'failed' } }), true);
  assert.equal(isFailedAttempt({ receipt: { status: 'running' }, run: { status: 'completed', conclusion: 'timed_out' } }), true);
  assert.equal(isFailedAttempt({ receipt: { status: 'completed' }, run: { status: 'completed', conclusion: 'failure' } }), false);
  assert.equal(isFailedAttempt({ receipt: { status: 'running' }, run: { status: 'in_progress' } }), false);
});

test('dispatch within budget records a receipt as before', async () => {
  const f = fixture({ prior: [{ hours: 2 }, { hours: 1, status: 'failed', conclusion: 'failure' }] });
  const recorded = await record(f);
  assert.equal(recorded.send, true);
  assert.equal(labelPosts(f).length, 0);
});

test('a third attempt for the same issue and worker within 24 hours is refused once, with label and one comment', async () => {
  const f = fixture({ prior: [{ hours: 20 }, { hours: 10 }, { hours: 1 }] });
  const refused = await record(f);
  assert.equal(refused.send, false);
  assert.equal(refused.code, 'budget-exhausted');
  assert.equal(refused.scope, 'issue-stage');
  assert.deepEqual(labelPosts(f).map(post => post.body), [{ labels: [budgetLabel] }]);
  assert.equal(commentPosts(f).length, 1);
  assert.match(commentPosts(f)[0].body.body, /no model tokens were spent/);
  const again = await record(f, { ...f.request(), id: dispatchId(repo, '1000', 'implement'), routerRunId: '1000' });
  assert.equal(again.code, 'budget-exhausted');
  assert.equal(commentPosts(f).length, 1, 'the explanation is deduplicated');
  assert.equal(again.comment.id, refused.comment.id);
});

test('attempts older than 24 hours and other workers do not consume the budget', async () => {
  const f = fixture({ prior: [{ hours: 30 }, { hours: 26 }, { hours: 2, stage: 'refine' }, { hours: 1 }] });
  assert.equal((await record(f)).send, true);
});

test('two consecutive failed or cancelled attempts stop further dispatch', async () => {
  const f = fixture({ prior: [{ hours: 3, status: 'failed', conclusion: 'failure' }, { hours: 1, status: 'cancelled', conclusion: 'cancelled' }] });
  const refused = await record(f);
  assert.equal(refused.code, 'budget-exhausted');
  assert.equal(refused.scope, 'consecutive-failures');
  assert.equal(labelPosts(f).length, 1);
});

test('the owner removing the budget label resets the counted window', async () => {
  const events = [{ event: 'unlabeled', label: { name: budgetLabel }, actor: { login: 'owner', type: 'User' }, created_at: hoursAgo(0.5) }];
  const f = fixture({ prior: [{ hours: 3, status: 'failed', conclusion: 'failure' }, { hours: 1, status: 'failed', conclusion: 'failure' }], events });
  assert.equal((await record(f)).send, true);
  const botReset = fixture({ prior: [{ hours: 3, status: 'failed', conclusion: 'failure' }, { hours: 1, status: 'failed', conclusion: 'failure' }], events: [{ ...events[0], actor: bot }] });
  assert.equal((await record(botReset)).code, 'budget-exhausted', 'only a human removal resets the budget');
});

test('execution-failed and the budget label pause dispatch without further comments', async () => {
  for (const label of ['execution-failed', budgetLabel]) {
    const f = fixture({ labels: [label] });
    const refused = await record(f);
    assert.equal(refused.code, 'dispatch-paused');
    assert.equal(refused.comment, null);
    assert.equal(f.posts.length, 0);
  }
});

test('the repository daily agent-run cap refuses dispatch without pausing the issue', async () => {
  const f = fixture({ dailyRuns: 20 });
  const refused = await record(f);
  assert.equal(refused.code, 'budget-exhausted');
  assert.equal(refused.scope, 'repository-daily');
  assert.equal(labelPosts(f).length, 0);
  assert.equal(commentPosts(f).length, 1);
  assert.equal((await record(fixture({ dailyRuns: 19 }))).send, true);
  assert.equal((await record(fixture({ dailyRuns: 5 }), undefined, { limits: { ...limits, dailyAgentRuns: 5 } })).code, 'budget-exhausted');
});

test('owner requests and automated recovery stay paused by execution-failed', () => {
  const event = { action: 'labeled', label: { name: 'implement' }, issue: { number: issueNumber, state: 'open', labels: [{ name: 'implement' }, { name: 'execution-failed' }] } };
  assert.equal(routeIssue(event, 'owner', 'owner', 'issues').run, false);
  assert.equal(routeIssue({ ...event, issue: { ...event.issue, labels: [{ name: 'implement' }] } }, 'owner', 'owner', 'issues').run, true);
  assert.equal(classifyTechnicalFailure({ run: { conclusion: 'failure' }, jobs: [], evidence: { execution: { status: 'token-limit' } } }), 'substantive-failure');
});

test('worker reservation no longer clears execution-failed', async () => {
  const source = await readFile(new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\['needs-info', 'waiting-review', 'execution-failed'/);
});

test('the router template and installed router poll every 30 minutes and pass budget variables', async () => {
  for (const path of ['../packages/sdlc/workflows/lighthouse-sdlc-router.yml', '../../.github/workflows/lighthouse-sdlc-router.yml']) {
    const router = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.match(router, /- cron: '\*\/30 \* \* \* \*'/, path);
    for (const name of ['LIGHTHOUSE_DAILY_AGENT_RUNS', 'LIGHTHOUSE_ISSUE_STAGE_RUNS', 'LIGHTHOUSE_CONSECUTIVE_FAILURES']) assert.ok(router.includes(`${name}: \${{ vars.${name} }}`), `${path} ${name}`);
  }
});

test('the engine token cap counts uncached usage and reports when usage is unobserved', () => {
  assert.equal(executionTokenLimit({}, true), defaultTokenLimits.implementationTokens);
  assert.equal(executionTokenLimit({ resources: { planningTokens: 50_000 } }, false), 50_000);
  assert.throws(() => executionTokenLimit({ resources: { implementationTokens: 5 } }, true), /implementationTokens/);
  assert.deepEqual(executionLimits({ resources: { implementationTokens: 50_000, implementationPids: 512 } }, true).pids, 512);
  const meter = tokenMeter(1000);
  assert.deepEqual(meter.receipt(), { limit: 1000, observedTokens: 0, observedSteps: 0, status: 'unobserved' });
  assert.equal(meter.observe({ type: 'text' }), false);
  assert.equal(meter.observe({ type: 'step_finish', part: { tokens: { input: 400, output: 100, reasoning: 50, cache: { read: 90_000 } } } }), false);
  assert.equal(meter.observe({ type: 'step_finish', part: { tokens: { input: 400, output: 100 } } }), true);
  assert.deepEqual(meter.receipt(), { limit: 1000, observedTokens: 1050, observedSteps: 2, status: 'exceeded' });
  assert.match(executionFailure({ status: 'token-limit', exitCode: null, signal: 'SIGTERM', resources: {} }), /token limit/);
  const summary = tokenUsageSummary({ coverage: 'observed', stepStarts: 2, stepFinishes: 2, tokens: { inputTokens: 800, outputTokens: 200, reasoningTokens: null, cacheReadTokens: 90_000 } }, meter.receipt());
  assert.match(summary, /\| Input tokens \| 800 \|/);
  assert.match(summary, /\| Token cap \| 1050\/1000 \(exceeded\) \|/);
});

test('the kill switch previews by default and sets both variables to false on apply', async () => {
  assert.deepEqual(parseRepositories(['a/b, c/d', '# comment\nc/d\ne/f # trailing']), ['a/b', 'c/d', 'e/f']);
  assert.throws(() => parseRepositories(['not-a-repo']), /Invalid repository/);
  const state = { 'a/b': { LIGHTHOUSE_AUTOMATION_ENABLED: 'true', LIGHTHOUSE_MAINTENANCE_ENABLED: 'false' } }, calls = [];
  const gh = async args => {
    calls.push(args);
    const repository = args[args.indexOf('--repo') + 1];
    if (repository === 'broken/repo') throw Error('HTTP 404');
    if (args[1] === 'list') return JSON.stringify(Object.entries(state[repository]).map(([name, value]) => ({ name, value })));
    state[repository][args[2]] = args[args.indexOf('--body') + 1];
    return '';
  };
  const preview = await killSwitch(['a/b'], { gh });
  assert.equal(preview.mode, 'dry-run');
  assert.deepEqual(preview.results[0].changes, ['LIGHTHOUSE_AUTOMATION_ENABLED']);
  assert.ok(calls.every(args => args[1] === 'list'), 'dry-run never writes');
  assert.equal(state['a/b'].LIGHTHOUSE_AUTOMATION_ENABLED, 'true');
  const applied = await killSwitch(['a/b', 'broken/repo'], { gh, apply: true });
  assert.equal(applied.results[0].status, 'stopped');
  assert.deepEqual(state['a/b'], { LIGHTHOUSE_AUTOMATION_ENABLED: 'false', LIGHTHOUSE_MAINTENANCE_ENABLED: 'false' });
  assert.equal(calls.filter(args => args[1] === 'set').length, 1, 'only variables not already off are written');
  assert.equal(applied.results[1].status, 'error');
});
