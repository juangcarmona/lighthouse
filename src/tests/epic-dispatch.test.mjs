import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchEpicTriage, verifyEpicTriageOrigin, dispatchEpicRefinement, verifyEpicRefinementOrigin } from '../packages/sdlc/src/epic-dispatch.mjs';
import { epicCorrelation, epicJournalKey } from '../packages/sdlc/src/epic-github.mjs';
import { dispatchId, dispatchReceiptBody, epicTriageKey, epicRefinementKey, isBotEpicTriage, isBotEpicRefinement, verifyDispatchOrigin } from '../packages/sdlc/src/stage-dispatch.mjs';
import { digest } from '../packages/sdlc/src/host-contract.mjs';

const repository = 'owner/repo', owner = 'owner', revision = 'a'.repeat(40), planDigest = 'b'.repeat(64), bot = { login: 'github-actions[bot]', type: 'Bot' };
function fixture() {
  const run = { id: 500, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-epic.yml', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', actor: { login: owner }, triggering_actor: { login: owner }, repository: { full_name: repository }, head_branch: 'main', head_sha: revision };
  const journal = { schemaVersion: 1, repository, parent: 146, revision, runId: '500', attempt: 1, entries: {} };
  for (const [slice, number] of [['a', 10], ['b', 11]]) {
    const correlation = epicCorrelation({ repository, parent: 146, slice, planDigest, base: 'lighthouse/epic-146', dependencies: [] });
    journal.entries[epicJournalKey(correlation)] = { commentId: number + 100, receipt: { schemaVersion: 1, state: 'linked', correlation, resource: { id: number + 1000, number } } };
  }
  const issues = new Map([[10, { number: 10, state: 'open', labels: [] }], [11, { number: 11, state: 'open', labels: [] }]]), comments = new Map(), posts = [];
  const api = async (path, method = 'GET', body) => {
    if (path === 'actions/runs/500') return run;
    if (path === 'actions/runs/500/artifacts?per_page=100') return { total_count: 1, artifacts: [{ name: 'lighthouse-epic-journal-146-1', expired: false }] };
    if (path === '') return { default_branch: 'main' };
    if (path === 'commits/main') return { sha: revision };
    if (path === 'actions/workflows/lighthouse-sdlc-router.yml/dispatches') { posts.push(body); return; }
    const match = path.match(/^issues\/(\d+)(\/comments\?.*)?$/);
    if (match) return match[2] ? comments.get(Number(match[1])) ?? [] : issues.get(Number(match[1]));
    throw Error(`Unexpected ${path}`);
  };
  const readArtifact = async () => journal;
  const authenticate = async ({ child }) => ({ parent: 146, slice: child === 10 ? 'a' : 'b', planDigest, base: 'lighthouse/epic-146', sourceRevision: revision });
  return { run, journal, issues, comments, posts, api, readArtifact, authenticate };
}

test('completed owner epic execution schedules each eligible child once', async () => {
  const f = fixture(), args = { repository, owner, runId: 500 }, options = { readArtifact: f.readArtifact, authenticate: f.authenticate };
  assert.deepEqual((await dispatchEpicTriage(f.api, args, options)).children, [10, 11]);
  assert.equal(f.posts.length, 2);
  assert.equal(f.posts[0].inputs.epic_parent, '146');
  assert.equal(f.posts[0].inputs.epic_run, '500');
  f.issues.get(11).labels.push({ name: 'future' });
  const key = epicTriageKey(repository, 146, 10, planDigest);
  const receipt = { schemaVersion: 1, stage: 'triage', epicKey: key, id: dispatchId(repository, key, 'triage'), digest: 'c'.repeat(64), routerRunId: '700', routerAttempt: 1, eventRunId: '500', workerRunId: null, status: 'requested' };
  f.comments.set(10, [{ id: 1, user: bot, issue_url: `https://api.github.com/repos/${repository}/issues/10`, body: dispatchReceiptBody(repository, receipt) }]);
  assert.deepEqual((await dispatchEpicTriage(f.api, args, options)).children, []);
  assert.equal(f.posts.length, 2);
});

test('epic triage rejects changed parent execution, journal and child authority', async () => {
  for (const mutate of [
    f => { f.run.actor.login = 'outsider'; },
    f => { f.run.conclusion = 'failure'; },
    f => { f.journal.revision = 'f'.repeat(40); },
    f => { f.authenticate = async () => ({ parent: 147, slice: 'a', planDigest }); },
    f => { delete f.journal.entries[Object.keys(f.journal.entries)[0]]; },
  ]) {
    const f = fixture(); mutate(f);
    await assert.rejects(verifyEpicTriageOrigin(f.api, { repository, owner, child: 10, parent: 146, runId: 500 }, { readArtifact: f.readArtifact, authenticate: f.authenticate }));
  }
});

test('bot triage dispatch binds a stable identity to parent, child and plan', () => {
  const f = fixture(), epic = { parent: 146, slice: 'a', planDigest, base: 'lighthouse/epic-146', sourceRevision: revision }, key = epicTriageKey(repository, 146, 10, planDigest);
  const event = { inputs: { issue: '10', stage: 'triage', epic_parent: '146', epic_run: '500' } };
  assert.equal(isBotEpicTriage(event, 'workflow_dispatch', bot.login, bot.login), true);
  const request = { schemaVersion: 1, id: dispatchId(repository, key, 'triage'), epicKey: key, epic, repository, issue: 10, stage: 'triage', routerRunId: '700', routerAttempt: 1, workflowRevision: revision, sourceRevision: revision, taskDigest: 'c'.repeat(64), ref: 'main', eventName: 'workflow_dispatch', event, handoff: false, eventRunId: '500' };
  const receipt = { schemaVersion: 1, stage: 'triage', epicKey: key, id: request.id, digest: digest(JSON.stringify(request)), routerRunId: '700', routerAttempt: 1, eventRunId: '500', workerRunId: null };
  const parent = { id: 700, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch', actor: bot, triggering_actor: bot, head_sha: revision, head_branch: 'main', repository: { full_name: repository } };
  const worker = { path: '.github/workflows/lighthouse-sdlc-triage.lock.yml', event: 'workflow_dispatch', actor: bot, triggering_actor: bot, head_sha: revision, head_branch: 'main', repository: { full_name: repository } };
  assert.doesNotThrow(() => verifyDispatchOrigin(request, receipt, parent, worker, repository, owner, 10));
  assert.throws(() => verifyDispatchOrigin({ ...request, epicKey: 'd'.repeat(64) }, receipt, parent, worker, repository, owner, 10));
  assert.equal(epicTriageKey(repository, 146, 10, planDigest), key);
  assert.notEqual(epicTriageKey(repository, 146, 11, planDigest), key);
});

test('owner authorization dispatches the current epic child refinement and rejects stale authority', async () => {
  const f = fixture(), current = { child: 10, epic: await f.authenticate({ child: 10 }), taskDigest: 'd'.repeat(64), triage: { runId: '300', attempt: 1, reportId: 12, runIdentity: 'e'.repeat(64) } };
  const artifact = { schemaVersion: 1, repository, parent: 146, runId: '500', attempt: 1, revision, observation: current };
  const opts = { readArtifact: async () => artifact, observe: async () => current };
  assert.equal((await verifyEpicRefinementOrigin(f.api, { repository, owner, child: 10, parent: 146, runId: 500 }, opts)).current.child, 10);
  assert.equal((await dispatchEpicRefinement(f.api, { repository, owner, child: 10, parent: 146, runId: 500 }, opts)).status, 'dispatched');
  assert.equal(f.posts.at(-1).inputs.stage, 'refine');
  f.issues.get(10).labels.push({ name: 'future' });
  assert.equal((await dispatchEpicRefinement(f.api, { repository, owner, child: 10, parent: 146, runId: 500 }, opts)).status, 'paused');
  f.issues.get(10).labels.pop();
  artifact.observation = { ...current, taskDigest: 'f'.repeat(64) };
  await assert.rejects(verifyEpicRefinementOrigin(f.api, { repository, owner, child: 10, parent: 146, runId: 500 }, opts), /authorization or triage changed/);
  artifact.observation = current; f.run.actor.login = 'outsider';
  await assert.rejects(verifyEpicRefinementOrigin(f.api, { repository, owner, child: 10, parent: 146, runId: 500 }, opts), /owner execution/);
});

test('completed epic run selects its retained refinement authorization instead of child triage', async () => {
  const f = fixture(), current = { child: 10, epic: await f.authenticate({ child: 10 }), taskDigest: 'd'.repeat(64), triage: { runId: '300', attempt: 1, reportId: 12, runIdentity: 'e'.repeat(64) } };
  const artifact = { schemaVersion: 1, repository, parent: 146, runId: '500', attempt: 1, revision, observation: current };
  const api = async (path, method, body) => path === 'actions/runs/500/artifacts?per_page=100' ? { total_count: 2, artifacts: [{ name: 'lighthouse-epic-journal-146-1', expired: false }, { name: 'lighthouse-epic-refinement-146-10-1', expired: false }] } : f.api(path, method, body);
  const result = await dispatchEpicTriage(api, { repository, owner, runId: 500 }, { readArtifact: async () => artifact, observe: async () => current });
  assert.equal(result.status, 'dispatched');
  assert.deepEqual(f.posts.map(post => [post.inputs.issue, post.inputs.stage]), [['10', 'refine']]);
});

test('bot epic refinement is bound to one owner authorization execution', () => {
  const epic = { parent: 146, slice: 'a', planDigest, base: 'lighthouse/epic-146', sourceRevision: revision };
  const event = { inputs: { issue: '10', stage: 'refine', workflow: 'stage', epic_parent: '146', epic_run: '500' } };
  const key = epicRefinementKey(repository, 146, 10, planDigest, '500');
  const request = { schemaVersion: 1, id: dispatchId(repository, key, 'refine'), epicKey: key, epic, repository, issue: 10, stage: 'refine', routerRunId: '700', routerAttempt: 1, workflowRevision: revision, sourceRevision: revision, taskDigest: 'c'.repeat(64), ref: 'main', eventName: 'workflow_dispatch', event, handoff: false, eventRunId: '500' };
  const receipt = { schemaVersion: 1, stage: 'refine', epicKey: key, id: request.id, digest: digest(JSON.stringify(request)), routerRunId: '700', routerAttempt: 1, eventRunId: '500', workerRunId: null };
  const parent = { id: 700, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch', actor: bot, triggering_actor: bot, head_sha: revision, head_branch: 'main', repository: { full_name: repository } };
  const worker = { path: '.github/workflows/lighthouse-sdlc-refine.lock.yml', event: 'workflow_dispatch', actor: bot, triggering_actor: bot, head_sha: revision, head_branch: 'main', repository: { full_name: repository } };
  assert.equal(isBotEpicRefinement(event, 'workflow_dispatch', bot.login, bot.login), true);
  assert.doesNotThrow(() => verifyDispatchOrigin(request, receipt, parent, worker, repository, owner, 10));
  assert.throws(() => verifyDispatchOrigin({ ...request, epicKey: 'd'.repeat(64) }, receipt, parent, worker, repository, owner, 10));
  assert.notEqual(key, epicRefinementKey(repository, 146, 10, planDigest, '501'));
});
