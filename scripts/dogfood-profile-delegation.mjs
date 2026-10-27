import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { runDelegatedTasks } from '../src/packages/sdlc/src/profile-delegation.mjs';

const execFileAsync = promisify(execFile);

const image = process.env.LH_DELEGATION_IMAGE;
const volume = process.env.LH_DELEGATION_VOLUME;
const uid = process.env.LH_DELEGATION_UID;
if (process.argv[2] !== '--run' || !/^sha256:[a-f0-9]{64}$/.test(image ?? '') || !/^[\w-]+$/.test(volume ?? '') || !/^\d+$/.test(uid ?? '')) {
  console.error('Set LH_DELEGATION_IMAGE, LH_DELEGATION_VOLUME and LH_DELEGATION_UID; then pass --run. This makes authenticated model calls.');
  process.exit(2);
}

const root = await mkdtemp(join(tmpdir(), 'lighthouse-delegation-'));
await mkdir(join(root, 'src'));
const project = {
  schemaVersion: 1,
  profiles: {
    plan: { model: 'openai/gpt-6.1-sol', reasoningEffort: 'high' },
    build: { model: 'openai/gpt-6.1-sol', reasoningEffort: 'medium' },
    fast: { model: 'openai/gpt-6-luna', reasoningEffort: 'high' },
  },
};
const operator = {
  modelProfiles: { schemaVersion: 1, enabled: true },
  modelCapabilities: Object.fromEntries([
    ['openai/gpt-6.1-sol', ['medium', 'high']], ['openai/gpt-6-luna', ['high']],
  ].map(([model, reasoningEfforts]) => [model, { available: true, tools: true, reasoningEfforts }])),
};
const files = ['src/a.txt', 'src/b.txt', 'src/c.txt'];
const role = { inputSchema: 'task-string', outputSchema: 'one-line-text', tools: [], writeScope: ['src/', ...files] };
const parent = { runId: 'dogfood-148', role: 'editor', outputSchema: role.outputSchema, tools: [], writeScope: ['src/'], limits: { timeoutSeconds: 180, maxAttempts: 1 }, stopConditions: ['failed-check'] };
const task = (id, profile, file, dependencies = []) => ({ id, specialist: 'editor', profile, dependencies, affectedFiles: [file], input: { expected: `PASS-${id.toUpperCase()}` } });
const tasks = [task('a', 'fast', files[0]), task('b', 'build', files[1]), task('c', 'plan', files[2], ['a', 'b']), task('d', 'fast', files[0])];
const attempts = [];
let active = 0, peak = 0;

async function launch(child) {
  const expected = child.input.expected;
  const started = Date.now();
  active++; peak = Math.max(peak, active);
  let output;
  try {
    output = await execFileAsync('docker', [
      'run', '--rm', '--user', `${uid}:${uid}`,
      '--mount', `type=volume,src=${volume},dst=/home/engine/.local/share/opencode`,
      '--entrypoint', 'opencode', image, 'run', '--standalone', '--auto', '--model', child.model.engineModel,
      '--format', 'json', `Reply with exactly ${expected} and nothing else.`,
    ], { signal: child.signal, timeout: child.limits.timeoutSeconds * 1000, maxBuffer: 4 * 1024 * 1024 });
  } catch (error) {
    attempts.push({ id: expected, model: child.model.engineModel, elapsedMs: Date.now() - started, exitCode: error.code ?? 1 });
    return { status: 'failed', evidence: [] };
  } finally { active--; }
  const events = (output.stdout ?? '').split('\n').filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
  const answer = events.filter(event => event.type === 'text').map(event => event.part?.text ?? '').join('').trim();
  attempts.push({ id: expected, model: child.model.engineModel, elapsedMs: Date.now() - started, exitCode: 0, answer });
  if (answer !== expected || events.some(event => event.type === 'error')) return { status: 'failed', evidence: [] };
  const path = child.writeScope[0];
  if (!files.includes(path) || child.writeScope.length !== 1) throw Error('Child path outside the host fixture');
  await writeFile(join(root, path), `${answer}\n`, { flag: 'w' });
  return { status: 'passed', evidence: [`host-applied:${path}`] };
}

async function verifyWave({ tasks: wave, results }) {
  for (const entry of wave) {
    const result = results.find(item => item.id === entry.id);
    if (result?.status !== 'passed') return { status: 'failed', evidence: ['child-failed'] };
    const content = await readFile(join(root, entry.affectedFiles[0]), 'utf8');
    if (content !== `${entry.child.input.expected}\n`) return { status: 'failed', evidence: ['content-mismatch'] };
  }
  return { status: 'passed', evidence: wave.map(entry => `checked:${entry.affectedFiles[0]}`) };
}

const options = { parent, controlPlane: { roles: { editor: role } }, project, operator, maxParallel: 2 };
const result = await runDelegatedTasks({ ...options, tasks, launch, verifyWave });
const failed = await runDelegatedTasks({ ...options, tasks: [task('x', 'fast', files[0]), task('y', 'plan', files[1], ['x'])], launch: async () => ({ status: 'failed', evidence: [] }), verifyWave: async () => ({ status: 'failed', evidence: ['injected-failure'] }) });
console.log(JSON.stringify({ root, status: result.status, peak, waves: result.waves.map(wave => ({ tasks: wave.tasks, status: wave.status })), tasks: result.tasks.map(item => ({ id: item.id, status: item.status, model: item.modelExecution?.requested })), attempts, failurePath: failed.tasks.map(item => ({ id: item.id, status: item.status })) }));
if (result.status !== 'passed' || peak !== 2 || failed.tasks[1].status !== 'blocked') process.exitCode = 1;
