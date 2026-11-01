import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { issueComments } from './stage-dispatch.mjs';
import { taskDigest } from './issue-actions.mjs';
import { loadRefinement } from './proposal.mjs';
import { validateStageEnvelope } from './host-contract.mjs';
import { assessDecomposition, epicPlanDigest } from './epic.mjs';
import { reconcileEpicChildren, readEpicMarker, epicCorrelation, epicChildBody } from './epic-github.mjs';
import { createEpicJournal, readEpicChildReceipt } from './epic-journal.mjs';
import { isDeepStrictEqual } from 'node:util';

const isOwnerAnswer = (comment, owner) => comment.user?.login === owner && !comment.body?.includes('<!-- lighthouse-run:') && !comment.body?.includes('<!-- lighthouse-actions:');
const paused = issue => issue.state !== 'open' || issue.pull_request || issue.labels.some(label => ['future', 'human-working', 'agent-working', 'needs-info', 'waiting-review', 'execution-failed', 'triage', 'refine', 'propose', 'implement'].includes(label.name));

export async function prepareNativeEpic(api, repository, owner, issueNumber, load = loadRefinement) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || typeof owner !== 'string' || !Number.isSafeInteger(issueNumber) || issueNumber < 1) throw Error('Invalid epic identity');
  const issue = await api(`issues/${issueNumber}`), comments = await issueComments(api, issueNumber), repo = await api('');
  if (paused(issue) || !issue.labels.some(label => label.name === 'ready')) throw Error('Epic parent is not ready or is paused');
  const sourceRevision = (await api(`commits/${encodeURIComponent(repo.default_branch)}`)).sha;
  const current = { owner, issue: issueNumber, sourceRevision, taskDigest: taskDigest(issue, comments.filter(comment => isOwnerAnswer(comment, owner))) };
  const evidence = await load(api, repository, comments, current);
  if (evidence.request?.issue !== issueNumber || evidence.request.stage !== 'refine' || evidence.request.sourceRevision !== sourceRevision || evidence.request.taskDigest !== current.taskDigest || validateStageEnvelope(evidence.envelope, evidence.request).length) throw Error('Epic refinement result is invalid or stale');
  const assessment = assessDecomposition(evidence.envelope.result.output);
  if (assessment.status !== 'planned') throw Error('Epic refinement has no valid oversized plan');
  const parentNumber = assessment.plan.parent.number ?? assessment.plan.parent.id.match(/^(?:GH-)?([1-9]\d*)$/)?.[1];
  if (String(parentNumber) !== String(issueNumber)) throw Error('Epic plan targets a different parent');
  const report = comments.find(comment => comment.html_url === evidence.report);
  if (!report || report.user?.login !== 'github-actions[bot]' || report.user.type !== 'Bot') throw Error('Epic refinement report is not available');
  return { issue: issueNumber, repository, owner, sourceRevision, defaultBranch: repo.default_branch, taskDigest: current.taskDigest, reportId: report.id, reportBody: report.body, plan: assessment.plan };
}

export async function authorizeNativeEpic(api, snapshot) {
  const issue = await api(`issues/${snapshot.issue}`), comments = await issueComments(api, snapshot.issue), repo = await api('');
  const report = comments.find(comment => comment.id === snapshot.reportId);
  const later = comments.some(comment => Number(comment.id) > Number(snapshot.reportId) && comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && /<!-- lighthouse-(?:stage:refine:|dispatch:)/.test(comment.body ?? ''));
  if (paused(issue) || !issue.labels.some(label => label.name === 'ready') || repo.default_branch !== snapshot.defaultBranch || (await api(`commits/${encodeURIComponent(repo.default_branch)}`)).sha !== snapshot.sourceRevision || taskDigest(issue, comments.filter(comment => isOwnerAnswer(comment, snapshot.owner))) !== snapshot.taskDigest || !report || report.user?.login !== 'github-actions[bot]' || report.user.type !== 'Bot' || report.body !== snapshot.reportBody || later) throw Error('Epic parent authority or refinement changed');
  return true;
}

export async function authenticateEpicChild({ api, repository, owner, child, load, readArtifact }) {
  if (!Number.isSafeInteger(child) || child < 1) throw Error('Invalid epic child');
  const issue = await api(`issues/${child}`), marker = readEpicMarker(issue.body);
  if (issue.number !== child || !Number.isSafeInteger(issue.id) || issue.id < 1 || issue.state !== 'open' || issue.pull_request || issue.user?.login !== 'github-actions[bot]' || issue.user.type !== 'Bot' || !marker || marker.kind !== 'child' || marker.repository !== repository || marker.parent === child) throw Error('Epic child identity is not trusted');
  const snapshot = await prepareNativeEpic(api, repository, owner, marker.parent, load);
  const slice = snapshot.plan.slices.find(item => item.id === marker.slice);
  const expected = slice && epicCorrelation({ repository, parent: marker.parent, slice: slice.id, planDigest: epicPlanDigest(snapshot.plan), base: `lighthouse/epic-${marker.parent}`, dependencies: slice.dependencies });
  if (!expected || !isDeepStrictEqual(marker, expected) || issue.title !== slice.title || issue.body !== epicChildBody(marker.parent, slice, expected)) throw Error('Epic child no longer matches the current plan');
  const parent = await api(`issues/${child}/parent`);
  if (parent?.number !== marker.parent) throw Error('Epic child parent link changed');
  await readEpicChildReceipt({ api, repository, owner, correlation: expected, sourceRevision: snapshot.sourceRevision, defaultBranch: snapshot.defaultBranch, resource: { id: issue.id, number: child }, ...(readArtifact ? { readArtifact } : {}) });
  await authorizeNativeEpic(api, snapshot);
  return { parent: marker.parent, slice: marker.slice, planDigest: marker.planDigest, base: marker.base, sourceRevision: snapshot.sourceRevision };
}

export async function findEpicCandidates(api, correlation) {
  const candidates = [];
  for (let page = 1; page <= 5; page++) {
    const issues = await api(`issues?state=all&per_page=100&page=${page}`);
    if (!Array.isArray(issues)) throw Error('Epic issue inventory unavailable');
    for (const issue of issues) {
      const marker = readEpicMarker(issue.body);
      if (marker?.repository === correlation.repository && marker.parent === correlation.parent && marker.slice === correlation.slice) candidates.push(issue);
    }
    if (issues.length < 100) return candidates;
  }
  throw Error('Epic issue inventory exceeds bounds');
}

export async function checkEpicLeaseConfiguration(api, revision) {
  async function file(path) {
    const value = await api(`contents/${path}?ref=${revision}`);
    if (value?.type !== 'file' || value.encoding !== 'base64' || typeof value.content !== 'string' || !Number.isSafeInteger(value.size) || value.size < 1 || value.size > 128000) throw Error('Epic lease configuration is unavailable');
    return Buffer.from(value.content, 'base64').toString('utf8');
  }
  const router = (await file('.github/workflows/lighthouse-sdlc-router.yml')).split('\n');
  const starts = router.flatMap((line, index) => line === '  dispatch:' ? [index] : []);
  if (starts.length !== 1) throw Error('Epic requires a unique serialized router dispatch');
  let end = starts[0] + 1;
  while (end < router.length && !/^  [A-Za-z0-9_-]+:/.test(router[end])) end++;
  const dispatch = router.slice(starts[0], end).join('\n');
  if (!dispatch.includes('    concurrency:\n      group: lighthouse-issue-${{ needs.route.outputs.epic_parent || needs.route.outputs.issue }}\n      cancel-in-progress: false\n      queue: max')) throw Error('Epic requires the shared issue dispatch lease');
  const workflow = await file('.github/workflows/lighthouse-sdlc-epic.yml');
  if (!workflow.includes('\nconcurrency:\n  group: lighthouse-issue-${{ inputs.issue }}\n  cancel-in-progress: false\n  queue: max\n')) throw Error('Epic workflow does not hold the shared issue lease');
  for (const stage of ['triage', 'refine', 'implement']) {
    const worker = await file(`.github/workflows/lighthouse-sdlc-${stage}.lock.yml`);
    if (!worker.includes('\nconcurrency:\n  cancel-in-progress: false\n  group: lighthouse-issue-${{ inputs.epic-parent || inputs.issue }}\n  queue: max\n')) throw Error(`Epic ${stage} worker does not hold the shared parent lease`);
  }
}

export async function ensureEpicBase(api, snapshot, authorize) {
  const branch = `lighthouse/epic-${snapshot.issue}`;
  const read = () => api(`git/ref/heads/${branch}`, 'GET', undefined, true);
  const current = await read();
  if (current) {
    if (current.ref !== `refs/heads/${branch}` || current.object?.sha !== snapshot.sourceRevision) throw Error('Epic branch already exists at an unverified revision');
    return branch;
  }
  if (await authorize() !== true) throw Error('Epic branch authorization changed');
  try {
    const created = await api('git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: snapshot.sourceRevision });
    if (created.ref === `refs/heads/${branch}` && created.object?.sha === snapshot.sourceRevision) return branch;
  } catch (error) {
    const observed = await read();
    if (observed?.ref === `refs/heads/${branch}` && observed.object?.sha === snapshot.sourceRevision) return branch;
    throw error;
  }
  throw Error('Epic branch creation could not be confirmed');
}

export async function runNativeEpic({ api, repository, owner, issue, run, journalPath, readArtifact, load }) {
  const snapshot = await prepareNativeEpic(api, repository, owner, issue, load);
  await checkEpicLeaseConfiguration(api, snapshot.sourceRevision);
  const authorize = () => authorizeNativeEpic(api, snapshot);
  const journal = await createEpicJournal({ api, repository, owner, parent: issue, sourceRevision: snapshot.sourceRevision, defaultBranch: snapshot.defaultBranch, run, path: journalPath, authorize, ...(readArtifact ? { readArtifact } : {}) });
  await ensureEpicBase(api, snapshot, authorize);
  const host = {
    ...journal,
    withLease: async (key, fn) => { if (key !== `${repository}:${issue}`) throw Error('Epic lease identity changed'); return fn(); },
    findCandidates: correlation => findEpicCandidates(api, correlation),
    authenticate: async (candidate, receipt) => candidate.user?.login === 'github-actions[bot]' && candidate.user.type === 'Bot' && receipt.resource?.id === candidate.id && receipt.resource?.number === candidate.number,
    beforeWrite: authorize,
    api: async (path, method = 'GET', body) => api(path, method, body, method === 'GET' && /^issues\/[1-9][0-9]*\/parent$/.test(path)),
  };
  return reconcileEpicChildren(snapshot.plan, { repository, parent: issue, base: `lighthouse/epic-${issue}` }, host);
}

async function main() {
  const env = process.env, repository = env.GITHUB_REPOSITORY, owner = env.GITHUB_REPOSITORY_OWNER, issue = Number(env.LIGHTHOUSE_ISSUE);
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_ACTOR !== owner || env.GITHUB_TRIGGERING_ACTOR !== owner || !/^[1-9][0-9]*$/.test(env.LIGHTHOUSE_ISSUE ?? '') || !Number.isSafeInteger(issue)) throw Error('Epic execution requires an explicit owner request');
  const api = async (path, method = 'GET', body, optional = false) => {
    const response = await fetch(`https://api.github.com/repos/${repository}${path ? `/${path}` : ''}`, { method, headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    if (optional && response.status === 404) return null;
    if (!response.ok) throw Error(`GitHub ${method} ${path}: ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  const run = await api(`actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT}`);
  const dir = join(env.RUNNER_TEMP, `lighthouse-epic-${env.GITHUB_RUN_ID}-${issue}`);
  await mkdir(dir, { recursive: true });
  const result = await runNativeEpic({ api, repository, owner, issue, run, journalPath: join(dir, 'journal.json') });
  console.log(JSON.stringify(result));
  if (result.status !== 'reconciled') throw Error('Epic child reconciliation stopped; inspect the retained journal before continuing');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
