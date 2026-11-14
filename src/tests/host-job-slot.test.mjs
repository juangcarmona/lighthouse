import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { parse } from 'yaml';

const hook = resolve('src/examples/opencode-engine/job-start.sh');
const linux = process.platform === 'linux';
async function until(check, milliseconds = 5000) {
  const end = Date.now() + milliseconds;
  while (!await check()) {
    if (Date.now() >= end) throw Error('Host slot did not reach the expected state');
    await delay(25);
  }
}

test('a busy host waits within its own budget, preserves the live owner, and releases on worker exit', { skip: !linux, timeout: 20000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-host-slot-'));
  const lock = join(directory, 'gateway.lock');
  const workers = [];
  const launch = limit => {
    const child = spawn(process.execPath, ['-e', `
      process.title='Runner.Worker';
      if(require('node:fs').readFileSync('/proc/self/comm','utf8').trim()!=='Runner.Worker')throw Error('Fixture worker identity was not established');
      const {spawnSync}=require('node:child_process');
      const result=spawnSync('bash',[process.argv[1]],{stdio:'inherit'});
      if(result.status!==0)process.exit(result.status??1);
      process.stdin.resume();process.stdin.once('data',()=>process.exit(0));
    `, hook], { env: { ...process.env, RUNNER_TEMP: directory, LIGHTHOUSE_HOST_GATEWAY_LOCK: lock, LIGHTHOUSE_HOST_SLOT_WAIT_SECONDS: String(limit) }, stdio: ['pipe', 'pipe', 'pipe'] });
    const worker = { child, closed: once(child, 'exit'), text: '' };
    child.stdout.on('data', chunk => { worker.text += chunk; });
    child.stderr.on('data', chunk => { worker.text += chunk; });
    workers.push(worker);
    return worker;
  };
  const free = () => spawnSync('flock', ['-n', lock, 'true']).status === 0;
  try {
    const first = launch(5);
    await until(() => first.text.includes('Host slot acquired'));
    assert.equal(free(), false);
    const waiting = launch(2);
    assert.equal((await waiting.closed)[0], 1);
    assert.match(waiting.text, /Host slot unavailable after 2 seconds/);
    assert.equal(free(), false, 'a timed-out waiter must not release the live owner');
    const cancelled = launch(5);
    await until(() => cancelled.text.includes('Waiting for the shared'));
    cancelled.child.kill('SIGTERM');
    await cancelled.closed;
    await until(async () => (await readdir(directory)).filter(name => name.startsWith('host-job-lock.')).length === 1);
    assert.equal(free(), false, 'cancelling a waiter must preserve the live owner');
    first.child.kill('SIGTERM');
    await first.closed;
    await until(free);
    const next = launch(5);
    await until(() => next.text.includes('Host slot acquired'));
    next.child.stdin.end('complete');
    assert.equal((await next.closed)[0], 0);
    await until(free);
  } finally {
    for (const worker of workers) if (worker.child.exitCode === null && worker.child.signalCode === null) worker.child.kill('SIGTERM');
    await Promise.all(workers.map(worker => worker.closed));
    await delay(1100);
    await rm(directory, { recursive: true, force: true });
  }
});

test('invalid waits fail before admission and native unattended delivery needs no gateway slot', { skip: !linux }, () => {
  for (const limit of ['0', '7201', 'unlimited']) {
    const result = spawnSync('bash', [hook], { env: { ...process.env, LIGHTHOUSE_HOST_SLOT_WAIT_SECONDS: limit }, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /between 1 and 7200/);
  }
  const native = spawnSync('bash', [hook], { env: { ...process.env, GITHUB_WORKFLOW_REF: 'example/product/.github/workflows/lighthouse-sdlc-unattended.yml@refs/heads/main', GITHUB_JOB: 'deliver' }, encoding: 'utf8' });
  assert.equal(native.status, 0);
  assert.match(native.stdout, /does not reserve/);
});

test('compiled workers reserve queue time separately from the existing execution limits', async () => {
  const shared = await readFile('src/packages/sdlc/workflows/shared/lighthouse-opencode.md', 'utf8');
  assert.equal(parse(shared.split('---')[1]).jobs.agent['timeout-minutes'], 180);
  for (const [name, execution] of [['implement', 55], ['product-change', 30]]) {
    const compiled = parse(await readFile(`.github/workflows/lighthouse-sdlc-${name}.lock.yml`, 'utf8'));
    const agent = compiled.jobs.agent;
    assert.equal(agent['timeout-minutes'], 180);
    assert.equal(agent.steps.find(step => step.name === 'OpenCode progress and result')['timeout-minutes'], execution);
    assert.ok(agent['timeout-minutes'] >= 120 + execution + 5);
  }
});
