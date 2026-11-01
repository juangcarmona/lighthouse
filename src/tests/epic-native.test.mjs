import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareNativeEpic, authorizeNativeEpic, authenticateEpicChild, checkEpicLeaseConfiguration, ensureEpicBase, runNativeEpic } from '../packages/sdlc/src/epic-native.mjs';

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
    if (/^contents\/\.github\/workflows\/lighthouse-sdlc-(?:triage|refine|implement)\.lock\.yml\?ref=/.test(path)) return { type: 'file', encoding: 'base64', size: Buffer.byteLength(worker), content: Buffer.from(worker).toString('base64') };
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
