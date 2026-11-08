import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { matchesGlob } from 'node:path';
import { admissionCompletion } from '../packages/sdlc/src/admission-recovery.mjs';
import { prepareRecovery, verifyRecoveryOrigin } from '../packages/sdlc/src/worker-recovery.mjs';
import { loadDispatch, admitDispatch } from '../packages/sdlc/src/stage-dispatch.mjs';
import { fixture } from './helpers/continuation-admission-fixture.mjs';

async function completion() {
  const f = await fixture();
  f.run.display_title = 'review #7 · request 30';
  f.maintenance.event = 'workflow_run';
  f.maintenance.actor = f.maintenance.triggering_actor = { login: 'github-actions[bot]', type: 'Bot' };
  const event = { action: 'completed', workflow_run: structuredClone(f.run) };
  return { ...f, event };
}

test('terminal authenticated preparation rejection wakes only its original issue, without a scheduler', async () => {
  const f = await completion();
  const wake = await admissionCompletion(f.api, 'owner/repo', 'owner', f.event, f.readArtifact);
  assert.deepEqual(wake, { issue: 7, runId: '200', attempt: 1, revision: 'b'.repeat(40), commentId: 30 });
  assert.equal(f.calls.every(call => call.method === 'GET'), true);
  const result = await prepareRecovery(f.api, 'owner/repo', 'owner', 7, f.maintenance, true, Date.now(), f.readArtifact, { admissionWake: wake });
  assert.equal(result.request.recovery.attempt, 1);
  assert.deepEqual(result.request.recovery.wake, wake);
  assert.equal(result.request.routerEventName, 'workflow_run');
  assert.deepEqual(result.request.completionAuthorization, f.request.completionAuthorization);
  f.artifacts.set(300, result.request);
  const worker = { ...f.run, id: 400, status: 'in_progress', conclusion: null };
  f.runs.set(400, worker);
  const loaded = await loadDispatch(f.api, 'owner/repo', 'owner', 7, result.commentId, worker, f.readArtifact);
  assert.equal(loaded.request.id, result.request.id);
  const env = { LIGHTHOUSE_ISSUE: '7', LIGHTHOUSE_STAGE: 'review', GITHUB_RUN_ID: '400', GITHUB_RUN_ATTEMPT: '1', LIGHTHOUSE_RECOVERY_ENABLED: 'true' };
  assert.equal((await admitDispatch(f.api, 'owner/repo', 'owner', env, { inputs: { 'dispatch-request': String(result.commentId) } }, f.readArtifact)).admitted, true);
  for (const parent of [f.maintenance, { ...f.maintenance, id: 500, event: 'schedule', actor: { login: 'owner' }, triggering_actor: { login: 'owner' } }]) {
    assert.equal((await prepareRecovery(f.api, 'owner/repo', 'owner', 7, parent, true, Date.now(), f.readArtifact, { admissionWake: wake })).request, undefined);
  }
  assert.equal(f.comments.length, 2);
  assert.equal(f.calls.some(call => call.path.endsWith('/merge') || call.path.endsWith('/dispatches')), false);
  f.issue.labels.push({ name: 'agent-working' });
  await verifyRecoveryOrigin(f.api, 'owner/repo', 'owner', loaded, f.maintenance, f.readArtifact, 0);
  await assert.rejects(verifyRecoveryOrigin(f.api, 'owner/repo', 'owner', loaded, f.maintenance, f.readArtifact, 0, true), /authority changed/);
  const forged = structuredClone(loaded); forged.request.recovery.wake.runId = '201';
  await assert.rejects(verifyRecoveryOrigin(f.api, 'owner/repo', 'owner', forged, f.maintenance, f.readArtifact, 0), /wake/);
});

test('foreign, mismatched, out-of-order and uncertain completions cannot wake recovery', async () => {
  for (const scenario of ['foreign', 'path', 'actor', 'event', 'sha', 'attempt', 'active', 'success', 'agent', 'publisher', 'missing', 'title', 'request']) {
    const f = await completion();
    if (scenario === 'foreign') f.event.workflow_run.repository.full_name = 'other/repo';
    if (scenario === 'path') f.run.path = '.github/workflows/other.yml';
    if (scenario === 'actor') f.run.actor = { login: 'other' };
    if (scenario === 'event') f.run.event = 'pull_request';
    if (scenario === 'sha') f.event.workflow_run.head_sha = 'f'.repeat(40);
    if (scenario === 'attempt') f.run.run_attempt = 2;
    if (scenario === 'active') f.run.status = 'in_progress';
    if (scenario === 'success') f.run.conclusion = 'success';
    if (scenario === 'agent') f.jobs.find(job => job.name === 'agent').conclusion = 'success';
    if (scenario === 'publisher') f.jobs.at(-1).conclusion = 'success';
    if (scenario === 'missing') f.jobs.pop();
    if (scenario === 'title') f.run.display_title = 'arbitrary review';
    if (scenario === 'request') f.run.display_title = 'review #7 · request 31';
    assert.equal(await admissionCompletion(f.api, 'owner/repo', 'owner', f.event, f.readArtifact), null, scenario);
    assert.equal(f.calls.every(call => call.method === 'GET'), true, scenario);
  }
});

test('a completion signal cannot recover another root or enter generic effect recovery', async () => {
  for (const scenario of ['no-wake', 'other-worker', 'other-issue', 'hold', 'policy']) {
    const f = await completion();
    let wake = await admissionCompletion(f.api, 'owner/repo', 'owner', f.event, f.readArtifact);
    if (scenario === 'no-wake') wake = undefined;
    if (scenario === 'other-worker') wake.runId = '201';
    if (scenario === 'other-issue') wake.issue = 8;
    if (scenario === 'hold') f.issue.labels.push({ name: 'future' });
    if (scenario === 'policy') f.changed[0].filename = '.github/workflows/review.yml';
    const result = await prepareRecovery(f.api, 'owner/repo', 'owner', 7, f.maintenance, true, Date.now(), f.readArtifact, { admissionWake: wake });
    assert.equal(result.request, undefined, scenario);
    assert.equal(f.comments.length, 1, scenario);
  }
});

test('distributed maintenance subscribes to native review completion and preserves its scheduled sweep', async () => {
  const source = await readFile(new URL('../packages/sdlc/workflows/lighthouse-worker-maintenance.yml', import.meta.url), 'utf8');
  assert.match(source, /workflow_run:\n\s+workflows: \[review\]\n\s+types: \[completed\]/);
  assert.match(source, /cron: '17,47 \* \* \* \*'/);
  assert.match(source, /github\.event_name == 'workflow_run'/);
  const wake = source.match(/name: (lighthouse-[a-z-]+)-\$\{\{ github\.run_attempt \}\}/)[1] + '-1';
  const reports = source.slice(source.indexOf('  report:'), source.indexOf('  report-stalled:'));
  const pattern = reports.match(/pattern: (.+)/)[1];
  assert.equal(matchesGlob('lighthouse-maintenance-7', pattern), true);
  assert.equal(matchesGlob(wake, pattern), false, 'Wake evidence must not enter the observation-only reporter');
});


test('the real maintenance scan reads completion events, respects scope and retains the native wake identity', async () => {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const root = await mkdtemp(join(tmpdir(), 'maintenance-completion-'));
  try {
    for (const scope of ['[7]', '[]']) {
      const f = await completion();
      await writeFile(join(root, 'event.json'), JSON.stringify(f.event));
      await writeFile(join(root, 'preload.mjs'), `import { registerHooks } from 'node:module';
        registerHooks({ load(url, context, next) {
          if (url.endsWith('/actions-artifact.mjs')) return { format:'module', shortCircuit:true, source:'export async function readActionsJson(...args){return globalThis.acceptanceFixture.readArtifact(...args)}; export function createActionsJsonReader(){throw Error("Unexpected artifact reader")}' };
          return next(url, context);
        }});
        const { fixture } = await import('${new URL('./helpers/continuation-admission-fixture.mjs', import.meta.url).href}');
        const f = globalThis.acceptanceFixture = await fixture();
        f.run.display_title = 'review #7 · request 30';
        f.maintenance.event = 'workflow_run';
        f.maintenance.actor = f.maintenance.triggering_actor = {login:'github-actions[bot]',type:'Bot'};
        globalThis.fetch = async (url, options) => {
          if (options.method !== 'GET') throw Error('Scan attempted a write');
          const path = url.replace('https://api.github.com/repos/owner/repo/', '');
          return {ok:true,status:200,json:async()=>f.api(path)};
        };`);
      const output = join(root, 'output-' + scope.length);
      const result = spawnSync(process.execPath, ['--import', join(root, 'preload.mjs'), new URL('../packages/sdlc/src/worker-maintenance.mjs', import.meta.url).pathname, 'scan'], { encoding: 'utf8', timeout: 20000, env: { ...process.env, GITHUB_REPOSITORY:'owner/repo', GITHUB_REPOSITORY_OWNER:'owner', GITHUB_RUN_ID:'300', GITHUB_RUN_ATTEMPT:'1', GITHUB_EVENT_PATH:join(root,'event.json'), GITHUB_OUTPUT:output, RUNNER_TEMP:root, LIGHTHOUSE_MAINTENANCE_ENABLED:'true', LIGHTHOUSE_MAINTENANCE_ISSUES:scope } });
      assert.equal(result.status, 0, result.stderr);
      assert.equal((await readFile(output, 'utf8')).trim(), 'issues=' + scope);
      const retained = JSON.parse(await readFile(join(root, 'maintenance-wake.json'), 'utf8'));
      assert.equal(retained.parent.event, 'workflow_run');
      assert.equal(retained.signal.id, 200);
      assert.equal(retained.wake.commentId, 30);
    }
  } finally { await rm(root, {recursive:true,force:true}); }
});
