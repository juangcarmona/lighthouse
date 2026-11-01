import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareNativeEpic, authorizeNativeEpic, authenticateEpicChild, authenticateEpicPullRequest, reconcileEpicPullRequest, inspectEpicDependencies, checkEpicLeaseConfiguration, ensureEpicBase, runNativeEpic, runEpicAction, acceptEpicAggregate } from '../packages/sdlc/src/epic-native.mjs';
import { epicCorrelation, epicJournalKey, epicMarker, readEpicMarker } from '../packages/sdlc/src/epic-github.mjs';
import { epicPlanDigest } from '../packages/sdlc/src/epic.mjs';
import { createEpicJournal } from '../packages/sdlc/src/epic-journal.mjs';
import { dispatchId, dispatchReceiptBody } from '../packages/sdlc/src/stage-dispatch.mjs';
import { changesDigest } from '../packages/sdlc/src/implementation.mjs';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { createHash } from 'node:crypto';

const repository = 'owner/repo', owner = 'owner', issue = 146, sha = 'a'.repeat(40);
const estimate = { points: 13, status: 'confirmed', confidence: 'medium', rationale: { scope: 'Several outcomes', dependencies: 'Dependent slices', verification: 'Independent tests' }, uncertainty: ['Host evidence'] };
const decomposition = { schemaVersion: 1, parent: { id: 'GH-146', title: 'Parent' }, slices: [
  { id: 'a', title: 'First outcome', scope: ['First bounded scope'], acceptance: ['First outcome verified'], dependencies: [] },
  { id: 'b', title: 'Second outcome', acceptance: ['Second outcome verified'], dependencies: ['a'] },
] };
const request = { schemaVersion: 1, runId: 'run', issue, stage: 'refine', workflowRunId: '100', sourceRevision: sha };
const result = { schemaVersion: 1, runId: 'run', stage: 'refine', gate: 'ready', status: 'passed', output: { estimate, decomposition }, evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Review the plan.' };
const envelope = { schemaVersion: 1, result, effect: { type: 'issue-comment', body: 'Plan ready.' } };

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-epic-native-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const parent = { number: issue, title: 'Parent', body: 'Bounded request', state: 'open', user: { login: owner, type: 'User' }, labels: [{ name: 'ready' }] };
  const bot = { login: 'github-actions[bot]', type: 'Bot' };
  const report = { id: 1, user: bot, issue_url: `https://api.github.com/repos/${repository}/issues/${issue}`, html_url: 'https://example.test/report', body: '<!-- lighthouse-stage:refine:passed -->' };
  const comments = [report], issues = [], parents = new Map(), dependencies = new Map(), calls = [];
  let branch;
  let router = 'jobs:\n  dispatch:\n    concurrency:\n      group: lighthouse-issue-${{ needs.route.outputs.epic_parent || needs.route.outputs.issue }}\n      cancel-in-progress: false\n      queue: max\n';
  const workflow = 'name: epic\nconcurrency:\n  group: lighthouse-issue-${{ inputs.issue }}\n  cancel-in-progress: false\n  queue: max\n';
  let worker = "name: worker\nconcurrency:\n  cancel-in-progress: false\n  group: ${{ inputs.epic-parent && format('lighthouse-epic-child-{0}', inputs.issue) || format('lighthouse-issue-{0}', inputs.issue) }}\n  queue: max\njobs:\n  prepare:\n    concurrency:\n      cancel-in-progress: false\n      group: ${{ inputs.epic-parent && format('lighthouse-issue-{0}', inputs.epic-parent) || format('lighthouse-prepare-{0}', github.run_id) }}\n      queue: max\n  publish:\n    concurrency:\n      cancel-in-progress: false\n      group: ${{ inputs.epic-parent && format('lighthouse-issue-{0}', inputs.epic-parent) || format('lighthouse-publish-{0}', github.run_id) }}\n      queue: max\n";
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (path === '') return { default_branch: 'main' };
    if (path === 'commits/main') return { sha };
    if (path === 'git/ref/heads/lighthouse/epic-146') return branch ?? null;
    if (path === 'git/refs' && method === 'POST') { branch = { ref: body.ref, object: { sha: body.sha } }; return branch; }
    if (path === `contents/.github/workflows/lighthouse-sdlc-router.yml?ref=${sha}` || path === `contents/.github/workflows/lighthouse-sdlc-epic.yml?ref=${sha}`) { const content = path.includes('router') ? router : workflow; return { type: 'file', encoding: 'base64', size: Buffer.byteLength(content), content: Buffer.from(content).toString('base64') }; }
    if (/^contents\/\.github\/workflows\/lighthouse-sdlc-(?:triage|refine|implement|apply-review)\.lock\.yml\?ref=/.test(path)) return { type: 'file', encoding: 'base64', size: Buffer.byteLength(worker), content: Buffer.from(worker).toString('base64') };
    if (path === `issues/${issue}`) return parent;
    if (path.startsWith(`issues/${issue}/comments?`)) return comments;
    if (path === `issues/${issue}/comments` && method === 'POST') { const comment = { id: comments.length + 1, user: bot, issue_url: report.issue_url, body: body.body }; comments.push(comment); return structuredClone(comment); }
    if (path.startsWith('issues/comments/') && method === 'PATCH') { const comment = comments.find(c => c.id === Number(path.split('/')[2])); comment.body = body.body; return structuredClone(comment); }
    if (path === 'issues?state=all&per_page=100&page=1') return issues;
    if (path === 'issues' && method === 'POST') { const child = { id: 1000 + issues.length, number: 200 + issues.length, user: bot, ...body }; issues.push(child); return structuredClone(child); }
    const parentMatch = path.match(/^issues\/(\d+)\/parent$/);
    if (parentMatch) return parents.get(Number(parentMatch[1])) ?? null;
    if (path === `issues/${issue}/sub_issues` && method === 'POST') { const child = issues.find(item => item.id === body.sub_issue_id); parents.set(child.number, { number: issue }); return {}; }
    const dependency = path.match(/^issues\/(\d+)\/dependencies\/blocked_by(?:\?.*)?$/);
    if (dependency) { const number = Number(dependency[1]); if (method === 'POST') { dependencies.set(number, [...(dependencies.get(number) ?? []), { id: body.issue_id }]); return {}; } return dependencies.get(number) ?? []; }
    throw Error(`Unexpected ${method} ${path}`);
  };
  const load = async (_api, _repo, _comments, current) => ({ request: { ...request, taskDigest: current.taskDigest }, envelope, report: report.html_url });
  const actor = { login: owner }, run = { id: 500, run_attempt: 1, status: 'in_progress', path: '.github/workflows/lighthouse-sdlc-epic.yml', event: 'workflow_dispatch', actor, triggering_actor: actor, head_sha: sha, head_branch: 'main', repository: { full_name: repository } };
  return { parent, comments, issues, parents, dependencies, calls, api, load, run, path: join(dir, 'journal.json'), setRouter: value => { router = value; }, setWorker: value => { worker = value; }, setBranch: value => { branch = value; } };
}

test('aggregate acceptance verifies retained history and refuses a revoked owner approval', async t => {
  const f = await fixture(t), bot = { login: 'github-actions[bot]', type: 'Bot' };
  await runNativeEpic({ api: f.api, repository, owner, issue, run: f.run, journalPath: f.path, load: f.load });
  const snapshot = await prepareNativeEpic(f.api, repository, owner, issue, f.load);
  const artifacts = new Map([['500', JSON.parse(await readFile(f.path, 'utf8'))]]);
  const readArtifact = async (_api, _repo, id) => artifacts.get(String(id));
  const origin = async (path, ...rest) => path.startsWith('actions/runs/') ? { ...f.run, id: Number(path.split('/')[2]), status: 'completed' } : f.api(path, ...rest);
  const path = `${f.path}.aggregate`, journal = await createEpicJournal({ api: origin, repository, owner, parent: issue, sourceRevision: sha, defaultBranch: 'main', run: { ...f.run, id: 501 }, path, authorize: async () => true, readArtifact });
  const branch = `lighthouse/epic-${issue}`, planDigest = epicPlanDigest(snapshot.plan), childPrs = new Map(), commits = new Map(), reviews = new Map();
  const merged = ['b'.repeat(40), 'c'.repeat(40)], candidate = ['d'.repeat(40), 'e'.repeat(40)], childHeads = ['1'.repeat(40), '2'.repeat(40)], tree = ['3'.repeat(40), '4'.repeat(40)];
  for (const [index, slice] of snapshot.plan.slices.entries()) {
    f.issues[index].state = 'closed';
    const correlation = epicCorrelation({ repository, parent: issue, slice: slice.id, planDigest, base: branch, dependencies: slice.dependencies, kind: 'pull-request' });
    const key = epicJournalKey(correlation), resource = { id: 900 + index, number: 90 + index }, publication = { run: '500', attempt: 1, head: childHeads[index] };
    const merge = { head: childHeads[index], base: index ? merged[index - 1] : sha, candidate: candidate[index], review: 200 + index, commit: merged[index] };
    await journal.readReceipt(key);
    await journal.writeReceipt(key, { schemaVersion: 1, state: 'intent', correlation });
    await journal.writeReceipt(key, { schemaVersion: 1, state: 'created', correlation, resource, publication });
    await journal.writeReceipt(key, { schemaVersion: 1, state: 'linked', correlation, resource, publication });
    await journal.writeReceipt(key, { schemaVersion: 1, state: 'merging', correlation, resource, publication, merge: { head: merge.head, base: merge.base, candidate: merge.candidate, review: merge.review } });
    await journal.writeReceipt(key, { schemaVersion: 1, state: 'accepted', correlation, resource, publication, merge });
    childPrs.set(resource.number, { ...resource, merged: true, user: bot, merged_by: bot, head: { sha: merge.head, repo: { full_name: repository } }, base: { ref: branch, repo: { full_name: repository } }, merge_commit_sha: merge.commit });
    commits.set(merge.commit, { parents: [{ sha: merge.base }], tree: { sha: tree[index] } });
    commits.set(merge.candidate, { tree: { sha: tree[index] } });
    reviews.set(resource.number, [{ id: merge.review, user: { login: owner, type: 'User' }, state: 'APPROVED', commit_id: merge.head }]);
  }
  const aggregate = epicCorrelation({ repository, parent: issue, slice: 'aggregate', planDigest, base: branch, dependencies: snapshot.plan.slices.map(slice => slice.id), kind: 'aggregate' });
  const aggregateKey = epicJournalKey(aggregate), resource = { id: 999, number: 99 }, aggregateCandidate = '5'.repeat(40), final = '6'.repeat(40), aggregateTree = '7'.repeat(40);
  await journal.readReceipt(aggregateKey);
  await journal.writeReceipt(aggregateKey, { schemaVersion: 1, state: 'intent', correlation: aggregate });
  await journal.writeReceipt(aggregateKey, { schemaVersion: 1, state: 'created', correlation: aggregate, resource });
  await journal.writeReceipt(aggregateKey, { schemaVersion: 1, state: 'linked', correlation: aggregate, resource, readiness: { head: merged[1], base: sha, candidate: aggregateCandidate } });
  artifacts.set('501', JSON.parse(await readFile(path, 'utf8')));
  const pr = { ...resource, state: 'closed', merged: true, user: bot, body: `Aggregate changes for #146.\n\nRefs #146.\n\nReview and merge remain separate decisions.\n\n${epicMarker(aggregate)}`, head: { ref: branch, sha: merged[1], repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, merge_commit_sha: final };
  commits.set(final, { parents: [{ sha }], tree: { sha: aggregateTree } });
  commits.set(aggregateCandidate, { parents: [{ sha }, { sha: merged[1] }], tree: { sha: aggregateTree } });
  reviews.set(99, [{ id: 300, user: { login: owner, type: 'User' }, state: 'APPROVED', commit_id: merged[1] }]);
  let comparison = 'identical', afterCompare = () => {};
  const api = async (path, method = 'GET', body) => {
    if (path === 'commits/main') return { sha: final };
    if (path.startsWith('contents/') && path.endsWith(`?ref=${final}`)) return f.api(path.replace(final, sha));
    if (path.startsWith('pulls?')) return [pr];
    if (/^pulls\/\d+$/.test(path)) return Number(path.split('/')[1]) === 99 ? pr : childPrs.get(Number(path.split('/')[1]));
    const review = path.match(/^pulls\/(\d+)\/reviews\?/); if (review) return reviews.get(Number(review[1]));
    if (path.startsWith('git/commits/')) return commits.get(path.split('/').at(-1));
    const check = path.match(/^commits\/([a-f0-9]{40})\/check-runs\?/); if (check) return { check_runs: [{ id: 1, name: 'ci', head_sha: check[1], status: 'completed', conclusion: 'success', app: { id: 42 } }] };
    if (/^commits\/[a-f0-9]{40}\/statuses\?/.test(path)) return [];
    if (path.startsWith('compare/')) { afterCompare(); return { status: comparison }; }
    if (path === `issues/${issue}` && method === 'PATCH') { Object.assign(f.parent, body); return f.parent; }
    if (/^issues\/20[01]$/.test(path)) return f.issues.find(child => child.number === Number(path.split('/')[1]));
    return origin(path, method, body);
  };
  const args = { api, repository, owner, issue, run: { ...f.run, id: 502, head_sha: final }, load: f.load, readArtifact, loadPolicy: async () => ({ checks: [{ context: 'ci', app: 42 }] }) };
  artifacts.get('501').entries[aggregateKey].receipt.readiness.head = '9'.repeat(40);
  await assert.rejects(acceptEpicAggregate(args), /artifact is missing or differs/);
  artifacts.get('501').entries[aggregateKey].receipt.readiness.head = merged[1];
  reviews.get(99).push({ id: 301, user: { login: owner, type: 'User' }, state: 'CHANGES_REQUESTED', commit_id: merged[1] });
  await assert.rejects(acceptEpicAggregate(args), /approval is missing or revoked/);
  assert.equal(f.parent.state, 'open');
  reviews.get(99).pop();
  comparison = 'diverged';
  await assert.rejects(acceptEpicAggregate(args), /absent from current main history/);
  comparison = 'identical';
  commits.get(final).tree.sha = '8'.repeat(40);
  await assert.rejects(acceptEpicAggregate(args), /differs from its checked candidate/);
  commits.get(final).tree.sha = aggregateTree;
  assert.equal(f.parent.state, 'open');
  afterCompare = () => { reviews.get(99).push({ id: 302, user: { login: owner, type: 'User' }, state: 'CHANGES_REQUESTED', commit_id: merged[1] }); afterCompare = () => {}; };
  await assert.rejects(acceptEpicAggregate(args), /approval is missing or revoked/);
  assert.equal(f.parent.state, 'open');
  reviews.get(99).pop();
  assert.deepEqual(await acceptEpicAggregate(args), { status: 'accepted', pullRequest: 99, parent: 'closed' });
  assert.equal(f.parent.state, 'closed');
});

test('native host creates bounded children and links the authenticated dependency graph', async t => {
  const f = await fixture(t);
  const output = await runNativeEpic({ api: f.api, repository, owner, issue, run: f.run, journalPath: f.path, load: f.load });
  assert.equal(output.status, 'reconciled');
  assert.equal(output.parent, 'open');
  assert.equal(f.issues.length, 2);
  assert.match(f.issues[0].body, /First bounded scope/);
  assert.equal(f.parents.get(200).number, issue);
  assert.equal(f.calls.filter(call => call.path === 'git/refs' && call.method === 'POST').length, 1);
  assert.deepEqual(f.dependencies.get(201), [{ id: 1000 }]);
  const journal = JSON.parse(await readFile(f.path, 'utf8'));
  assert.equal(Object.values(journal.entries).every(entry => entry.receipt.state === 'linked'), true);
});

test('epic branch creation is create-only and reconciles a lost response at the exact base', async t => {
  const f = await fixture(t), snapshot = await prepareNativeEpic(f.api, repository, owner, issue, f.load);
  await assert.rejects(ensureEpicBase(f.api, snapshot, async () => false), /authorization changed/);
  assert.equal(f.calls.some(call => call.path === 'git/refs' && call.method === 'POST'), false);
  let lost = true;
  const api = async (...args) => { const result = await f.api(...args); if (args[0] === 'git/refs' && lost) { lost = false; throw Error('response lost'); } return result; };
  assert.equal(await ensureEpicBase(api, snapshot, () => authorizeNativeEpic(api, snapshot)), 'lighthouse/epic-146');
  assert.equal(await ensureEpicBase(api, snapshot, () => authorizeNativeEpic(api, snapshot)), 'lighthouse/epic-146');
  assert.equal(f.calls.filter(call => call.path === 'git/refs' && call.method === 'POST').length, 1);
  f.setBranch({ ref: 'refs/heads/lighthouse/epic-146', object: { sha: 'b'.repeat(40) } });
  await assert.rejects(ensureEpicBase(api, snapshot, () => authorizeNativeEpic(api, snapshot)), /unverified revision/);
});

test('native host blocks changed owner intent, pause and later refinement', async t => {
  const f = await fixture(t);
  const snapshot = await prepareNativeEpic(f.api, repository, owner, issue, f.load);
  await assert.doesNotReject(authorizeNativeEpic(f.api, snapshot));
  f.parent.labels.push({ name: 'human-working' });
  await assert.rejects(authorizeNativeEpic(f.api, snapshot), /authority or refinement changed/);
  f.parent.labels.pop(); f.parent.body = 'Changed request';
  await assert.rejects(authorizeNativeEpic(f.api, snapshot), /authority or refinement changed/);
  f.parent.body = 'Bounded request'; f.comments.push({ id: 10, user: { login: 'github-actions[bot]', type: 'Bot' }, body: '<!-- lighthouse-stage:refine:passed -->' });
  await assert.rejects(authorizeNativeEpic(f.api, snapshot), /authority or refinement changed/);
});

test('child admission binds the current plan, native parent and retained owner workflow', async t => {
  const f = await fixture(t);
  await runNativeEpic({ api: f.api, repository, owner, issue, run: f.run, journalPath: f.path, load: f.load });
  const journal = JSON.parse(await readFile(f.path, 'utf8'));
  f.issues[0].state = 'open';
  const api = async (path, ...args) => {
    if (path === 'issues/200') return f.issues[0];
    if (path === 'actions/runs/500/attempts/1') return { ...f.run, status: 'completed' };
    return f.api(path, ...args);
  };
  const args = { api, repository, owner, child: 200, load: f.load, readArtifact: async () => journal };
  assert.equal((await authenticateEpicChild(args)).slice, 'a');
  f.issues[0].body += '\nChanged scope';
  await assert.rejects(authenticateEpicChild(args), /no longer matches/);
  f.issues[0].body = f.issues[0].body.replace('\nChanged scope', '');
  f.parents.set(200, { number: 147 });
  await assert.rejects(authenticateEpicChild(args), /parent link changed/);
  f.parents.set(200, { number: issue });
  f.parent.labels.push({ name: 'future' });
  await assert.rejects(authenticateEpicChild(args), /paused/);
});

test('child PR authentication requires its own retained journal receipt', async t => {
  const f = await fixture(t);
  await runNativeEpic({ api: f.api, repository, owner, issue, run: f.run, journalPath: f.path, load: f.load });
  const artifacts = new Map([['500', JSON.parse(await readFile(f.path, 'utf8'))]]);
  f.issues[0].state = 'open';
  const readArtifact = async (_api, _repo, id) => artifacts.get(String(id));
  const api = async (path, ...args) => {
    if (path === 'issues/200') return f.issues[0];
    if (/^actions\/runs\/(500|501)\/attempts\/1$/.test(path)) return { ...f.run, id: Number(path.split('/')[2]), status: 'completed' };
    return f.api(path, ...args);
  };
  const childMarker = readEpicMarker(f.issues[0].body);
  const correlation = epicCorrelation({ ...childMarker, kind: 'pull-request' }), key = epicJournalKey(correlation);
  const journalPath = `${f.path}.pr`, journal = await createEpicJournal({ api, repository, owner, parent: issue, sourceRevision: sha, defaultBranch: 'main', run: { ...f.run, id: 501 }, path: journalPath, authorize: async () => true, readArtifact });
  await journal.readReceipt(key);
  const resource = { id: 777, number: 7 }, publication = { run: '500', attempt: 1, head: sha };
  await journal.writeReceipt(key, { schemaVersion: 1, state: 'intent', correlation });
  await journal.writeReceipt(key, { schemaVersion: 1, state: 'created', correlation, resource, publication });
  await journal.writeReceipt(key, { schemaVersion: 1, state: 'linked', correlation, resource, publication });
  artifacts.set('501', JSON.parse(await readFile(journalPath, 'utf8')));
  const marker = 'a'.repeat(64);
  const pr = { ...resource, state: 'open', merged: false, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { ref: `lighthouse/implement-200-${marker.slice(0, 12)}`, sha, repo: { full_name: repository } }, base: { ref: 'lighthouse/epic-146', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${marker} -->` };
  const args = { api, repository, owner, child: 200, pr, load: f.load, readArtifact };
  assert.equal(await authenticateEpicPullRequest(args), true);
  await assert.rejects(authenticateEpicPullRequest({ ...args, pr: { ...pr, id: 778 } }), /does not match/);
  await assert.rejects(authenticateEpicPullRequest({ ...args, pr: { ...pr, head: { ...pr.head, sha: 'b'.repeat(40) } } }), /head lacks a current publication receipt/);
  await journal.writeReceipt(key, { schemaVersion: 1, state: 'merging', correlation, resource, publication, merge: { head: sha, base: sha, candidate: sha, review: 9 } });
  assert.equal(await authenticateEpicPullRequest({ ...args, journal }), true);
});

test('child PR reconciliation authenticates the dispatch, retained checks and exact published tree', async t => {
  const f = await fixture(t);
  await runNativeEpic({ api: f.api, repository, owner, issue, run: f.run, journalPath: f.path, load: f.load });
  const originalJournal = JSON.parse(await readFile(f.path, 'utf8'));
  f.issues[0].state = 'open';
  const bot = { login: 'github-actions[bot]', type: 'Bot' }, actor = { login: owner }, base = 'b'.repeat(40), head = 'c'.repeat(40);
  const epic = { parent: issue, slice: 'a', planDigest: readEpicMarker(f.issues[0].body).planDigest, base: 'lighthouse/epic-146', sourceRevision: sha };
  const request = { schemaVersion: 1, id: dispatchId(repository, '600', 'implement'), repository, issue: 200, stage: 'implement', routerRunId: '600', routerAttempt: 1, workflowRevision: sha, sourceRevision: sha, ref: 'main', eventName: 'workflow_dispatch', event: { inputs: { issue: '200', stage: 'implement' } }, handoff: false, taskDigest: 'd'.repeat(64), epic: { ...epic, baseSha: base } };
  const receipt = { schemaVersion: 1, stage: 'implement', id: request.id, digest: digest(JSON.stringify(request)), routerRunId: '600', routerAttempt: 1, workerRunId: '700', status: 'completed' };
  const comment = { id: 900, user: bot, issue_url: `https://api.github.com/repos/${repository}/issues/200`, body: dispatchReceiptBody(repository, receipt) };
  const snapshot = { issue: 200, stage: 'implement', runId: digest(`${repository}:200:implement:700:1`), workflowRunId: '700', workflowRevision: sha, sourceRevision: base, baseRevision: sha, taskDigest: request.taskDigest, epic: { ...epic, baseSha: base }, dispatch: { commentId: 900, requestId: request.id, digest: receipt.digest }, implementation: { policy: { paths: ['src/'], checks: [['npm', 'test']] } } };
  const changes = [{ path: 'src/a.txt', mode: '100644', content: Buffer.from('new').toString('base64') }];
  const checks = { runId: snapshot.runId, sourceRevision: base, changesDigest: changesDigest(changes), checks: [{ command: ['npm', 'test'], exitCode: 0 }] };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: snapshot.runId, stage: 'implement', gate: 'done', status: 'passed', evidence: [{ id: 'test', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Review.' }, effect: { type: 'issue-comment', body: 'Ready.' } };
  const run = { id: 700, run_attempt: 1, status: 'completed', path: '.github/workflows/lighthouse-sdlc-implement.lock.yml', event: 'workflow_dispatch', actor: bot, triggering_actor: bot, head_sha: sha, head_branch: 'main', repository: { full_name: repository } };
  const router = { id: 600, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch', actor, triggering_actor: actor, head_sha: sha, head_branch: 'main', repository: { full_name: repository } };
  const blob = createHash('sha1').update('blob 3\0new').digest('hex');
  const pr = { id: 777, number: 7, state: 'open', merged: false, user: bot, head: { ref: `lighthouse/implement-200-${snapshot.runId.slice(0, 12)}`, sha: head, repo: { full_name: repository } }, base: { ref: epic.base, repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${snapshot.runId} -->` };
  let changedBlob = blob;
  const api = async (path, ...args) => {
    if (path === 'issues/200') return f.issues[0];
    if (path === 'issues/comments/900') return comment;
    if (path === 'actions/runs/500/attempts/1') return { ...f.run, status: 'completed' };
    if (path === 'actions/runs/600/attempts/1') return router;
    if (path === 'actions/runs/700') return run;
    if (path === 'pulls/7') return pr;
    if (path === `git/commits/${head}`) return { parents: [{ sha: base }] };
    if (path === `git/trees/${base}?recursive=1`) return { tree: [] };
    if (path === `git/trees/${head}?recursive=1`) return { tree: [{ path: 'src/a.txt', type: 'blob', mode: '100644', sha: changedBlob }] };
    return f.api(path, ...args);
  };
  const readArtifact = async (_api, _repo, id, _name, file) => {
    if (String(id) === '500') return originalJournal;
    if (String(id) === '600') return request;
    return ({ 'request.json': snapshot, 'envelope.json': envelope, 'changes.json': changes, 'checks.json': checks, 'published-pr.json': { number: 7, head } })[file];
  };
  let recorded, writes = 0;
  const journal = { readReceipt: async () => recorded, writeReceipt: async (_key, value) => { recorded = structuredClone(value); writes++; } };
  const args = { api, repository, owner, child: 200, runId: 700, journal, authorize: async () => true, load: f.load, readArtifact };
  assert.deepEqual(await reconcileEpicPullRequest(args), { status: 'linked', pullRequest: 7, head });
  assert.equal(writes, 3);
  assert.equal((await reconcileEpicPullRequest(args)).status, 'linked');
  assert.equal(writes, 3);
  changedBlob = 'f'.repeat(40);
  await assert.rejects(reconcileEpicPullRequest(args), /differs from validated content/);
});

test('owner acceptance merges one authenticated child and leaves the parent open', async t => {
  const f = await fixture(t);
  await runNativeEpic({ api: f.api, repository, owner, issue, run: f.run, journalPath: f.path, load: f.load });
  const artifacts = new Map([['500', JSON.parse(await readFile(f.path, 'utf8'))]]), child = f.issues[0];
  child.state = 'open'; child.labels = [{ name: 'pr-draft' }];
  const readArtifact = async (_api, _repo, id) => artifacts.get(String(id));
  const head = 'b'.repeat(40), candidate = 'c'.repeat(40), mergedCommit = 'd'.repeat(40), tree = 'e'.repeat(40), runId = 'a'.repeat(64);
  const pr = { id: 777, number: 7, state: 'open', merged: false, draft: true, mergeable: true, merge_commit_sha: candidate, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { ref: `lighthouse/implement-200-${runId.slice(0, 12)}`, sha: head, repo: { full_name: repository } }, base: { ref: 'lighthouse/epic-146', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${runId} -->` };
  const review = { id: 9, user: { login: owner, type: 'User' }, state: 'APPROVED', commit_id: head };
  let mergeCalls = 0;
  const api = async (path, method = 'GET', body) => {
    if (path === 'issues/200') { if (method === 'PATCH') child.state = body.state; return child; }
    if (path === 'issues/200/labels/pr-draft' && method === 'DELETE') { child.labels = child.labels.filter(label => label.name !== 'pr-draft'); return; }
    if (path === 'issues/200/labels' && method === 'POST') { child.labels.push(...body.labels.map(name => ({ name }))); return; }
    if (path === 'issues/201') return f.issues[1];
    if (/^actions\/runs\/(500|501|502|503)\/attempts\/1$/.test(path)) return { ...f.run, id: Number(path.split('/')[2]), status: 'completed' };
    if (path === 'pulls/7') return pr;
    if (path === 'pulls/7/merge' && method === 'PUT') { mergeCalls++; Object.assign(pr, { state: 'closed', merged: true, merge_commit_sha: mergedCommit, merged_by: { login: 'github-actions[bot]', type: 'Bot' } }); f.setBranch({ ref: 'refs/heads/lighthouse/epic-146', object: { sha: mergedCommit } }); return { merged: true, sha: mergedCommit }; }
    if (path.startsWith('pulls/7/reviews?')) return [review];
    if (path === `git/commits/${candidate}`) return { parents: [{ sha }, { sha: head }], tree: { sha: tree } };
    if (path === `git/commits/${mergedCommit}`) return { parents: [{ sha }], tree: { sha: tree } };
    if (path.startsWith(`commits/${candidate}/check-runs?`)) return { check_runs: [{ id: 1, name: 'ci', head_sha: candidate, status: 'completed', conclusion: 'success', app: { id: 42 } }] };
    if (path.startsWith(`commits/${candidate}/statuses?`)) return [];
    if (path === `compare/${mergedCommit}...${mergedCommit}`) return { status: 'identical', merge_base_commit: { sha: mergedCommit } };
    return f.api(path, method, body);
  };
  const correlation = epicCorrelation({ ...readEpicMarker(child.body), kind: 'pull-request' }), key = epicJournalKey(correlation), resource = { id: 777, number: 7 };
  const registrationPath = `${f.path}.registration`;
  const journal = await createEpicJournal({ api, repository, owner, parent: issue, sourceRevision: sha, defaultBranch: 'main', run: { ...f.run, id: 501 }, path: registrationPath, authorize: async () => true, readArtifact });
  await journal.readReceipt(key);
  await journal.writeReceipt(key, { schemaVersion: 1, state: 'intent', correlation });
  const publication = { run: '500', attempt: 1, head };
  await journal.writeReceipt(key, { schemaVersion: 1, state: 'created', correlation, resource, publication });
  await journal.writeReceipt(key, { schemaVersion: 1, state: 'linked', correlation, resource, publication });
  artifacts.set('501', JSON.parse(await readFile(registrationPath, 'utf8')));
  const ready = await runEpicAction({ api, repository, owner, issue, run: { ...f.run, id: 502 }, journalPath: `${f.path}.ready`, action: 'ready-child', child: 200, decision: { pr: 7, head, base: sha }, readArtifact, load: f.load, loadPolicy: async () => ({ checks: [{ context: 'ci', app: 42 }] }), setDraft: async (_pr, value) => { pr.draft = value; } });
  assert.equal(ready.status, 'ready');
  assert.equal(pr.draft, false);
  assert.deepEqual(child.labels.map(label => label.name), ['pr-ready']);
  const decision = { pr: 7, review: 9, head, base: sha }, acceptancePath = `${f.path}.acceptance`;
  const args = { api, repository, owner, issue, run: { ...f.run, id: 503 }, journalPath: acceptancePath, action: 'accept-child', child: 200, decision, readArtifact, load: f.load, loadPolicy: async () => ({ checks: [{ context: 'ci', app: 42 }] }) };
  const result = await runEpicAction(args);
  assert.equal(result.status, 'accepted');
  assert.equal(result.commit, mergedCommit);
  assert.equal(child.state, 'closed');
  assert.equal(f.parent.state, 'open');
  assert.equal(mergeCalls, 1);
  artifacts.set('503', JSON.parse(await readFile(acceptancePath, 'utf8')));
  f.issues[1].state = 'open';
  const dependent = await authenticateEpicChild({ api, repository, owner, child: 201, load: f.load, readArtifact });
  assert.deepEqual(await inspectEpicDependencies({ api, repository, owner, child: 201, current: dependent, load: f.load, readArtifact, loadPolicy: args.loadPolicy }), { baseSha: mergedCommit });
  const repeated = await runEpicAction({ ...args, run: { ...f.run, id: 504 }, journalPath: `${f.path}.repeat` });
  assert.equal(repeated.recovered, true);
  assert.equal(mergeCalls, 1);
  const reconciled = await runNativeEpic({ api, repository, owner, issue, run: { ...f.run, id: 505 }, journalPath: `${f.path}.advanced`, readArtifact, load: f.load, loadPolicy: args.loadPolicy });
  assert.equal(reconciled.status, 'reconciled');
  f.setBranch({ ref: 'refs/heads/lighthouse/epic-146', object: { sha: 'f'.repeat(40) } });
  await assert.rejects(runNativeEpic({ api, repository, owner, issue, run: { ...f.run, id: 506 }, journalPath: `${f.path}.unexpected`, readArtifact, load: f.load, loadPolicy: args.loadPolicy }), /unverified commit/);
});

test('native host refuses a router without the shared issue lease', async t => {
  const f = await fixture(t);
  await assert.doesNotReject(checkEpicLeaseConfiguration(f.api, sha));
  f.setRouter('jobs:\n  dispatch:\n    concurrency:\n      group: lighthouse-dispatch-${{ needs.route.outputs.issue }}\n      cancel-in-progress: false\n      queue: max\n');
  await assert.rejects(runNativeEpic({ api: f.api, repository, owner, issue, run: f.run, journalPath: f.path, load: f.load }), /shared issue dispatch lease/);
  assert.equal(f.calls.some(call => call.method !== 'GET'), false);
});

test('current workflow projections satisfy the native lease checks', async () => {
  const root = new URL('../packages/sdlc/workflows/', import.meta.url);
  const api = async path => {
    const name = path.match(/^contents\/\.github\/workflows\/([^?]+)\?ref=/)?.[1];
    assert.ok(name);
    const content = await readFile(new URL(name, root));
    return { type: 'file', encoding: 'base64', size: content.length, content: content.toString('base64') };
  };
  await assert.doesNotReject(checkEpicLeaseConfiguration(api, sha));
});

test('native host refuses older workers without the shared parent lease', async t => {
  const f = await fixture(t);
  f.setWorker('name: old worker\nconcurrency:\n  group: lighthouse-issue-${{ inputs.issue }}\n');
  await assert.rejects(runNativeEpic({ api: f.api, repository, owner, issue, run: f.run, journalPath: f.path, load: f.load }), /worker does not hold the child lease/);
  assert.equal(f.calls.some(call => call.method !== 'GET'), false);
});

test('native host rejects a worker whose publication lacks the parent lease', async t => {
  const f = await fixture(t);
  const worker = await f.api(`contents/.github/workflows/lighthouse-sdlc-refine.lock.yml?ref=${sha}`);
  f.setWorker(Buffer.from(worker.content, 'base64').toString().replace("format('lighthouse-publish-{0}', github.run_id)", "format('unrelated-{0}', github.run_id)"));
  await assert.rejects(runNativeEpic({ api: f.api, repository, owner, issue, run: f.run, journalPath: f.path, load: f.load }), /publish does not hold the shared parent lease/);
  assert.equal(f.calls.some(call => call.method !== 'GET'), false);
});
