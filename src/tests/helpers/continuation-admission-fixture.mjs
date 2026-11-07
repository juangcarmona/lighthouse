import assert from 'node:assert/strict';
import { digest, taskDigest } from '../../packages/sdlc/src/digests.mjs';
import { inspectCompletion } from '../../packages/sdlc/src/completion-state.mjs';
import { dispatchId, dispatchIntent, dispatchArtifact, dispatchReceiptBody } from '../../packages/sdlc/src/stage-dispatch.mjs';
import { maintenancePath } from '../../packages/sdlc/src/worker-recovery.mjs';
const repository = 'owner/repo', owner = 'owner', old = 'a'.repeat(40), current = 'b'.repeat(40), head = 'c'.repeat(40), merge = 'd'.repeat(40);
export async function fixture() {
  const bot = { login: 'github-actions[bot]', type: 'Bot' }, actor = { login: owner };
  const issue = { number: 7, title: 'Characterize the summary', body: 'Preserve existing behavior.', state: 'open', user: actor, labels: [] };
  const profile = { schemaVersion: 1, profileVersion: 1, repository, intake: 'collaborators', requiredChecks: [{ context: 'test', integrationId: 7 }], requiredApprovals: 0, evidenceBranch: 'process/data', completion: { publishEvidence: true, postMergeWorkflows: ['verify.yml'] } };
  const pr = { number: 8, title: 'Characterize the summary', body: `<!-- lighthouse-implementation:${'e'.repeat(64)} -->`, state: 'closed', merged: true, draft: false, changed_files: 1, user: bot, head: { sha: head, ref: `chore/7-lighthouse-implement-${'e'.repeat(12)}`, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, merge_commit_sha: merge };
  const parent = { id: 100, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch', actor: bot, triggering_actor: bot, head_sha: old, head_branch: 'main', repository: { full_name: repository } };
  const run = { ...parent, id: 200, path: '.github/workflows/lighthouse-sdlc-review.lock.yml', head_sha: current, status: 'completed', conclusion: 'failure' };
  const ci = { ...run, id: 90, path: '.github/workflows/verify.yml', event: 'push', head_sha: merge, conclusion: 'success' };
  const maintenance = { ...parent, id: 300, path: maintenancePath, event: 'workflow_dispatch', actor, triggering_actor: actor, head_sha: current };
  const jobs = [{ name: 'Verify accepted commit, checks and evidence protection', conclusion: 'failure' }, { name: 'pre_activation', conclusion: 'skipped' }, { name: 'activation', conclusion: 'skipped' }, { name: 'agent', conclusion: 'skipped' }, { name: 'Validate, publish and release', conclusion: 'skipped' }];
  const comments = [], calls = [], runs = new Map([[100, parent], [200, run], [300, maintenance], [90, ci]]), artifacts = new Map();
  let revision = old;
  const changed = [{ filename: 'docs/acceptance/admission.md', status: 'added' }];
  const reviews = [{ id: 1, user: actor, state: 'APPROVED', commit_id: head }];
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (path === '') return { default_branch: 'main' };
    if (path === 'commits/main') return { sha: revision };
    if (path === 'issues/7') return issue;
    if (path === 'pulls/8') return pr;
    if (path.startsWith('contents/.lighthouse/github.json?')) return { content: Buffer.from(JSON.stringify(profile)).toString('base64') };
    if (path.startsWith('contents/.product/config.yaml?')) return null;
    if (path.startsWith('contents/.lighthouse/reconciliation/labels.json?')) return null;
    if (path.startsWith('rules/branches/process')) return ['deletion', 'non_fast_forward'].map(type => ({ type, ruleset_source_type: 'Repository', ruleset_id: 1 }));
    if (path === 'rulesets/1') return { enforcement: 'active', bypass_actors: [] };
    if (path.startsWith('rules/branches/main')) return [{ type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'test', integration_id: 7 }] } }];
    if (path === 'branches/main') return { protection: { enabled: false } };
    if (path.includes('/check-runs?')) return { check_runs: [{ id: 1, name: 'test', app: { id: 7 }, head_sha: merge, status: 'completed', conclusion: 'success' }] };
    if (path.includes('/statuses?')) return [];
    if (path.startsWith('actions/runs?')) return { total_count: 0, workflow_runs: [] };
    if (path.startsWith('pulls/8/reviews?')) return reviews;
    if (path.startsWith('pulls/8/files?')) return [{ filename: 'test.mjs', sha: head, status: 'modified' }];
    if (path.startsWith('issues/8/comments?')) return [];
    if (path.startsWith('issues/7/comments?')) return comments;
    if (path === 'issues/7/comments' && method === 'POST') { const comment = { id: 30 + comments.length, user: bot, issue_url: `https://api.github.com/repos/${repository}/issues/7`, body: body.body }; comments.push(comment); return comment; }
    if (path.startsWith('issues/comments/')) { const comment = comments.find(c => c.id === Number(path.split('/')[2])); if (method === 'PATCH') comment.body = body.body; return comment; }
    if (path.endsWith('/jobs?per_page=100')) return { total_count: jobs.length, jobs };
    if (path.startsWith('actions/runs/')) return runs.get(Number(path.split('/')[2]));
    if (path.includes('/runs?') && path.includes('verify.yml')) return { total_count: 1, workflow_runs: [ci] };
    if (path.includes('/runs?')) return { total_count: 1, workflow_runs: [{ ...run, display_title: 'review #7 · request 30' }] };
    if (path.startsWith('commits/') && path.includes('/pulls?')) return [pr];
    if (path.startsWith('compare/')) return { status: 'ahead', base_commit: { sha: old }, merge_base_commit: { sha: old }, total_commits: 1, ahead_by: 1, behind_by: 0, files: changed };
    if (path.endsWith('/dispatches')) return null;
    throw Error(`Unexpected ${method} ${path}`);
  };
  const authorization = { issue: 7, pr: 8, head, merge: false };
  const observed = await inspectCompletion(api, repository, owner, authorization, 'review'), admissionBinding = observed.binding;
  const admissionReviewsDigest = digest(JSON.stringify(observed.pullRequest.reviews));
  const request = { schemaVersion: 1, id: dispatchId(repository, '90', 'review'), repository, issue: 7, stage: 'review', routerRunId: '100', routerAttempt: 1, routerRevision: old, routerRef: 'main', workflowRevision: old, sourceRevision: old, ref: 'main', eventName: 'workflow_dispatch', event: { inputs: { issue: '7', stage: 'review', workflow: 'stage', after_run: '90' } }, eventRunId: '90', handoff: false, taskDigest: taskDigest(issue, []), completionAuthorization: authorization, admissionBinding, admissionReviewsDigest };
  request.intent = dispatchIntent(request);
  const receipt = { schemaVersion: 1, stage: 'review', id: request.id, intent: request.intent, digest: digest(JSON.stringify(request)), eventRunId: '90', routerRunId: '100', routerAttempt: 1, workerRunId: null, status: 'requested' };
  const comment = { id: 30, user: bot, issue_url: `https://api.github.com/repos/${repository}/issues/7`, body: dispatchReceiptBody(repository, receipt) }; comments.push(comment); artifacts.set(100, request);
  const readArtifact = async (_api, _repo, id, name, file) => { assert.equal(name, dispatchArtifact(artifacts.get(Number(id)))); assert.equal(file, 'dispatch.json'); return artifacts.get(Number(id)); };
  revision = current; calls.length = 0;
  return { api, issue, request, receipt, comment, comments, parent, run, jobs, maintenance, readArtifact, artifacts, runs, calls, changed, reviews, profile, pr };
}

