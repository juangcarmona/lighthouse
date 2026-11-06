import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { taskDigest } from '../packages/sdlc/src/issue-actions.mjs';

const main = 'a'.repeat(40), accepted = 'b'.repeat(40), workflow = 'c'.repeat(40);
const repository = 'owner/repo', owner = 'owner', child = 18;
const epic = { parent: 146, slice: 'B', planDigest: 'd'.repeat(64), base: 'lighthouse/epic-146', sourceRevision: main };
const estimate = { points: 2, status: 'provisional', rationale: { scope: 'One formatter', dependencies: 'Accepted A', verification: 'Composition tests' }, confidence: 'high', uncertainty: [] };

async function fixture(stage = 'refine', scenario = 'current') {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-epic-refinement-source-'));
  const issue = { number: child, title: 'Format the accepted summary', body: 'Consume the four-count summarizer accepted in A.', user: { login: 'github-actions[bot]', type: 'Bot' }, state: 'open', labels: [{ name: 'triaged' }] };
  const triage = { issue: child, runId: 'e'.repeat(64), stage: 'triage', sourceRevision: main, originalRequest: issue.body, taskDigest: taskDigest(issue, []), epic };
  const triageEnvelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: triage.runId, stage: 'triage', gate: 'triaged', status: 'passed', evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Refine after A is accepted.', output: { estimate, requestAnalysis: { originalRequest: issue.body, problem: 'Format counts', desiredResult: 'Exact text', inferences: [], unknowns: [], questions: [] } } }, effect: { type: 'issue-comment', body: 'Triage passed.' } };
  const event = { inputs: { issue: String(child), stage, workflow: 'stage' } };
  const request = { id: 'f'.repeat(64), repository, issue: child, stage, sourceRevision: main, workflowRevision: workflow, routerRunId: '100', routerAttempt: 1, taskDigest: taskDigest(issue, []), epic: { ...epic, ...(['refine', 'implement'].includes(stage) && scenario !== 'missing-base' ? { baseSha: accepted } : {}) }, event, eventName: 'workflow_dispatch', handoff: false, autoImplement: false };
  await writeFile(join(dir, 'state.json'), JSON.stringify({ scenario, issue, triage, triageEnvelope, request, calls: [] }));
  await writeFile(join(dir, 'event.json'), JSON.stringify({ inputs: { 'dispatch-request': '1' } }));
  const modules = new URL('../packages/sdlc/src/', import.meta.url).href;
  await writeFile(join(dir, 'mock.mjs'), `
import { registerHooks } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const file = ${JSON.stringify(join(dir, 'state.json'))};
const load = () => JSON.parse(readFileSync(file));
globalThis.fetch = async (url, options) => {
  const s = load(), path = url.replace('https://api.github.com/repos/owner/repo', '').replace(/^\\//, '');
  s.calls.push({ path, method: options.method }); writeFileSync(file, JSON.stringify(s));
  let value;
  if (!path) value = { default_branch: 'main' };
  else if (path === 'commits/main') value = { sha: '${main}' };
  else if (path === 'issues/18') value = s.issue;
  else if (path.startsWith('issues/18/comments?')) value = [{ id: 10, user: s.issue.user, body: '<!-- lighthouse-stage:triage:passed -->' }];
  else if (path === 'issues/18/labels' && options.method === 'POST') { s.issue.labels.push(...JSON.parse(options.body).labels.map(name => ({ name }))); value = s.issue.labels; }
  else if (path === 'actions/runs/200/attempts/1') value = { id: 200 };
  else if (path.startsWith('pulls?')) value = [];
  else throw Error('Unexpected ' + options.method + ' ' + path);
  writeFileSync(file, JSON.stringify(s));
  return { ok: true, status: 200, json: async () => value };
};
registerHooks({ load(url, context, next) {
  if (!url.startsWith(${JSON.stringify(modules)}) || url.includes('?actual')) return next(url, context);
  const original = JSON.stringify(url + '?actual');
  let extra;
  if (url.endsWith('/stage-dispatch.mjs')) extra = 'export async function admitDispatch() { return { admitted: true, commentId: 1, request: JSON.parse(readFileSync(file)).request, receipt: { digest: "' + '0'.repeat(64) + '" } }; } export async function checkDispatchClaim() {} export async function assertCurrentDispatch() {} export async function loadDispatch() { return {request:JSON.parse(readFileSync(file)).request}; }';
  if (url.endsWith('/proposal.mjs')) extra = 'export async function loadStageReport() { const s=JSON.parse(readFileSync(file)); return { request:s.triage, envelope:s.triageEnvelope }; } export async function loadRefinement(api,repo,reports,current) { if(current.sourceRevision!=="${accepted}") throw Error("Wrong refinement context source"); return {}; }';
  if (url.endsWith('/implementation.mjs')) extra = 'export async function loadImplementation() { return {policy:{scope:"Only the formatter",paths:["src/"],checks:[["node","--version"]],reviewRequired:false},proposal:{root:"openspec/changes/issue-18-proposal"}}; } export async function loadImplementationSeed() { return null; }';
  if (url.endsWith('/epic-native.mjs')) extra = 'export async function authenticateEpicChild() { return ' + ${JSON.stringify(JSON.stringify(epic))} + '; } export async function inspectEpicDependencies() { const s=JSON.parse(readFileSync(file)); if(s.scenario==="revoked") throw Error("Epic dependency owner approval was revoked"); return {baseSha:s.scenario==="base-moved"?"' + '9'.repeat(40) + '":"${accepted}",dependencies:[{slice:"A",issue:17,pullRequest:20,head:"' + '1'.repeat(40) + '",mergeCommit:"${accepted}",approvedBase:"${main}",checkedCandidate:"' + '2'.repeat(40) + '",review:5,checks:"passed",includedIn:"${accepted}",historyStatus:"identical"}]}; } export async function checkEpicCapacity() { if(JSON.parse(readFileSync(file)).request.stage!=="implement") throw Error("Refinement must not reserve implementation capacity"); }';
  if (!extra) return next(url, context);
  return { format:'module', shortCircuit:true, source:'import { readFileSync } from "node:fs"; const file='+JSON.stringify(file)+'; export * from '+original+'; '+extra };
}});
`);
  const run = (command = 'prepare') => spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, command], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_OWNER: owner, GITHUB_ACTOR: owner, GITHUB_TRIGGERING_ACTOR: owner, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_OUTPUT: join(dir, 'outputs'), GITHUB_STEP_SUMMARY: join(dir, 'summary'), GITHUB_SHA: workflow, GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '1', LIGHTHOUSE_ISSUE: String(child), LIGHTHOUSE_RUN_DIR: dir, LIGHTHOUSE_EPIC_ENABLED: 'true', RUNNER_TEMP: dir, GH_TOKEN: 'fixture' } });
  return { dir, run };
}

test('production child refinement selects accepted dependency source while retaining original triage and policy authority', async () => {
  const f = await fixture();
  try {
    const run = f.run(); assert.equal(run.status, 0, run.stdout + run.stderr);
    const request = JSON.parse(await readFile(join(f.dir, 'request.json')));
    assert.equal(request.sourceRevision, accepted);
    assert.equal(request.baseRevision, main);
    assert.equal(request.epic.baseSha, accepted);
    assert.equal(request.triageEstimate.points, 2);
    assert.equal(JSON.parse(await readFile(join(f.dir, 'context.json'))).request.sourceRevision, accepted);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('production refinement rejects a missing or moved base or revoked dependency before preparing model input', async () => {
  for (const scenario of ['missing-base', 'base-moved', 'revoked']) {
    const f = await fixture('refine', scenario);
    try {
      const run = f.run(); assert.notEqual(run.status, 0);
      assert.match(run.stderr, scenario === 'revoked' ? /approval was revoked/ : /Epic base changed before/);
      await assert.rejects(readFile(join(f.dir, 'context.json')), { code: 'ENOENT' });
    } finally { await rm(f.dir, { recursive: true, force: true }); }
  }
});

test('production initial child triage retains main even when the integration branch has advanced', async () => {
  const f = await fixture('triage');
  try {
    const run = f.run(); assert.equal(run.status, 0, run.stdout + run.stderr);
    const request = JSON.parse(await readFile(join(f.dir, 'request.json')));
    assert.equal(request.sourceRevision, main);
    assert.equal(request.baseRevision, undefined);
    assert.equal(request.epic.baseSha, undefined);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('production refinement and implementation inputs include the host-verified dependency receipt and inclusion evidence', async () => {
  for (const stage of ['refine', 'implement']) {
    const f = await fixture(stage);
    try {
      const run = f.run(); assert.equal(run.status, 0, run.stdout + run.stderr);
      const request = JSON.parse(await readFile(join(f.dir, 'request.json')));
      const context = JSON.parse(await readFile(join(f.dir, 'context.json')));
      assert.deepEqual(context.epicPrerequisites, request.epicPrerequisites);
      assert.equal(context.epicPrerequisites.status, 'verified');
      assert.equal(context.epicPrerequisites.verifiedBy, 'trusted-host');
      assert.equal(context.epicPrerequisites.baseSha, accepted);
      assert.deepEqual(context.epicPrerequisites.dependencies, [{ slice: 'A', issue: 17, pullRequest: 20, head: '1'.repeat(40), mergeCommit: accepted, approvedBase: main, checkedCandidate: '2'.repeat(40), review: 5, checks: 'passed', includedIn: accepted, historyStatus: 'identical' }]);
      assert.match(context.contract.rules, /trusted host verification of accepted dependency heads/);
      assert.match(context.contract.rules, /rechecks it before publication/);
    } finally { await rm(f.dir, { recursive: true, force: true }); }
  }
});

test('production refinement publisher rejects dependency changes after execution without publishing a stale result', async () => {
  for (const scenario of ['base-moved', 'revoked']) {
    const f = await fixture();
    try {
      const prepared = f.run(); assert.equal(prepared.status, 0, prepared.stderr);
      const request = JSON.parse(await readFile(join(f.dir, 'request.json')));
      await writeFile(join(f.dir, 'envelope.json'), JSON.stringify({ schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'refine', gate: 'ready', status: 'blocked', evidence: [], missingEvidence: ['Example operational blocker'], unavailableChecks: [], pendingReview: [], nextAction: 'Maintainer: resolve the recorded blocker.', output: {} }, effect: { type: 'issue-comment', body: 'A result cannot supersede changed dependency authority.' } }));
      const state = JSON.parse(await readFile(join(f.dir, 'state.json')));
      state.scenario = scenario; state.calls = [];
      await writeFile(join(f.dir, 'state.json'), JSON.stringify(state));
      const published = f.run('publish');
      assert.notEqual(published.status, 0);
      assert.match(published.stderr, scenario === 'revoked' ? /approval was revoked/ : /Epic base changed before publication/);
      assert.equal(JSON.parse(await readFile(join(f.dir, 'state.json'))).calls.some(call => call.method !== 'GET'), false);
    } finally { await rm(f.dir, { recursive: true, force: true }); }
  }
});
