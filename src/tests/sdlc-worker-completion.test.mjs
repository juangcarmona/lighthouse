import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateStageCompletion, validateStageResult } from '../packages/sdlc/src/contracts.mjs';
import { buildRoutePlan } from '../packages/sdlc/src/routes.mjs';
import stages from '../packages/sdlc/stages.json' with { type: 'json' };
import routes from '../packages/sdlc/routes.json' with { type: 'json' };

const result = {
  schemaVersion: 1, runId: 'pilot-1', stage: 'triage', status: 'passed', gate: 'triaged',
  evidence: [{ id: 'issue-read', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'await host approval',
};
const expected = { stage: 'triage', runId: 'pilot-1' };
const cli = (...args) => spawnSync(process.execPath, ['src/packages/sdlc/src/sdlc.mjs', ...args], { encoding: 'utf8' });

test('completion binds the result to the dispatched run, stage and declared gate', () => {
  for (const stage of stages.stages) assert.deepEqual(validateStageCompletion({ ...result, stage: stage.id, gate: stage.gate }, { ...expected, stage: stage.id }), []);
  for (const changed of [{ runId: 'another-run' }, { stage: 'refine' }, { gate: 'done' }]) {
    assert.ok(validateStageCompletion({ ...result, ...changed }, expected).length, JSON.stringify(changed));
  }
  assert.ok(validateStageCompletion(result).length);
  assert.ok(validateStageCompletion(null, expected).length);
});

test('unresolved reports remain structurally valid but cannot complete a worker', () => {
  for (const changed of [
    ...['ready', 'blocked', 'failed'].map((status) => ({ status })),
    ...['missingEvidence', 'unavailableChecks', 'pendingReview'].map((field) => ({ [field]: ['outstanding'] })),
    ...['failed', 'unavailable', 'unconfigured', 'pending-review'].map((status) => ({ evidence: [{ id: 'check', status }] })),
  ]) {
    const unresolved = { ...result, ...changed };
    assert.deepEqual(validateStageResult(unresolved), []);
    assert.ok(validateStageCompletion(unresolved, expected).length, JSON.stringify(changed));
  }
  assert.deepEqual(validateStageCompletion({ ...result, evidence: [{ id: 'backend', status: 'not-applicable' }] }, expected), []);
  assert.ok(validateStageCompletion({ ...result, evidence: [null] }, expected).length);
});

test('the CLI distinguishes report validation from completion and requires host identity', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-completion-'));
  try {
    const file = join(dir, 'result.json');
    await writeFile(file, JSON.stringify({ ...result, status: 'blocked' }));
    assert.equal(cli('stage-result', '--input', file).status, 0);
    const completionArgs = ['stage-result', '--input', file, '--require-complete', '--stage', 'triage', '--run-id', 'pilot-1'];
    const blocked = cli(...completionArgs);
    assert.equal(blocked.status, 1, blocked.stderr);
    assert.equal(JSON.parse(blocked.stdout).valid, false);
    assert.equal(cli('stage-result', '--input', file, '--require-complete').status, 2);
    assert.equal(cli('stage-result', '--input', file, '--stage', 'triage').status, 2);
    await writeFile(file, JSON.stringify(result));
    assert.equal(cli(...completionArgs).status, 0);
    assert.equal(cli(...completionArgs.slice(0, -1), 'another-run').status, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('all bundled routes stop ff before dispatch while individual stages remain available', () => {
  for (const route of routes.routes) {
    const options = { available: route.requires ?? [] };
    assert.equal(buildRoutePlan(route, options).canRun, true);
    assert.equal(buildRoutePlan(route, { ...options, composition: 'stage' }).canRun, true);
    const blocked = buildRoutePlan(route, { ...options, composition: 'ff', decisions: { triaged: 'approved' } });
    assert.equal(blocked.canRun, false);
    assert.ok(blocked.errors.some((error) => error.code === 'route.human-gates-unverified'));
    const dispatched = cli('route', '--route', route.id, '--available', options.available.join(','), '--composition', 'ff');
    assert.equal(dispatched.status, 1, dispatched.stderr);
    assert.equal(JSON.parse(dispatched.stdout).canRun, false);
  }
  assert.equal(buildRoutePlan(routes.routes[0], { composition: 'unknown' }).canRun, false);
});

test('the authored worker shell preserves JSON input, including empty defaults', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-input-'));
  try {
    const source = await readFile('src/packages/sdlc/workflows/shared/lighthouse-sdlc-stage.md', 'utf8');
    const line = source.split('\n').find((line) => line.includes('printf'));
    const file = join(dir, 'input.json');
    const script = line.replace('/tmp/gh-aw/agent/input.json', file);
    for (const input of ['', '{}', '{"issue":42,"text":"quote \\\" and $HOME"}', '{\n  "issue": 42\n}']) {
      const executed = spawnSync('bash', ['-euc', script], { env: { ...process.env, STAGE_INPUT: input }, encoding: 'utf8' });
      assert.equal(executed.status, 0, executed.stderr);
      const actual = await readFile(file, 'utf8');
      assert.equal(actual, `${input || '{}'}\n`);
      assert.doesNotThrow(() => JSON.parse(actual));
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
