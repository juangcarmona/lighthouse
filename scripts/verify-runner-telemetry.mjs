// Explicit operator demonstration; never runs as part of ordinary package verification.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, chmod, readdir } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv[2] && resolve(process.argv[2]);
if (!output || !process.env.LIGHTHOUSE_ENGINE_CONFIG) throw Error('Usage: LIGHTHOUSE_ENGINE_CONFIG=/operator/engine.json node scripts/verify-runner-telemetry.mjs /private/evidence-directory');
await mkdir(output, { recursive: true, mode: 0o700 });
const run = (command, args, options = {}) => execFileSync(command, args, { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options });
const operator = JSON.parse(await readFile(process.env.LIGHTHOUSE_ENGINE_CONFIG, 'utf8'));
const revision = run('git', ['rev-parse', 'HEAD']).trim();
const engineVersion = run('docker', ['run', '--rm', '--network', 'none', '--entrypoint', 'opencode', operator.image, '--version']).trim();
const packed = JSON.parse(run('npm', ['pack', '--workspace', '@juangcarmona/lighthouse-sdlc', '--pack-destination', output, '--json']))[0];
const consumer = join(output, 'consumer'); await mkdir(consumer, { recursive: true });
run('npm', ['install', '--prefix', consumer, '--ignore-scripts', '--no-audit', '--no-fund', join(output, packed.filename)]);
const harness = join(consumer, 'node_modules/@juangcarmona/lighthouse-sdlc');
const { createTelemetry, telemetryContext, readTelemetry, exportTelemetry } = await import(join(harness, 'src/telemetry.mjs'));
const { usageSummary } = await import(join(harness, 'src/telemetry-opencode.mjs'));
const { runRunner } = await import(join(harness, 'src/telemetry-runner.mjs'));
const directory = join(output, 'telemetry'), data = join(output, 'received'); await mkdir(data, { recursive: true });
const receiver = 'lighthouse-telemetry-consumer-' + process.pid;
const baseEnv = { ...process.env, LIGHTHOUSE_TELEMETRY_DIR: directory, RUNNER_NAME: 'isolated-local-demo' };
const cases = [];
const receiverArgs = ['run', '-d', '--rm', '--init', '--name', receiver, '--user', `${process.getuid()}:${process.getgid()}`, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '128m', '--pids-limit', '64', '--publish', '127.0.0.1::4318', '--mount', `type=bind,src=${join(repository, 'src/examples/runner-telemetry/receiver.mjs')},dst=/receiver.mjs,readonly`, '--mount', `type=bind,src=${data},dst=/data`, '--entrypoint', 'node', operator.image, '/receiver.mjs'];
try {
  run('docker', receiverArgs);
  const port = run('docker', ['port', receiver, '4318']).trim().split(':').at(-1), url = `http://127.0.0.1:${port}`;
  for (let n = 0; n < 50; n++) { try { if ((await fetch(url)).ok) break; } catch {} await pause(100); }
  assert.equal(await runRunner([process.execPath, '-e', 'process.exit(0)'], baseEnv), 0);
  assert.ok(readTelemetry(directory).some(e => e.type === 'runner.started'));
  for (const cancel of [false, true]) {
    const root = join(output, cancel ? 'cancelled' : 'completed'), workspace = join(root, 'work'), runDir = join(root, 'lighthouse-1-1');
    await mkdir(workspace, { recursive: true }); await mkdir(runDir, { recursive: true }); await mkdir(join(root, 'engine.lock.resources'));
    await writeFile(join(workspace, 'README.md'), 'A tiny tracked source for the isolated telemetry demonstration.\n');
    run('git', ['init', '-q', workspace]); run('git', ['-C', workspace, 'add', 'README.md']);
    const runId = createHash('sha256').update(`${revision}:${root}:${Date.now()}`).digest('hex');
    const request = { repository: 'juangcarmona/lighthouse', issue: 521, runId, stage: 'refine', sourceRevision: revision, signalId: 'local-owner-demonstration' };
    const telemetry = createTelemetry({ directory, component: 'demonstration', context: telemetryContext(baseEnv, request), env: baseEnv });
    telemetry.emit('signal.received', { eventName: 'local-demonstration', actorClass: 'owner', authorization: 'explicit-chat-request' }); telemetry.close();
    const result = { schemaVersion: 1, result: { schemaVersion: 1, runId, stage: 'refine', gate: 'ready', status: 'passed', evidence: [{ id: 'smoke', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Inspect the collected metadata.' }, effect: { type: 'issue-comment', body: 'Isolated telemetry demonstration completed.' } };
    await writeFile(join(runDir, 'request.json'), JSON.stringify(request)); await writeFile(join(runDir, 'context.json'), '{}');
    await writeFile(join(root, 'prompt.txt'), 'This is a local telemetry demonstration, not a GitHub delivery. Read /workspace/README.md, then write exactly this JSON using the edit tool to /output/envelope.json. Stop after that. Do not read credentials or do other work.\n' + JSON.stringify(result));
    await writeFile(join(root, 'engine.json'), JSON.stringify({ image: operator.image, authVolume: operator.authVolume, uid: operator.uid, model: operator.model, lock: join(root, 'engine.lock') }), { mode: 0o600 });
    const env = { ...baseEnv, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'engine.json'), RUNNER_TEMP: root, GITHUB_WORKSPACE: workspace, GITHUB_REPOSITORY: request.repository, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GH_AW_PROMPT: join(root, 'prompt.txt'), GH_AW_SAFE_OUTPUTS: join(root, 'safeoutputs/output.jsonl') };
    const child = spawn(process.execPath, [join(harness, 'src/opencode-execute.mjs')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = ''; for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { log += chunk; });
    const stopped = new Promise(resolveExit => child.once('close', code => resolveExit(code)));
    if (cancel) {
      for (let n = 0; n < 200; n++) { if (readTelemetry(directory).some(e => e.correlation.runId === runId && e.type === 'resource.sample')) break; await pause(100); }
      child.kill('SIGTERM');
    }
    const code = await stopped; await writeFile(join(root, 'adapter.log'), log, { mode: 0o600 });
    const events = readTelemetry(directory).filter(e => e.correlation.runId === runId), runtime = JSON.parse(await readFile(join(runDir, 'runtime.json')));
    assert.equal(code === 0, !cancel, log.slice(-2000)); assert.equal(runtime.cleanup.status, 'clean');
    assert.ok(events.some(e => e.type === 'execution.ended'));
    if (!cancel) { assert.ok(events.some(e => e.type === 'session.step.ended')); assert.ok(events.some(e => e.type === 'resource.sample')); }
    else assert.ok(events.some(e => e.type === 'execution.ended' && e.attributes.status === 'cancelled'));
    cases.push({ name: cancel ? 'cancelled' : 'completed', runId, exitCode: code, cleanup: runtime.cleanup.status, eventCount: events.length, types: [...new Set(events.map(e => e.type))], usage: usageSummary(events), runtimePackage: runtime.package, runtimeDistribution: runtime.distribution });
  }
  await fetch(url + '/reject', { method: 'POST' }); const failed = await exportTelemetry(directory, { endpoint: url + '/v1/logs' }); assert.equal(failed.status, 'degraded');
  await fetch(url + '/accept', { method: 'POST' }); const exported = await exportTelemetry(directory, { endpoint: url + '/v1/logs' }); assert.equal(exported.status, 'exporting');
  assert.equal((await exportTelemetry(directory, { endpoint: url + '/v1/logs' })).exported, 0);
  const independent = await (await fetch(url)).json(); assert.equal(independent.count, readTelemetry(directory).length);
  // Force a full replay through a separate checkpoint; the independent receiver must deduplicate.
  await exportTelemetry(directory, { endpoint: url + '/v1/logs', checkpoint: join(output, 'replay-checkpoint.json') });
  assert.equal((await (await fetch(url)).json()).count, independent.count);
  const first = readTelemetry(directory)[0];
  const replay = run(process.execPath, [join(harness, 'src/sdlc.mjs'), 'telemetry', 'read', '--directory', directory, '--stream', first.stream, '--after', String(first.sequence)]).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  assert.ok(replay.every(e => e.sequence > first.sequence));
  const summary = { schemaVersion: 1, telemetrySchemaVersion: 1, origin: 'isolated-local-demonstration', actionsRun: false, sourceRevision: revision, package: { name: packed.name, version: packed.version, integrity: packed.integrity, shasum: packed.shasum, status: 'unpublished-candidate' }, engineImage: operator.image, engineVersion, receiverContainer: receiver, events: independent.count, exporterOutage: failed.status, exporterRecovery: exported.status, replayDeduplicated: true, cases };
  await writeFile(join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(summary, null, 2));
} finally { try { run('docker', ['rm', '-f', receiver]); } catch {} }
