import { createHash } from 'node:crypto';
import { deliveryAfterChecks } from './delivery-events.mjs';
import { loadProposalReview } from './proposal-review.mjs';
import { taskDigest } from './issue-actions.mjs';
import { validateGithubProfile } from './github-profile.mjs';

export const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
export function authorizeCompletion(event, env, stage) {
  const input = event.inputs ?? {};
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_ACTOR !== env.GITHUB_REPOSITORY_OWNER || env.GITHUB_TRIGGERING_ACTOR !== env.GITHUB_REPOSITORY_OWNER || input.stage !== stage || !['integrate', 'review'].includes(stage)) throw Error('Completion requires a fresh owner dispatch');
  if (!/^[1-9][0-9]*$/.test(input.issue ?? '') || !/^[1-9][0-9]*$/.test(input.pull_request ?? '') || !sha(input.head)) throw Error('Issue, pull request and full accepted head SHA are required');
  if (!['false', 'true', false, true, undefined].includes(input.merge)) throw Error('Invalid merge authorization');
  const merge = input.merge === true || input.merge === 'true';
  if (stage === 'review' && merge) throw Error('Review cannot authorize a merge');
  return { issue: Number(input.issue), pr: Number(input.pull_request), head: input.head, merge };
}
export async function authorizeCompletionEvent(api, repository, event, env, stage) {
  if (env.GITHUB_EVENT_NAME === 'workflow_run') {
    const next = await deliveryAfterChecks(api, repository, env.GITHUB_REPOSITORY_OWNER, event);
    if (!next || next.stage !== stage) throw Error('No current delivery authorization after checks');
    const { stage: ignored, ...authorization } = next;
    return authorization;
  }
  if (env.GITHUB_EVENT_NAME !== 'pull_request_review') return authorizeCompletion(event, env, stage);
  const owner = env.GITHUB_REPOSITORY_OWNER;
  if (stage !== 'integrate' || event.action !== 'submitted' || env.GITHUB_ACTOR !== owner || env.GITHUB_TRIGGERING_ACTOR !== owner) throw Error('Merge requires the owner review');
  const review = await loadProposalReview(api, repository, owner, event, env.GITHUB_EVENT_NAME, true);
  if (!review.approved) throw Error('The PR review does not approve this head');
  const reviews = await list(api, `pulls/${review.number}/reviews`);
  const latest = reviews.filter(r => r.user?.login === owner && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(r.state)).sort((a, b) => b.id - a.id)[0];
  if (latest?.id !== review.id || latest.state !== 'APPROVED') throw Error('Owner approval was superseded');
  return { issue: review.issue, pr: review.number, head: review.head, merge: true, approval: { id: review.id, owner, head: review.head } };
}
export async function list(api, path, field) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const response = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    const batch = field ? response[field] : response;
    if (!Array.isArray(batch)) throw Error('Invalid GitHub collection');
    all.push(...batch);
    if (batch.length < 100) return all;
  }
  throw Error('GitHub collection exceeds completion bounds');
}
export async function loadProfile(api, repository, revision) {
  const file = await api(`contents/.lighthouse/github.json?ref=${revision}`);
  const profile = JSON.parse(Buffer.from(file.content, 'base64').toString());
  const errors = validateGithubProfile(profile);
  if (errors.length) throw Error(errors.join('\n'));
  if (profile.repository !== repository || !profile.evidenceBranch || profile.completion?.publishEvidence !== true) throw Error('Completion needs the adopted GitHub profile and explicit evidence publication');
  return profile;
}
export function ruleRevision(source) {
  if (!Number.isFinite(Date.parse(source.updated_at))) throw Error('Ruleset revision timestamp is unavailable');
  return fingerprint(Object.fromEntries(['id', 'source', 'source_type', 'target', 'enforcement', 'updated_at', 'conditions', 'rules'].map(key => [key, source[key]])));
}
export async function evidenceProtection(api, branch, observations = []) {
  const rules = await list(api, `rules/branches/${encodeURIComponent(branch)}`);
  for (const type of ['deletion', 'non_fast_forward']) {
    const matches = rules.filter(r => r.type === type && r.ruleset_source_type === 'Repository');
    let protectedRule = false;
    for (const rule of matches) {
      const source = await api(`rulesets/${rule.ruleset_id}`);
      const bypassVerified = Array.isArray(source.bypass_actors) ? source.bypass_actors.length === 0 : observations.some(o => o.id === source.id && o.revision === ruleRevision(source));
      if (source.enforcement === 'active' && bypassVerified) protectedRule = true;
    }
    if (!protectedRule) throw Error(`Evidence branch lacks enforced ${type} protection without bypass`);
  }
}
export async function requiredPolicy(api, branch, profile) {
  const rules = await list(api, `rules/branches/${encodeURIComponent(branch)}`);
  const metadata = await api(`branches/${encodeURIComponent(branch)}`);
  const classic = metadata?.protection?.enabled === false ? null : await api(`branches/${encodeURIComponent(branch)}/protection`, 'GET', undefined, true);
  if (rules.some(r => r.type === 'merge_queue')) throw Error('Merge queues require a queue-aware adapter');
  const checks = rules.filter(r => r.type === 'required_status_checks').flatMap(r => r.parameters.required_status_checks.map(c => ({ context: c.context, app: c.integration_id ?? null })));
  for (const c of classic?.required_status_checks?.checks ?? []) checks.push({ context: c.context, app: c.app_id ?? null });
  for (const context of classic?.required_status_checks?.contexts ?? []) if (!checks.some(c => c.context === context)) checks.push({ context, app: null });
  for (const configured of profile.requiredChecks) if (!checks.some(c => c.context === configured.context && c.app === configured.integrationId)) throw Error(`Configured required check is not enforced: ${configured.context}`);
  return { rules, classic, checks: [...new Map(checks.map(c => [JSON.stringify(c), c])).values()] };
}
export async function observeChecks(api, revision, workflowRunId = null) {
  const excluded = new Set();
  if (workflowRunId !== null) {
    if (!/^[1-9][0-9]*$/.test(String(workflowRunId))) throw Error('Invalid current workflow run');
    for (const job of await list(api, `actions/runs/${workflowRunId}/jobs?filter=all`, 'jobs')) {
      const id = job.check_run_url?.match(/\/check-runs\/([1-9][0-9]*)$/)?.[1];
      if (!id) throw Error('Current workflow job check identity is unavailable');
      excluded.add(id);
    }
  }
  const runs = await list(api, `commits/${revision}/check-runs?filter=latest`, 'check_runs');
  const statuses = await list(api, `commits/${revision}/statuses`);
  const latest = [...new Map(statuses.map(s => [s.context, s]).reverse()).values()];
  return [
    ...runs.filter(r => !excluded.has(String(r.id))).map(r => ({ evidenceId: `github-check:${r.id}`, name: r.name, revision, app: r.app?.id, status: r.head_sha !== revision ? 'failed' : r.status !== 'completed' ? 'unavailable' : ['success', 'neutral', 'skipped'].includes(r.conclusion) ? 'passed' : 'failed', state: r.status === 'completed' ? r.conclusion : 'pending', url: r.html_url })),
    ...latest.map(s => ({ evidenceId: `github-status:${s.id}`, name: s.context, revision, status: s.state === 'success' ? 'passed' : s.state === 'pending' ? 'unavailable' : 'failed', state: s.state, url: s.target_url })),
  ];
}
export function assertCitedChecks(envelope, before, after) {
  for (const evidence of envelope.result.evidence) {
    if (evidence.status !== 'passed') continue;
    const cited = (before.observedChecks ?? []).filter(c => evidence.id === c.evidenceId || c.url && evidence.source === c.url);
    for (const check of cited) {
      const current = (after.observedChecks ?? []).find(c => c.evidenceId === check.evidenceId && c.revision === check.revision);
      if (check.status !== 'passed' || current?.status !== 'passed') throw Error(`Cited CI evidence changed or is unavailable: ${check.name}`);
    }
  }
}
export async function checkCommit(api, revision, required) {
  const runs = await list(api, `commits/${revision}/check-runs?filter=latest`, 'check_runs');
  const statuses = await list(api, `commits/${revision}/statuses`);
  const latest = [...new Map(statuses.map(s => [s.context, s]).reverse()).values()];
  return required.map(c => {
    const matches = runs.filter(r => r.name === c.context && (c.app === null || r.app?.id === c.app));
    const status = latest.find(s => s.context === c.context);
    const passed = (matches.length > 0 || c.app === null && status?.state === 'success') && matches.every(r => r.head_sha === revision && r.status === 'completed' && ['success', 'neutral', 'skipped'].includes(r.conclusion)) && (!status || status.state === 'success');
    const failed = matches.some(r => r.head_sha !== revision || r.status === 'completed' && !['success', 'neutral', 'skipped'].includes(r.conclusion)) || ['error', 'failure'].includes(status?.state);
    const pending = matches.some(r => r.status !== 'completed') || status?.state === 'pending';
    return { ...c, revision, status: passed ? 'passed' : failed ? 'failed' : 'unavailable', state: passed ? 'passed' : failed ? 'failed' : pending ? 'pending' : 'missing', checks: matches.map(r => ({ id: r.id, url: r.html_url, status: r.status, conclusion: r.conclusion, app: r.app?.id })), commitStatus: status ? { state: status.state, url: status.target_url } : null };
  });
}
export function completionEffects(stage, status) {
  return stage === 'review' && status === 'passed' ? { add: [], remove: ['waiting-review', 'ready', 'integrate', 'review'], closeIssue: true } : { add: ['waiting-review'], remove: [], closeIssue: false };
}
export async function inspectCompletion(api, repository, owner, input, stage, workflowRunId = null) {
  const repo = await api(''), current = await api(`commits/${encodeURIComponent(repo.default_branch)}`);
  const profile = await loadProfile(api, repository, current.sha);
  if (profile.evidenceBranch === repo.default_branch) throw Error('Evidence branch must be separate');
  await evidenceProtection(api, profile.evidenceBranch, profile.completion.protectionObservations);
  const pr = await api(`pulls/${input.pr}`), issue = await api(`issues/${input.issue}`);
  if (pr.head.sha !== input.head || pr.head.repo?.full_name !== repository || pr.base.repo.full_name !== repository || pr.base.ref !== repo.default_branch || issue.pull_request || issue.user.login !== owner) throw Error('Accepted PR identity or work-item authority changed');
  if (stage === 'review' && !pr.merged || stage === 'integrate' && !pr.merged && (pr.state !== 'open' || pr.draft || issue.state !== 'open')) throw Error('PR is not eligible for this stage');
  const comments = await list(api, `issues/${input.issue}/comments`);
  const answers = comments.filter(c => c.user.login === owner && !/<!-- lighthouse-(?:actions|completion|run):/.test(c.body)).map(c => ({ id: c.id, body: c.body, updated_at: c.updated_at }));
  const policy = await requiredPolicy(api, repo.default_branch, profile);
  let checkedRevision = pr.merged ? pr.merge_commit_sha : pr.head.sha;
  if (!pr.merged && sha(pr.merge_commit_sha)) {
    const test = await api(`git/commits/${pr.merge_commit_sha}`, 'GET', undefined, true);
    if (test?.parents?.some(p => p.sha === input.head) && test.parents.some(p => p.sha === current.sha)) {
      const mergeChecks = await checkCommit(api, pr.merge_commit_sha, policy.checks);
      if (mergeChecks.some(c => c.checks.length || c.commitStatus)) checkedRevision = pr.merge_commit_sha;
    }
  }
  const checks = await checkCommit(api, checkedRevision, policy.checks);
  const observedChecks = (await Promise.all([...new Set([pr.head.sha, checkedRevision])].map(revision => observeChecks(api, revision, workflowRunId)))).flat();
  const reviews = await list(api, `pulls/${input.pr}/reviews`);
  const prAnswers = (await list(api, `issues/${input.pr}/comments`)).filter(c => c.user.login === owner && !/<!-- lighthouse-(?:actions|completion|run):/.test(c.body)).map(c => ({ id: c.id, body: c.body, updated_at: c.updated_at, url: c.html_url }));
  const files = await list(api, `pulls/${input.pr}/files`);
  if (files.length !== pr.changed_files) throw Error('Incomplete changed-file inventory');
  const binding = { repository, issue: input.issue, pr: input.pr, head: input.head, base: pr.merged ? pr.merge_commit_sha : current.sha, branch: repo.default_branch, intent: taskDigest(issue, answers), policy: fingerprint({ profile, policy }), reviews: fingerprint(reviews.map(r => ({ id: r.id, state: r.state, commit_id: r.commit_id }))), prIntent: fingerprint({ title: pr.title, body: pr.body, prAnswers }), files: fingerprint(files.map(f => ({ path: f.filename, sha: f.sha, status: f.status }))) };
  return { binding, observedChecks, finalization: { executor: 'trusted publisher after current-stage validation', observedIssue: { state: issue.state, labels: issue.labels.map(l => l.name) }, observedPullRequest: { state: pr.state, merged: pr.merged, labels: (pr.labels ?? []).map(l => l.name) }, onPassed: completionEffects(stage, 'passed'), onBlocked: completionEffects(stage, 'blocked'), pullRequestLabels: 'preserve', reservation: 'agent-working is added after this observation and released by host cleanup for every outcome' }, workItem: { title: issue.title, body: issue.body, ownerAnswers: answers }, pullRequest: { title: pr.title, body: pr.body, ownerAnswers: prAnswers, reviews: reviews.map(r => ({ author: r.user.login, body: r.body, state: r.state, commit: r.commit_id, url: r.html_url })) }, profile, policy, checks, checkedRevision, merged: pr.merged, merge: pr.merged ? pr.merge_commit_sha : null, mergeable: pr.mergeable === true && ['clean', 'unstable', 'has_hooks'].includes(pr.mergeable_state), title: issue.title, issueUrl: issue.html_url, prUrl: pr.html_url, labels: issue.labels.map(l => l.name), files: files.map(f => ({ path: f.filename, status: f.status, sha: f.sha })), currentRevision: current.sha, mergeActor: pr.merged_by?.login ?? null };
}
export function assertFresh(before, after) {
  if (fingerprint(before.binding) !== fingerprint(after.binding) || before.merged !== after.merged) throw Error('Completion evidence is stale: head, base, intent, policy, review or scope changed');
}
export function assertChecks(observation) {
  if (!observation.checks.length || observation.checks.some(c => c.status !== 'passed')) throw Error('Required checks are missing, pending or failed');
}
export async function mergeAccepted(api, snapshot, recheck) {
  const fresh = await recheck();
  if (fresh.merged && fresh.binding.head === snapshot.binding.head) return { state: 'merged', sha: fresh.merge, recovered: true };
  assertFresh(snapshot, fresh); assertChecks(fresh);
  if (!fresh.mergeable) throw Error('GitHub has not declared the PR mergeable under its rules');
  try {
    const result = await api(`pulls/${snapshot.binding.pr}/merge`, 'PUT', { sha: snapshot.binding.head, merge_method: 'squash' });
    if (!result.merged || !sha(result.sha)) throw Error('GitHub did not confirm merge');
    return { state: 'merged', sha: result.sha, recovered: false };
  } catch (error) {
    // Reconcile once; a lost response is not permission to repeat the merge.
    const pr = await api(`pulls/${snapshot.binding.pr}`);
    if (pr.merged && pr.head.sha === snapshot.binding.head && sha(pr.merge_commit_sha)) return { state: 'merged', sha: pr.merge_commit_sha, recovered: true };
    throw error;
  }
}
export async function postMergeRuns(api, snapshot, revision, dispatch = false) {
  const results = [];
  for (const workflow of snapshot.profile.completion.postMergeWorkflows) {
    const runs = await list(api, `actions/workflows/${encodeURIComponent(workflow)}/runs?head_sha=${revision}`, 'workflow_runs');
    const matching = runs.filter(r => r.head_sha === revision && r.head_branch === snapshot.binding.branch && ['push', 'workflow_dispatch'].includes(r.event)).sort((a, b) => b.id - a.id)[0];
    if (!matching && dispatch) {
      if ((await api(`commits/${encodeURIComponent(snapshot.binding.branch)}`)).sha !== revision) throw Error('Default branch advanced before post-merge dispatch');
      await api(`actions/workflows/${encodeURIComponent(workflow)}/dispatches`, 'POST', { ref: snapshot.binding.branch });
    }
    results.push({ workflow, revision, state: matching?.status === 'completed' ? matching.conclusion === 'success' ? 'passed' : 'failed' : matching ? 'pending' : 'missing', status: matching?.status === 'completed' ? matching.conclusion === 'success' ? 'passed' : 'failed' : 'unavailable', runId: matching?.id ?? null, url: matching?.html_url ?? null });
  }
  return results;
}
