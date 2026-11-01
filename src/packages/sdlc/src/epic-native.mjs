import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { issueComments, readDispatchReceipt } from './stage-dispatch.mjs';
import { taskDigest } from './issue-actions.mjs';
import { loadRefinement } from './proposal.mjs';
import { validateStageEnvelope } from './host-contract.mjs';
import { assessDecomposition, epicPlanDigest } from './epic.mjs';
import { reconcileEpicChildren, readEpicMarker, epicMarker, epicCorrelation, epicChildBody, epicJournalKey } from './epic-github.mjs';
import { createEpicJournal, readEpicChildReceipt, readEpicResourceReceipt } from './epic-journal.mjs';
import { isDeepStrictEqual } from 'node:util';
import { checkImplementationPullRequest } from './proposal-review.mjs';
import { readActionsJson } from './actions-artifact.mjs';
import { loadDispatch, checkDispatchClaim } from './stage-dispatch.mjs';
import { validateChanges, validateCheckReceipt } from './implementation.mjs';
import { digest } from './host-contract.mjs';
import { createHash } from 'node:crypto';
import { list, loadProfile, requiredPolicy, checkCommit } from './completion.mjs';
import { observeEpicMerge, mergeEpicChild } from './epic-merge.mjs';
import { setPullRequestDraft, projectImplementationPrState } from './pr-state.mjs';

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

export async function authenticateEpicChild({ api, repository, owner, child, load, readArtifact, allowClosed = false }) {
  if (!Number.isSafeInteger(child) || child < 1) throw Error('Invalid epic child');
  const issue = await api(`issues/${child}`), marker = readEpicMarker(issue.body);
  if (issue.number !== child || !Number.isSafeInteger(issue.id) || issue.id < 1 || issue.state !== 'open' && !(allowClosed && issue.state === 'closed') || issue.pull_request || issue.user?.login !== 'github-actions[bot]' || issue.user.type !== 'Bot' || !marker || marker.kind !== 'child' || marker.repository !== repository || marker.parent === child) throw Error('Epic child identity is not trusted');
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

export async function authenticateEpicPullRequest({ api, repository, owner, child, pr, load, readArtifact, journal }) {
  const current = await authenticateEpicChild({ api, repository, owner, child, load, readArtifact });
  const target = checkImplementationPullRequest(pr, repository);
  if (target.issue !== child || target.base !== current.base || !Number.isSafeInteger(pr.id) || pr.id < 1 || !Number.isSafeInteger(pr.number) || pr.number < 1) throw Error('Epic pull request identity changed');
  const marker = readEpicMarker((await api(`issues/${child}`)).body);
  if (!marker || marker.parent !== current.parent || marker.slice !== current.slice || marker.planDigest !== current.planDigest) throw Error('Epic child correlation changed');
  const correlation = epicCorrelation({ repository, parent: current.parent, slice: current.slice, planDigest: current.planDigest, base: current.base, dependencies: marker.dependencies, kind: 'pull-request' });
  const resource = { id: pr.id, number: pr.number };
  if (journal) {
    const receipt = await journal.readReceipt(epicJournalKey(correlation));
    if (!receipt || !['linked', 'merging'].includes(receipt.state) || !isDeepStrictEqual(receipt.correlation, correlation) || !isDeepStrictEqual(receipt.resource, resource) || receipt.publication?.head !== pr.head.sha) throw Error('Epic pull request journal does not match');
  } else {
    const repo = await api('');
    const receipt = await readEpicResourceReceipt({ api, repository, owner, correlation, sourceRevision: current.sourceRevision, defaultBranch: repo.default_branch, resource, ...(readArtifact ? { readArtifact } : {}) });
    if (receipt.publication?.head !== pr.head.sha) throw Error('Epic pull request head lacks a current publication receipt');
  }
  return true;
}

export async function verifyEpicChecks(api, { repository, sourceRevision, base, candidate, loadPolicy }) {
  const policy = loadPolicy ? await loadPolicy() : await requiredPolicy(api, base, await loadProfile(api, repository, sourceRevision));
  if (!Array.isArray(policy?.checks) || !policy.checks.length) return false;
  return (await checkCommit(api, candidate, policy.checks)).every(check => check.status === 'passed');
}

export async function verifyAcceptedEpicMerge(api, { repository, owner, sourceRevision, base, receipt, loadPolicy }) {
  if (receipt?.state !== 'accepted' || !Number.isSafeInteger(receipt.resource?.id) || !Number.isSafeInteger(receipt.resource?.number) || !receipt.merge || receipt.publication?.head !== receipt.merge.head) throw Error('Epic dependency acceptance receipt is invalid');
  const merged = receipt.merge, pr = await api(`pulls/${receipt.resource.number}`);
  if (pr.id !== receipt.resource.id || !pr.merged || pr.user?.login !== 'github-actions[bot]' || pr.user.type !== 'Bot' || pr.head?.sha !== merged.head || pr.base?.ref !== base || pr.head.repo?.full_name !== repository || pr.base.repo?.full_name !== repository || pr.merge_commit_sha !== merged.commit || pr.merged_by?.login !== 'github-actions[bot]' || pr.merged_by.type !== 'Bot') throw Error('Epic dependency merge no longer matches its receipt');
  const actual = await api(`git/commits/${merged.commit}`), candidate = await api(`git/commits/${merged.candidate}`);
  if (!Array.isArray(actual.parents) || actual.parents.length !== 1 || actual.parents[0].sha !== merged.base || !/^[a-f0-9]{40}$/.test(actual.tree?.sha ?? '') || actual.tree.sha !== candidate.tree?.sha) throw Error('Epic dependency commit does not match its accepted candidate');
  const reviews = await list(api, `pulls/${receipt.resource.number}/reviews`);
  const latest = reviews.filter(review => review.user?.login === owner && review.user.type === 'User' && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)).sort((a, b) => b.id - a.id)[0];
  if (latest?.id !== merged.review || latest.state !== 'APPROVED' || latest.commit_id !== merged.head) throw Error('Epic dependency owner approval was revoked');
  if (!await verifyEpicChecks(api, { repository, sourceRevision, base, candidate: merged.candidate, loadPolicy })) throw Error('Epic dependency checks are no longer valid');
  return merged;
}

export async function inspectEpicDependencies({ api, repository, owner, child, current, load, loadPolicy, readArtifact = readActionsJson, authenticate = authenticateEpicChild, findCandidates = findEpicCandidates, readReceipt = readEpicResourceReceipt }) {
  const authenticatedChild = await authenticate({ api, repository, owner, child, load, readArtifact });
  if (!isDeepStrictEqual(authenticatedChild, current)) throw Error('Epic child authority changed');
  const issue = await api(`issues/${child}`), marker = readEpicMarker(issue.body);
  if (!marker || marker.parent !== current.parent || marker.slice !== current.slice || marker.planDigest !== current.planDigest) throw Error('Epic child correlation changed');
  const branch = await api(`git/ref/heads/${current.base}`), baseSha = branch.object?.sha;
  if (branch.ref !== `refs/heads/${current.base}` || !/^[a-f0-9]{40}$/.test(baseSha ?? '')) throw Error('Epic integration branch is unavailable');
  const repo = await api(''), expectedIds = [];
  for (const dependency of marker.dependencies) {
    const childCorrelation = epicCorrelation({ repository, parent: current.parent, slice: dependency, planDigest: current.planDigest, base: current.base, dependencies: [] });
    const candidates = await findCandidates(api, childCorrelation);
    if (!Array.isArray(candidates) || candidates.length !== 1) throw Error('Epic dependency identity is uncertain');
    const prior = candidates[0], priorMarker = readEpicMarker(prior.body);
    if (!priorMarker || prior.state !== 'closed') throw Error('Epic dependency is not internally complete');
    const authenticated = await authenticate({ api, repository, owner, child: prior.number, load, readArtifact, allowClosed: true });
    if (authenticated.parent !== current.parent || authenticated.slice !== dependency || authenticated.planDigest !== current.planDigest || authenticated.base !== current.base) throw Error('Epic dependency authority changed');
    expectedIds.push(prior.id);
    const correlation = epicCorrelation({ ...priorMarker, kind: 'pull-request' });
    const receipt = await readReceipt({ api, repository, owner, correlation, sourceRevision: current.sourceRevision, defaultBranch: repo.default_branch, allowedStates: ['accepted'], readArtifact });
    const merged = await verifyAcceptedEpicMerge(api, { repository, owner, sourceRevision: current.sourceRevision, base: current.base, receipt, loadPolicy });
    const comparison = await api(`compare/${merged.commit}...${baseSha}`);
    if (!['identical', 'ahead'].includes(comparison.status) || comparison.merge_base_commit?.sha !== merged.commit) throw Error('Epic dependency is not included in the current base');
  }
  const native = await list(api, `issues/${child}/dependencies/blocked_by`);
  if (native.some(item => !Number.isSafeInteger(item.id)) || !isDeepStrictEqual(native.map(item => item.id).sort((a, b) => a - b), expectedIds.sort((a, b) => a - b))) throw Error('Native epic dependencies differ from the authorized plan');
  if ((await api(`git/ref/heads/${current.base}`)).object?.sha !== baseSha || !isDeepStrictEqual(await authenticate({ api, repository, owner, child, load, readArtifact }), current)) throw Error('Epic authority or base changed while checking dependencies');
  return { baseSha };
}

export async function checkEpicCapacity({ api, repository, owner, child, current, capacity, excludeRequest, load, prepare = prepareNativeEpic, findCandidates = findEpicCandidates }) {
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 8) throw Error('Epic capacity must be between 1 and 8');
  const snapshot = await prepare(api, repository, owner, current.parent, load);
  if (snapshot.sourceRevision !== current.sourceRevision || epicPlanDigest(snapshot.plan) !== current.planDigest) throw Error('Epic plan changed before capacity check');
  let occupied = 0;
  for (const slice of snapshot.plan.slices) {
    const correlation = epicCorrelation({ repository, parent: current.parent, slice: slice.id, planDigest: current.planDigest, base: current.base, dependencies: slice.dependencies });
    const candidates = await findCandidates(api, correlation);
    if (!Array.isArray(candidates) || candidates.length !== 1) throw Error('Epic child inventory is incomplete or ambiguous');
    const issue = await api(`issues/${candidates[0].number}`);
    if (issue.id !== candidates[0].id || issue.user?.login !== 'github-actions[bot]' || issue.user.type !== 'Bot' || !isDeepStrictEqual(readEpicMarker(issue.body), correlation)) throw Error('Epic child inventory changed');
    if (!['open', 'closed'].includes(issue.state) || issue.pull_request) throw Error('Epic child state is uncertain');
    const comments = await issueComments(api, issue.number);
    const active = comments.filter(comment => comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && comment.body?.includes('<!-- lighthouse-dispatch:')).map(comment => readDispatchReceipt(comment, repository, issue.number)).some(receipt => receipt.stage === 'implement' && receipt.id !== excludeRequest && ['requested', 'running', 'unknown'].includes(receipt.status));
    if (active || issue.number !== child && issue.labels.some(label => label.name === 'agent-working')) occupied++;
  }
  if (occupied >= capacity) throw Error('Epic runner capacity is occupied');
  return { occupied, capacity };
}

export async function reconcileEpicPullRequest({ api, repository, owner, child, runId, journal, authorize, load, readArtifact = readActionsJson }) {
  if (!Number.isSafeInteger(child) || child < 1 || !/^[1-9][0-9]*$/.test(String(runId)) || typeof authorize !== 'function') throw Error('Invalid epic publication identity');
  const current = await authenticateEpicChild({ api, repository, owner, child, load, readArtifact });
  const run = await api(`actions/runs/${runId}`);
  if (String(run.id) !== String(runId) || run.status !== 'completed' || run.run_attempt !== 1 || !['.github/workflows/lighthouse-sdlc-implement.lock.yml', '.github/workflows/lighthouse-sdlc-apply-review.lock.yml'].includes(run.path) || run.event !== 'workflow_dispatch' || run.repository?.full_name !== repository) throw Error('Epic implementation run is not eligible for reconciliation');
  const inputName = `lighthouse-implement-input-${child}-1`, resultName = `lighthouse-implement-result-${child}-1`;
  const snapshot = await readArtifact(api, repository, run.id, inputName, 'request.json');
  const envelope = await readArtifact(api, repository, run.id, resultName, 'envelope.json');
  const changes = await readArtifact(api, repository, run.id, resultName, 'changes.json');
  const checks = await readArtifact(api, repository, run.id, resultName, 'checks.json');
  const published = await readArtifact(api, repository, run.id, `lighthouse-implement-publication-${child}-1`, 'published-pr.json');
  if (snapshot?.issue !== child || snapshot.stage !== 'implement' || snapshot.runId !== digest(`${repository}:${child}:implement:${run.id}:1`) || String(snapshot.workflowRunId) !== String(run.id) || snapshot.epic?.parent !== current.parent || snapshot.epic?.slice !== current.slice || snapshot.epic?.planDigest !== current.planDigest || snapshot.epic?.base !== current.base || snapshot.epic?.sourceRevision !== current.sourceRevision || snapshot.baseRevision !== current.sourceRevision || (snapshot.implementationReview ? snapshot.implementationReview.head !== snapshot.sourceRevision || snapshot.implementationReview.base !== current.base || run.path !== '.github/workflows/lighthouse-sdlc-apply-review.lock.yml' : snapshot.epic?.baseSha !== snapshot.sourceRevision || run.path !== '.github/workflows/lighthouse-sdlc-implement.lock.yml') || validateStageEnvelope(envelope, snapshot).length || envelope.result.status !== 'passed') throw Error('Epic implementation evidence is invalid or stale');
  const dispatch = await loadDispatch(api, repository, owner, child, snapshot.dispatch?.commentId, run, readArtifact);
  const { baseSha: dispatchedBase, ...dispatchedEpic } = dispatch.request.epic ?? {};
  if (dispatch.request.id !== snapshot.dispatch.requestId || dispatch.receipt.digest !== snapshot.dispatch.digest || dispatch.request.stage !== 'implement' || dispatch.request.workflowRevision !== snapshot.workflowRevision || dispatch.request.taskDigest !== snapshot.taskDigest || dispatchedBase !== snapshot.epic.baseSha || !isDeepStrictEqual(dispatchedEpic, current) || !isDeepStrictEqual(dispatch.request.epic, snapshot.epic)) throw Error('Epic implementation dispatch changed');
  await checkDispatchClaim(api, repository, child, snapshot.dispatch, run.id);
  validateChanges(changes, snapshot.implementation.policy);
  if (!changes.length || !validateCheckReceipt(checks, snapshot, changes) || !Number.isSafeInteger(published?.number) || published.number < 1 || !/^[a-f0-9]{40}$/.test(published.head ?? '')) throw Error('Epic implementation checks or publication receipt are invalid');
  const pr = await api(`pulls/${published.number}`), target = checkImplementationPullRequest(pr, repository);
  if (target.issue !== child || target.base !== current.base || target.head !== published.head || (snapshot.implementationReview ? target.number !== snapshot.implementationReview.number || target.branch !== snapshot.implementationReview.branch : !pr.body.includes(`<!-- lighthouse-implementation:${snapshot.runId} -->`)) || !Number.isSafeInteger(pr.id) || pr.id < 1) throw Error('Epic implementation PR does not match its publication receipt');
  const commit = await api(`git/commits/${published.head}`);
  if (!Array.isArray(commit.parents) || commit.parents.length !== 1 || commit.parents[0].sha !== snapshot.sourceRevision) throw Error('Epic implementation commit has an unexpected base');
  const trees = [];
  for (const revision of [snapshot.sourceRevision, published.head]) {
    const tree = await api(`git/trees/${revision}?recursive=1`);
    if (tree.truncated || !Array.isArray(tree.tree) || tree.tree.length > 10000) throw Error('Epic implementation tree exceeds reconciliation bounds');
    trees.push(new Map(tree.tree.filter(item => item.type !== 'tree').map(item => [item.path, item])));
  }
  const [before, after] = trees, changed = [...new Set([...before.keys(), ...after.keys()])].filter(path => before.get(path)?.sha !== after.get(path)?.sha || before.get(path)?.mode !== after.get(path)?.mode).sort();
  if (!isDeepStrictEqual(changed, changes.map(change => change.path).sort())) throw Error('Epic implementation tree differs from validated changes');
  for (const change of changes) {
    const actual = after.get(change.path);
    if (change.content === null) { if (actual) throw Error('Epic deletion was not published'); continue; }
    const content = Buffer.from(change.content, 'base64');
    const expected = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
    if (actual?.type !== 'blob' || actual.mode !== change.mode || actual.sha !== expected) throw Error('Epic implementation file differs from validated content');
  }
  const marker = readEpicMarker((await api(`issues/${child}`)).body);
  const correlation = epicCorrelation({ repository, parent: current.parent, slice: current.slice, planDigest: current.planDigest, base: current.base, dependencies: marker.dependencies, kind: 'pull-request' });
  const key = epicJournalKey(correlation), resource = { id: pr.id, number: pr.number }, publication = { run: String(run.id), attempt: run.run_attempt, head: published.head };
  let receipt = await journal.readReceipt(key);
  if (receipt && (!isDeepStrictEqual(receipt.correlation, correlation) || receipt.resource && !isDeepStrictEqual(receipt.resource, resource) || !['intent', 'created', 'linked'].includes(receipt.state))) throw Error('Epic PR journal conflicts with publication');
  if (await authorize() !== true) throw Error('Epic PR reconciliation authority changed');
  if (!receipt) { receipt = { schemaVersion: 1, state: 'intent', correlation }; await journal.writeReceipt(key, receipt); }
  if (receipt.state === 'intent') { receipt = { ...receipt, state: 'created', resource, publication }; await journal.writeReceipt(key, receipt); }
  if (['created', 'linked'].includes(receipt.state) && !isDeepStrictEqual(receipt.publication, publication)) { receipt = { ...receipt, publication }; await journal.writeReceipt(key, receipt); }
  if (receipt.state === 'created') { receipt = { ...receipt, state: 'linked' }; await journal.writeReceipt(key, receipt); }
  return { status: 'linked', pullRequest: pr.number, head: published.head };
}

export async function readyEpicPullRequest({ api, repository, owner, parent, child, number, head, base, journal, authorize, load, loadPolicy, readArtifact, setDraft }) {
  if (!Number.isSafeInteger(number) || number < 1 || !/^[a-f0-9]{40}$/.test(head ?? '') || !/^[a-f0-9]{40}$/.test(base ?? '') || typeof setDraft !== 'function') throw Error('Invalid epic readiness request');
  const observe = async () => {
    const current = await authenticateEpicChild({ api, repository, owner, child, load, readArtifact });
    if (current.parent !== parent) throw Error('Epic child belongs to another parent');
    const issue = await api(`issues/${child}`);
    if (issue.labels.some(label => ['future', 'human-working', 'agent-working', 'needs-info'].includes(label.name))) throw Error('Epic child is paused or reserved');
    const dependencies = await inspectEpicDependencies({ api, repository, owner, child, current, load, loadPolicy, readArtifact });
    if (dependencies.baseSha !== base) throw Error('Epic base changed before readiness');
    const pr = await api(`pulls/${number}`), target = checkImplementationPullRequest(pr, repository);
    if (target.issue !== child || target.base !== current.base || target.head !== head || pr.mergeable !== true || !/^[a-f0-9]{40}$/.test(pr.merge_commit_sha ?? '')) throw Error('Epic PR changed before readiness');
    await authenticateEpicPullRequest({ api, repository, owner, child, pr, load, readArtifact, journal });
    const candidate = await api(`git/commits/${pr.merge_commit_sha}`);
    if (!Array.isArray(candidate.parents) || candidate.parents.length !== 2 || candidate.parents[0].sha !== base || candidate.parents[1].sha !== head || !await verifyEpicChecks(api, { repository, sourceRevision: current.sourceRevision, base: current.base, candidate: pr.merge_commit_sha, loadPolicy })) throw Error('Epic readiness checks do not bind the current head and base');
    if (await authorize() !== true) throw Error('Epic readiness authority changed');
    return { pr, candidate: pr.merge_commit_sha };
  };
  const first = await observe();
  if (first.pr.draft) {
    try { await setDraft(first.pr, false); }
    catch (error) { if ((await api(`pulls/${number}`)).draft) throw error; }
  }
  const fresh = await observe();
  if (fresh.pr.draft || fresh.candidate !== first.candidate) throw Error('Epic readiness outcome is uncertain');
  await projectImplementationPrState(api, child, false);
  return { status: 'ready', pullRequest: number, head, base };
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
  for (const stage of ['triage', 'refine', 'implement', 'apply-review']) {
    const worker = await file(`.github/workflows/lighthouse-sdlc-${stage}.lock.yml`);
    if (!worker.includes("\nconcurrency:\n  cancel-in-progress: false\n  group: ${{ inputs.epic-parent && format('lighthouse-epic-child-{0}', inputs.issue) || format('lighthouse-issue-{0}', inputs.issue) }}\n  queue: max\n")) throw Error(`Epic ${stage} worker does not hold the child lease`);
    for (const job of ['prepare', 'publish']) {
      const lines = worker.split('\n'), starts = lines.flatMap((line, index) => line === `  ${job}:` ? [index] : []);
      if (starts.length !== 1) throw Error(`Epic ${stage} ${job} job is not unique`);
      let end = starts[0] + 1;
      while (end < lines.length && !/^  [A-Za-z0-9_-]+:/.test(lines[end])) end++;
      const block = lines.slice(starts[0], end).join('\n');
      if (!block.includes(`    concurrency:\n      cancel-in-progress: false\n      group: \${{ inputs.epic-parent && format('lighthouse-issue-{0}', inputs.epic-parent) || format('lighthouse-${job}-{0}', github.run_id) }}\n      queue: max`)) throw Error(`Epic ${stage} ${job} does not hold the shared parent lease`);
    }
  }
}

export async function verifyEpicBranchHistory(api, snapshot, journal, head, requireAll = false, loadPolicy) {
  const base = `lighthouse/epic-${snapshot.issue}`, accepted = new Map();
  for (const slice of snapshot.plan.slices) {
    const correlation = epicCorrelation({ repository: snapshot.repository, parent: snapshot.issue, slice: slice.id, planDigest: epicPlanDigest(snapshot.plan), base, dependencies: slice.dependencies, kind: 'pull-request' });
    const receipt = await journal.readReceipt(epicJournalKey(correlation));
    if (receipt?.state !== 'accepted') continue;
    if (!isDeepStrictEqual(receipt.correlation, correlation)) throw Error('Epic merge correlation changed');
    const merged = await verifyAcceptedEpicMerge(api, { repository: snapshot.repository, owner: snapshot.owner, sourceRevision: snapshot.sourceRevision, base, receipt, loadPolicy });
    if (accepted.has(merged.commit)) throw Error('Duplicate epic merge receipt');
    accepted.set(merged.commit, merged.base);
  }
  let revision = head, count = 0;
  while (revision !== snapshot.sourceRevision) {
    if (!accepted.has(revision) || ++count > accepted.size) throw Error('Epic branch contains an unverified commit');
    revision = accepted.get(revision);
  }
  if (count !== accepted.size) throw Error('Accepted epic merges are absent from the branch');
  if (requireAll && accepted.size !== snapshot.plan.slices.length) throw Error('Not all epic children are accepted');
  return true;
}

export async function publishEpicAggregate({ api, repository, owner, snapshot, journal, authorize, load, loadPolicy, readArtifact, findCandidates = findEpicCandidates, authenticate = authenticateEpicChild }) {
  const base = `lighthouse/epic-${snapshot.issue}`, ref = await api(`git/ref/heads/${base}`), head = ref.object?.sha;
  if (ref.ref !== `refs/heads/${base}` || !/^[a-f0-9]{40}$/.test(head ?? '') || head === snapshot.sourceRevision) throw Error('Epic branch has no accepted aggregate changes');
  await verifyEpicBranchHistory(api, snapshot, journal, head, true, loadPolicy);
  for (const slice of snapshot.plan.slices) {
    const correlation = epicCorrelation({ repository, parent: snapshot.issue, slice: slice.id, planDigest: epicPlanDigest(snapshot.plan), base, dependencies: slice.dependencies });
    const matches = await findCandidates(api, correlation);
    if (matches.length !== 1 || matches[0].state !== 'closed') throw Error('Epic child completion is missing or ambiguous');
    const current = await authenticate({ api, repository, owner, child: matches[0].number, load, readArtifact, allowClosed: true });
    if (current.parent !== snapshot.issue || current.slice !== slice.id || current.planDigest !== correlation.planDigest || current.base !== base || current.sourceRevision !== snapshot.sourceRevision) throw Error('Epic child completion authority changed');
  }
  const correlation = epicCorrelation({ repository, parent: snapshot.issue, slice: 'aggregate', planDigest: epicPlanDigest(snapshot.plan), base, dependencies: snapshot.plan.slices.map(slice => slice.id), kind: 'aggregate' });
  const key = epicJournalKey(correlation), marker = epicMarker(correlation);
  const body = `Aggregate changes for #${snapshot.issue}.\n\nRefs #${snapshot.issue}.\n\nReview and merge remain separate decisions.\n\n${marker}`;
  let receipt = await journal.readReceipt(key);
  if (receipt && (!isDeepStrictEqual(receipt.correlation, correlation) || !['intent', 'created', 'linked'].includes(receipt.state))) throw Error('Aggregate journal is invalid');
  const pulls = await api(`pulls?state=all&head=${encodeURIComponent(`${owner}:${base}`)}&base=${encodeURIComponent(snapshot.defaultBranch)}&per_page=100`);
  if (!Array.isArray(pulls) || pulls.length >= 100 || pulls.length > 1) throw Error('Aggregate PR inventory is unavailable or ambiguous');
  let pr = pulls[0];
  if (pr && (!receipt?.resource || pr.id !== receipt.resource.id || pr.number !== receipt.resource.number || pr.html_url !== `https://github.com/${repository}/pull/${pr.number}` || pr.user?.login !== 'github-actions[bot]' || pr.user.type !== 'Bot' || pr.head?.ref !== base || pr.head.sha !== head || pr.head.repo?.full_name !== repository || pr.base?.ref !== snapshot.defaultBranch || pr.base.repo?.full_name !== repository || pr.body !== body || !isDeepStrictEqual(readEpicMarker(pr.body), correlation))) throw Error('Aggregate PR lacks its authenticated receipt or changed');
  if (!pr && receipt) throw Error('Aggregate PR creation is missing or uncertain');
  if (!pr) {
    if (await authorize() !== true) throw Error('Aggregate publication authority changed');
    receipt = { schemaVersion: 1, state: 'intent', correlation };
    await journal.writeReceipt(key, receipt);
    if ((await api(`git/ref/heads/${base}`)).object?.sha !== head || await authorize() !== true) throw Error('Epic branch or authority changed before aggregate publication');
    await verifyEpicBranchHistory(api, snapshot, journal, head, true, loadPolicy);
    pr = await api('pulls', 'POST', { title: `Epic #${snapshot.issue}: ${snapshot.plan.parent.title}`.slice(0, 180), head: base, base: snapshot.defaultBranch, draft: true, body });
    if (!Number.isSafeInteger(pr?.id) || pr.id < 1 || !Number.isSafeInteger(pr.number) || pr.number < 1 || pr.html_url !== `https://github.com/${repository}/pull/${pr.number}` || pr.head?.sha !== head || pr.head.ref !== base || pr.head.repo?.full_name !== repository || pr.base?.ref !== snapshot.defaultBranch || pr.base.repo?.full_name !== repository || pr.user?.login !== 'github-actions[bot]' || pr.user.type !== 'Bot' || pr.body !== body || !isDeepStrictEqual(readEpicMarker(pr.body), correlation)) throw Error('Aggregate PR creation could not be confirmed');
    receipt = { ...receipt, state: 'created', resource: { id: pr.id, number: pr.number } };
    await journal.writeReceipt(key, receipt);
  }
  if (pr.state !== 'open' || pr.merged) throw Error('Aggregate PR is no longer open; final acceptance needs reconciliation');
  if (receipt.state === 'created') { receipt = { ...receipt, state: 'linked' }; await journal.writeReceipt(key, receipt); }
  const notice = `<!-- lighthouse-epic-aggregate:${correlation.planDigest} -->`;
  const comments = await issueComments(api, snapshot.issue);
  const prior = comments.filter(comment => comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && comment.body?.includes(notice));
  if (prior.length > 1 || prior.length === 1 && !prior[0].body.includes(pr.html_url)) throw Error('Aggregate handoff is ambiguous');
  if (!prior.length) {
    if ((await api(`git/ref/heads/${base}`)).object?.sha !== head || await authorize() !== true) throw Error('Epic branch or authority changed before the aggregate handoff');
    await verifyEpicBranchHistory(api, snapshot, journal, head, true, loadPolicy);
    await api(`issues/${snapshot.issue}/comments`, 'POST', { body: `Aggregate draft PR: ${pr.html_url}\n\nReview and merge remain separate decisions. The parent remains open until the aggregate outcome is accepted.\n\n${notice}` });
  }
  return { status: 'published', pullRequest: pr.number, head, parent: 'open' };
}

export async function readyEpicAggregate({ api, repository, owner, snapshot, journal, authorize, load, loadPolicy, readArtifact, setDraft, findCandidates, authenticate }) {
  if (typeof setDraft !== 'function') throw Error('Aggregate readiness requires a draft updater');
  const observe = async () => {
    const published = await publishEpicAggregate({ api, repository, owner, snapshot, journal, authorize, load, loadPolicy, readArtifact, ...(findCandidates ? { findCandidates } : {}), ...(authenticate ? { authenticate } : {}) });
    const pr = await api(`pulls/${published.pullRequest}`);
    const base = await api(`git/ref/heads/${snapshot.defaultBranch}`);
    if (base.ref !== `refs/heads/${snapshot.defaultBranch}` || !/^[a-f0-9]{40}$/.test(base.object?.sha ?? '') || pr.head?.sha !== published.head || pr.base?.ref !== snapshot.defaultBranch || pr.mergeable !== true || !/^[a-f0-9]{40}$/.test(pr.merge_commit_sha ?? '')) throw Error('Aggregate readiness evidence is unavailable');
    const candidate = await api(`git/commits/${pr.merge_commit_sha}`);
    if (!Array.isArray(candidate?.parents) || candidate.parents.length !== 2 || candidate.parents[0].sha !== base.object.sha || candidate.parents[1].sha !== published.head || !await verifyEpicChecks(api, { repository, sourceRevision: snapshot.sourceRevision, base: snapshot.defaultBranch, candidate: pr.merge_commit_sha, loadPolicy }) || await authorize() !== true) throw Error('Aggregate checks do not bind the current head and base');
    return { pr, head: published.head, base: base.object.sha, candidate: pr.merge_commit_sha };
  };
  const first = await observe();
  if (first.pr.draft) {
    try { await setDraft(first.pr, false); }
    catch (error) { if ((await api(`pulls/${first.pr.number}`)).draft) throw error; }
  }
  const fresh = await observe();
  if (fresh.pr.draft || fresh.head !== first.head || fresh.base !== first.base || fresh.candidate !== first.candidate) throw Error('Aggregate readiness outcome is uncertain');
  return { status: 'ready', pullRequest: fresh.pr.number, head: fresh.head, base: fresh.base, parent: 'open' };
}

export async function ensureEpicBase(api, snapshot, authorize, verifyAdvanced = async () => false) {
  const branch = `lighthouse/epic-${snapshot.issue}`;
  const read = () => api(`git/ref/heads/${branch}`, 'GET', undefined, true);
  const current = await read();
  if (current) {
    if (current.ref !== `refs/heads/${branch}` || !/^[a-f0-9]{40}$/.test(current.object?.sha ?? '') || current.object.sha !== snapshot.sourceRevision && await verifyAdvanced(current.object.sha) !== true) throw Error('Epic branch already exists at an unverified revision');
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

export async function runNativeEpic({ api, repository, owner, issue, run, journalPath, readArtifact, load, loadPolicy }) {
  const snapshot = await prepareNativeEpic(api, repository, owner, issue, load);
  await checkEpicLeaseConfiguration(api, snapshot.sourceRevision);
  const authorize = () => authorizeNativeEpic(api, snapshot);
  const journal = await createEpicJournal({ api, repository, owner, parent: issue, sourceRevision: snapshot.sourceRevision, defaultBranch: snapshot.defaultBranch, run, path: journalPath, authorize, ...(readArtifact ? { readArtifact } : {}) });
  await ensureEpicBase(api, snapshot, authorize, head => verifyEpicBranchHistory(api, snapshot, journal, head, false, loadPolicy));
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

export async function runEpicAction({ api, repository, owner, issue, run, journalPath, action, child, implementationRun, decision, readArtifact, load, loadPolicy, setDraft = (pr, draft) => setPullRequestDraft(process.env.GH_TOKEN, pr, draft) }) {
  if (action === 'reconcile') return runNativeEpic({ api, repository, owner, issue, run, journalPath, readArtifact, load, loadPolicy });
  if (!['register-pr', 'ready-child', 'accept-child', 'publish-aggregate', 'ready-aggregate'].includes(action) || !['publish-aggregate', 'ready-aggregate'].includes(action) && (!Number.isSafeInteger(child) || child < 1)) throw Error('Invalid epic action or child');
  const snapshot = await prepareNativeEpic(api, repository, owner, issue, load);
  await checkEpicLeaseConfiguration(api, snapshot.sourceRevision);
  const authorize = () => authorizeNativeEpic(api, snapshot);
  const journal = await createEpicJournal({ api, repository, owner, parent: issue, sourceRevision: snapshot.sourceRevision, defaultBranch: snapshot.defaultBranch, run, path: journalPath, authorize, ...(readArtifact ? { readArtifact } : {}) });
  if (action === 'publish-aggregate') return publishEpicAggregate({ api, repository, owner, snapshot, journal, authorize, load, loadPolicy, readArtifact });
  if (action === 'ready-aggregate') return readyEpicAggregate({ api, repository, owner, snapshot, journal, authorize, load, loadPolicy, readArtifact, setDraft });
  if (action === 'register-pr') {
    const current = await authenticateEpicChild({ api, repository, owner, child, load, readArtifact });
    if (current.parent !== issue) throw Error('Epic child belongs to another parent');
    return reconcileEpicPullRequest({ api, repository, owner, child, runId: implementationRun, journal, authorize, load, ...(readArtifact ? { readArtifact } : {}) });
  }
  if (action === 'ready-child') return readyEpicPullRequest({ api, repository, owner, parent: issue, child, number: decision?.pr, head: decision?.head, base: decision?.base, journal, authorize, load, loadPolicy, readArtifact, setDraft });
  if (!decision || !Number.isSafeInteger(decision.pr) || !Number.isSafeInteger(decision.review) || !/^[a-f0-9]{40}$/.test(decision.head ?? '') || !/^[a-f0-9]{40}$/.test(decision.base ?? '')) throw Error('Epic acceptance needs a PR, review, head and base');
  const current = await authenticateEpicChild({ api, repository, owner, child, load, readArtifact, allowClosed: true });
  if (current.parent !== issue) throw Error('Epic child belongs to another parent');
  const childIssue = await api(`issues/${child}`), marker = readEpicMarker(childIssue.body);
  const correlation = epicCorrelation({ repository, parent: issue, slice: current.slice, planDigest: current.planDigest, base: current.base, dependencies: marker.dependencies, kind: 'pull-request' });
  const pr = await api(`pulls/${decision.pr}`), resource = { id: pr.id, number: pr.number };
  const authorizeDecision = async actual => {
    if (!isDeepStrictEqual(actual, decision) || await authorize() !== true) return false;
    const reviews = await list(api, `pulls/${decision.pr}/reviews`);
    const latest = reviews.filter(review => review.user?.login === owner && review.user.type === 'User' && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state)).sort((a, b) => b.id - a.id)[0];
    return latest?.id === decision.review && latest.state === 'APPROVED' && latest.commit_id === decision.head;
  };
  const observe = () => observeEpicMerge(api, { repository, owner, child, epic: current, decision }, {
    authenticateChild: () => authenticateEpicChild({ api, repository, owner, child, load, readArtifact }),
    authenticatePullRequest: fresh => authenticateEpicPullRequest({ api, repository, owner, child, pr: fresh, load, readArtifact, journal }),
    authorizeDecision,
    ...(loadPolicy ? { loadPolicy } : {}),
  });
  const verifyChecks = binding => verifyEpicChecks(api, { repository, sourceRevision: current.sourceRevision, base: current.base, candidate: binding.candidate, loadPolicy });
  const result = await mergeEpicChild(api, { correlation, resource }, { journal, observe, authorize: () => authorizeDecision(decision), verifyChecks });
  if (await authorizeDecision(decision) !== true) throw Error('Epic acceptance authority changed before child completion');
  const fresh = await api(`issues/${child}`);
  if (fresh.state === 'open') {
    await authenticateEpicChild({ api, repository, owner, child, load, readArtifact });
    try { await api(`issues/${child}`, 'PATCH', { state: 'closed', state_reason: 'completed' }); }
    catch (error) { if ((await api(`issues/${child}`)).state !== 'closed') throw error; }
  } else if (fresh.state !== 'closed') throw Error('Epic child completion is uncertain');
  return { ...result, child, parent: 'open' };
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
  const inputs = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8')).inputs ?? {};
  const positive = value => /^[1-9][0-9]*$/.test(value ?? '') && Number.isSafeInteger(Number(value));
  const action = inputs.action || 'reconcile';
  if (['register-pr', 'ready-child', 'accept-child'].includes(action) && !positive(inputs.child) || action === 'register-pr' && !positive(inputs.run) || ['ready-child', 'accept-child'].includes(action) && !positive(inputs['pull-request']) || action === 'accept-child' && !positive(inputs.review)) throw Error('Epic action inputs must use canonical positive numbers');
  const result = await runEpicAction({ api, repository, owner, issue, run, journalPath: join(dir, 'journal.json'), action, ...(inputs.child ? { child: Number(inputs.child) } : {}), ...(inputs.run ? { implementationRun: inputs.run } : {}), ...(['ready-child', 'accept-child'].includes(action) ? { decision: { pr: Number(inputs['pull-request']), ...(action === 'accept-child' ? { review: Number(inputs.review) } : {}), head: inputs.head, base: inputs.base } } : {}) });
  console.log(JSON.stringify(result));
  if (!['reconciled', 'linked', 'ready', 'accepted', 'published'].includes(result.status)) throw Error('Epic action stopped; inspect the retained journal before continuing');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
