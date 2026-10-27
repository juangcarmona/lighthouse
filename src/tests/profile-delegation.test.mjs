import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareDelegatedTasks, runDelegatedTasks } from '../packages/sdlc/src/profile-delegation.mjs';

const project = { schemaVersion: 1, profiles: { fast: { model: 'openai/test', reasoningEffort: 'high' }, build: { model: 'openai/test', reasoningEffort: 'medium' } } };
const operator = { modelProfiles: { schemaVersion: 1, enabled: true }, modelCapabilities: { 'openai/test': { available: true, tools: true, reasoningEfforts: ['high', 'medium'] } } };
const role = { inputSchema: 'input', outputSchema: 'output', tools: ['read', 'edit'], writeScope: ['src/', 'src/a.mjs', 'src/b.mjs', 'src/c.mjs', 'src/lib/'] };
const parent = { runId: 'parent', role: 'builder', outputSchema: 'output', tools: ['read', 'edit'], writeScope: ['src/'], limits: { timeoutSeconds: 10, maxAttempts: 1 }, stopConditions: ['failed-check'] };
const task = (id, file, dependencies = []) => ({ id, specialist: 'builder', profile: 'fast', dependencies, affectedFiles: [file], input: { task: id } });
const options = tasks => ({ tasks, parent, controlPlane: { roles: { builder: role } }, project, operator, maxParallel: 2 });
const passed = () => ({ status: 'passed', evidence: ['host-checked'] });

test('disjoint tasks run in bounded waves and dependants wait for wave verification', async () => {
  let active = 0, peak = 0, verified = false;
  const seen = [], ids = new Set();
  const result = await runDelegatedTasks({ ...options([task('a', 'src/a.mjs'), task('b', 'src/b.mjs'), task('c', 'src/c.mjs', ['a', 'b'])]),
    launch: async child => {
      if (child.input.task === 'c') assert.equal(verified, true);
      assert.equal(child.model.engineModel, 'openai/test#high'); assert.equal(child.parentRun, 'parent');
      assert.ok(!ids.has(child.runId)); ids.add(child.runId);
      active++; peak = Math.max(active, peak); seen.push(child.input.task);
      await new Promise(resolve => setTimeout(resolve, 10)); active--;
      child.input.task = 'mutated'; return passed();
    }, verifyWave: async () => { assert.equal(active, 0); verified = true; return passed(); },
  });
  assert.equal(peak, 2); assert.equal(result.status, 'passed');
  assert.deepEqual(result.waves.map(w => w.tasks), [['a', 'b'], ['c']]);
  assert.deepEqual(seen, ['a', 'b', 'c']);
});
test('same-file and directory conflicts serialize, and the configured limit holds', async () => {
  for (const files of [['src/a.mjs', 'src/a.mjs'], ['src/', 'src/lib/'], ['src/a.mjs', 'src/b.mjs']]) {
    const config = options(files.map((file, i) => task(`task-${i}`, file)));
    if (files[0] !== files[1] && !files.includes('src/')) config.maxParallel = 1;
    const result = await runDelegatedTasks({ ...config, launch: passed, verifyWave: passed });
    assert.equal(result.waves.length, 2); assert.equal(result.status, 'passed');
  }
});
test('execution and verification failures block dependants transitively while independent work continues', async () => {
  for (const failWave of [false, true]) {
    const launched = [];
    const result = await runDelegatedTasks({ ...options([task('a', 'src/a.mjs'), task('b', 'src/b.mjs', ['a']), task('c', 'src/c.mjs', ['b']), task('independent', 'src/a.mjs')]),
      launch: async child => { launched.push(child.input.task); if (!failWave && child.input.task === 'a') throw Error('provider unavailable'); return passed(); },
      verifyWave: async ({ tasks }) => failWave && tasks.some(t => t.id === 'a') ? { status: 'failed', evidence: ['check-failed'] } : passed(),
    });
    assert.equal(result.status, 'blocked'); assert.deepEqual(launched, ['a', 'independent']);
    assert.equal(result.tasks.find(t => t.id === 'b').status, 'blocked');
    assert.equal(result.tasks.find(t => t.id === 'c').status, 'blocked');
    assert.equal(result.waves[0].status, 'failed');
  }
});
test('invalid dependency graphs, scopes, profiles and permissions launch nothing', async () => {
  const variants = [
    [task('a', 'src/a.mjs', ['missing'])],
    [task('a', 'src/a.mjs', ['b']), task('b', 'src/b.mjs', ['a'])],
    [task('a', 'src/a.mjs'), task('a', 'src/b.mjs')],
    [task('a', '../outside')], [task('a', 'src/../outside')], [task('a', 'src/*.mjs')], [task('a', '.github/workflows/a.yml')],
    [{ ...task('a', 'src/a.mjs'), specialist: 'unknown' }],
    [{ ...task('a', 'src/a.mjs'), profile: 'unknown' }],
    [{ ...task('a', 'src/a.mjs'), tools: ['publish'] }],
    [{ ...task('a', 'src/a.mjs'), limits: { timeoutSeconds: 11, maxAttempts: 1 } }],
    [{ ...task('a', 'src/a.mjs'), limits: { timeoutSeconds: 1, maxAttempts: 2 } }],
    [{ ...task('a', 'src/a.mjs'), maxParallel: 999 }],
    [{ ...task('a', 'src/a.mjs'), input: { unbounded: 'x'.repeat(65537) } }],
    [{ ...task('a', 'src/a.mjs'), affectedFiles: ['src/a.mjs', 'src/a.mjs'] }],
  ];
  for (const tasks of variants) await assert.rejects(runDelegatedTasks({ ...options(tasks), launch: () => assert.fail('must not launch'), verifyWave: passed }));
  for (const maxParallel of [0, 9, 1.5]) assert.throws(() => prepareDelegatedTasks({ ...options([task('a', 'src/a.mjs')]), maxParallel }));
  assert.throws(() => prepareDelegatedTasks({ ...options([task('a', 'src/a.mjs')]), operator: { ...operator, modelCapabilities: {} } }), /unavailable/);
});
test('cancellation and deadlines stop scheduling and signal the host', async () => {
  const controller = new AbortController(); controller.abort();
  const stopped = await runDelegatedTasks({ ...options([task('a', 'src/a.mjs')]), signal: controller.signal, launch: () => assert.fail(), verifyWave: passed });
  assert.equal(stopped.status, 'blocked'); assert.equal(stopped.waves.length, 0);
  let aborted = false;
  const result = await runDelegatedTasks({ ...options([task('a', 'src/a.mjs'), task('b', 'src/b.mjs', ['a'])]), parent: { ...parent, limits: { timeoutSeconds: 1, maxAttempts: 1 } },
    launch: ({ signal }) => new Promise(resolve => signal.addEventListener('abort', () => { aborted = true; resolve({ status: 'failed' }); })), verifyWave: passed,
  });
  assert.equal(aborted, true); assert.equal(result.status, 'blocked');
  assert.equal(result.tasks[1].status, 'blocked');
});
