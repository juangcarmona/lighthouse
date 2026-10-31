import { readFile } from 'node:fs/promises';
import { checkImplementationPullRequest } from './proposal-review.mjs';
import { authorizedCiCallback, isProductOnlyPullRequest, projectImplementationPrState, reconcileImplementationPr, scheduledImplementationPulls, setPullRequestDraft } from './pr-state.mjs';
import { handoff } from './handoff.mjs';

const apiFor = (repo, token) => async (path, method = 'GET', body, optional = false) => {
  const response = await fetch(`https://api.github.com/repos/${repo}${path ? `/${path}` : ''}`, {
    method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  if (optional && response.status === 404) return null;
  if (!response.ok) throw Error(`GitHub ${method} ${path}: ${response.status}`);
  return response.status === 204 ? null : response.json();
};
const commentsFor = async (api, issue) => {
  const comments = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await api(`issues/${issue}/comments?per_page=100&page=${page}`);
    comments.push(...batch);
    if (batch.length < 100) return comments;
  }
  throw Error('Issue comment history exceeds bound');
};
const requiredChecks = profile => {
  const checks = profile.requiredChecks;
  if (!Array.isArray(checks) || !checks.length || checks.length > 20 || checks.some(item => !item.context || item.integrationId !== null && !Number.isSafeInteger(item.integrationId))) throw Error('Invalid required-check profile');
  return checks.map(item => ({ context: item.context, app: item.integrationId }));
};
async function main() {
  const env = process.env, repo = env.GITHUB_REPOSITORY, owner = env.GITHUB_REPOSITORY_OWNER;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? '') || !env.GH_TOKEN) throw Error('Missing repository or token');
  const api = apiFor(repo, env.GH_TOKEN);
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
  const metadata = await api('');
  const config = await api(`contents/.lighthouse/github.json?ref=${metadata.default_branch}`, 'GET', undefined, true);
  if (!config) return;
  const profile = JSON.parse(Buffer.from(config.content, 'base64').toString());
  if (profile.repository !== repo) throw Error('Repository profile differs from the event');
  let candidates = [];
  const ciCallback = env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.LIGHTHOUSE_CI_RECONCILE === 'true';
  if (env.GITHUB_EVENT_NAME === 'pull_request') {
    if (env.GITHUB_ACTOR !== owner || !['ready_for_review', 'converted_to_draft', 'closed', 'reopened'].includes(event.action)) return;
    candidates = [event.pull_request?.number];
  } else if (env.GITHUB_EVENT_NAME === 'workflow_run') {
    const id = event.workflow_run?.id;
    if (event.action !== 'completed' || !Number.isSafeInteger(id)) return;
    const run = await api(`actions/runs/${id}`);
    if (run.status !== 'completed' || run.conclusion !== 'success' || run.head_sha !== event.workflow_run.head_sha || run.repository?.full_name !== repo || !profile.completion?.postMergeWorkflows?.some(name => run.path === `.github/workflows/${name}`)) return;
    const pulls = await api(`commits/${run.head_sha}/pulls?per_page=100`);
    if (pulls.length >= 100) throw Error('PR lookup exceeds bound');
    candidates = pulls.filter(pr => pr.head?.sha === run.head_sha).map(pr => pr.number);
  } else if (env.GITHUB_EVENT_NAME === 'schedule') {
    candidates = await scheduledImplementationPulls(api);
  } else if (ciCallback) {
    const id = Number(env.GITHUB_RUN_ID);
    if (!Number.isSafeInteger(id) || !/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '')) throw Error('CI callback lacks a run or head');
    const run = await api(`actions/runs/${id}`);
    if (!authorizedCiCallback(run, { id, sha: env.GITHUB_SHA, repo, workflows: profile.completion?.postMergeWorkflows })) return;
    const pulls = await api(`commits/${run.head_sha}/pulls?per_page=100`);
    if (pulls.length >= 100) throw Error('PR lookup exceeds bound');
    candidates = pulls.filter(pr => pr.head?.sha === run.head_sha).map(pr => pr.number);
  } else return;
  for (const number of candidates) {
    if (!Number.isSafeInteger(number)) continue;
    const pr = await api(`pulls/${number}`);
    if (env.GITHUB_EVENT_NAME === 'pull_request' && pr.head.sha !== event.pull_request.head.sha) continue;
    if (env.GITHUB_EVENT_NAME === 'workflow_run' && pr.head.sha !== event.workflow_run.head_sha) continue;
    if (ciCallback && pr.head.sha !== env.GITHUB_SHA) continue;
    if (pr.base.ref !== metadata.default_branch) continue;
    let target;
    try { target = checkImplementationPullRequest({ ...pr, state: 'open', merged: false }, repo); }
    catch {
      if (isProductOnlyPullRequest(pr)) continue;
      const match = pr.head.ref.match(/^lighthouse\/(?:implement|propose)-([1-9][0-9]*)-[a-f0-9]{12}$/);
      if (pr.head.ref.startsWith('lighthouse/propose-') && !pr.body?.includes('<!-- lighthouse-product-implementation:')) continue;
      if (!match || pr.user?.login !== 'github-actions[bot]' || pr.head.repo?.full_name !== repo || pr.base.repo?.full_name !== repo || pr.state !== 'open') continue;
      const issue = await api(`issues/${match[1]}`);
      if (issue.state !== 'open') continue;
      if (!pr.draft) await setPullRequestDraft(env.GH_TOKEN, pr, true);
      await projectImplementationPrState(api, issue.number, true);
      const notice = `<!-- lighthouse-pr-link-changed:${pr.number}:${pr.head.sha} -->`;
      if (!(await commentsFor(api, issue.number)).some(comment => comment.user?.login === 'github-actions[bot]' && comment.body?.includes(notice))) await api(`issues/${issue.number}/comments`, 'POST', { body: handoff({ status: 'blocked', stage: 'implement', happened: `PR #${pr.number} is back in draft because its Lighthouse link changed.`, action: 'The PR owner must restore the link in the PR description.', next: 'The workflow can recheck the PR after the link is restored.', link: `[Open PR](${pr.html_url})`, details: notice }) });
      continue;
    }
    const issue = await api(`issues/${target.issue}`);
    if (issue.state !== 'open') continue;
    if (pr.state !== 'open' || pr.merged) {
      for (const name of ['pr-draft', 'pr-ready']) if (issue.labels.some(label => label.name === name)) await api(`issues/${issue.number}/labels/${name}`, 'DELETE', undefined, true);
      if (!pr.merged) {
        const notice = `<!-- lighthouse-pr-closed:${pr.number}:${pr.head.sha} -->`;
        if (!(await commentsFor(api, issue.number)).some(comment => comment.user?.login === 'github-actions[bot]' && comment.body?.includes(notice))) await api(`issues/${issue.number}/comments`, 'POST', { body: handoff({ status: 'blocked', stage: 'implement', happened: `PR #${pr.number} was closed without merging.`, action: 'The owner can reopen the PR or request a new implementation.', next: 'No implementation resumes until an authorized request is made.', link: `[Open PR](${pr.html_url})`, details: notice }) });
      }
      continue;
    }
    const comments = await commentsFor(api, target.issue);
    if (event.action === 'converted_to_draft') {
      const hold = `<!-- lighthouse-pr-hold:${pr.number}:${pr.head.sha} -->`;
      await projectImplementationPrState(api, target.issue, true);
      if (!comments.some(comment => comment.user?.login === 'github-actions[bot]' && comment.body?.includes(hold))) await api(`issues/${target.issue}/comments`, 'POST', { body: handoff({ status: 'blocked', stage: 'implement', happened: `PR #${pr.number} is a draft by owner choice.`, action: 'The PR owner can mark it ready when appropriate.', next: 'Automatic readiness remains on hold until the owner changes the PR state.', link: `[Open PR](${pr.html_url})`, details: hold }) });
      continue;
    }
    const hold = comments.some(comment => comment.user?.login === 'github-actions[bot]' && comment.body?.includes(`<!-- lighthouse-pr-hold:${pr.number}:${pr.head.sha} -->`));
    const auto = (['workflow_run', 'schedule'].includes(env.GITHUB_EVENT_NAME) || ciCallback) && !hold;
    const result = await reconcileImplementationPr(api, repo, pr, issue, comments, requiredChecks(profile), (current, draft) => setPullRequestDraft(env.GH_TOKEN, current, draft), { auto });
    if (event.action === 'ready_for_review' && result.status === 'draft') await api(`issues/${target.issue}/comments`, 'POST', { body: handoff({ status: 'blocked', stage: 'implement', happened: `PR #${pr.number} remains a draft: ${result.reason}.`, action: 'The PR owner should resolve the stated blocker.', next: 'The workflow rechecks readiness when the relevant checks or PR state change.', link: `[Open PR](${pr.html_url})` }) });
  }
}
main().catch(error => { console.error(`::error::${error.message}`); process.exitCode = 1; });
