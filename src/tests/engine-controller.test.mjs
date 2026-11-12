import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { closeSync } from 'node:fs';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireEngineSlot } from '../packages/sdlc/src/engine-slot.mjs';

test('a queued engine stops when its real controller dies and preserves the occupied slot', { skip: process.platform !== 'linux', timeout: 15000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-controller-death-')), lock = join(root, 'engine.lock');
  const occupied = await acquireEngineSlot(lock, 0), config = join(root, 'engine.json'), script = join(root, 'controller.mjs');
  let parent, child, waiter;
  const running = async pid => {
    if (!pid) return false;
    try { return (await readFile(`/proc/${pid}/stat`, 'utf8')).split(') ')[1].split(' ')[0] !== 'Z'; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  };
  const until = async predicate => {
    for (let i = 0; i < 100; i++) { const value = await predicate(); if (value) return value; await delay(25); }
    throw Error('Expected controller lifecycle transition did not occur');
  };
  try {
    await writeFile(config, JSON.stringify({ image: 'sha256:' + 'a'.repeat(64), authVolume: 'unused', uid: process.getuid(), model: 'fixture-no-model', lock, engineSlotWaitSeconds: 30 }));
    await writeFile(script, `
import processes from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { writeFileSync } from 'node:fs';
const spawn = processes.spawn;
processes.spawn = (...args) => { const child = spawn(...args); writeFileSync(${JSON.stringify(join(root, 'child.pid'))}, String(child.pid)); child.once('spawn', () => process.send({ pid: child.pid })); return child; };
syncBuiltinESMExports();
const { executeUnattendedStage, stageContext } = await import(${JSON.stringify(new URL('../packages/sdlc/src/unattended-runtime.mjs', import.meta.url).href)});
const request = { runId: 'f'.repeat(64), issue: 1, stage: 'triage', worker: 'triage', sourceRevision: 'a'.repeat(40) };
await executeUnattendedStage({ root: ${JSON.stringify(root)}, request, source: new Map(), context: stageContext(request, {}), prompt: 'Do not execute', deadline: Date.now() + 60000,
  env: { PATH: process.env.PATH, HOME: ${JSON.stringify(root)}, LIGHTHOUSE_ENGINE_CONFIG: ${JSON.stringify(config)}, GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' } });
`);
    parent = fork(script, { env: { PATH: process.env.PATH, HOME: root }, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    [{ pid: child }] = await once(parent, 'message', { signal: AbortSignal.timeout(5000) });
    waiter = await until(async () => {
      try {
        const ids = (await readFile(`/proc/${child}/task/${child}/children`, 'utf8')).trim().split(/\s+/).filter(Boolean);
        for (const id of ids) if ((await readFile(`/proc/${id}/comm`, 'utf8')).trim() === 'flock') return Number(id);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    });
    const exited = once(parent, 'exit'); parent.kill('SIGKILL'); await exited;
    await until(async () => !await running(child));
    await assert.rejects(acquireEngineSlot(lock, 0), /capacity unavailable/);
    const directory = join(root, 'f'.repeat(64), 'tmp/lighthouse-123-1');
    assert.equal(JSON.parse(await readFile(join(directory, 'runtime.json'), 'utf8')).execution, undefined);
    const events = (await readFile(join(directory, 'evidence/host/telemetry.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.ok(events.some(event => event.type === 'execution.ended' && event.attributes.status === 'controller-exited'));
  } finally {
    if (!child) { try { child = Number(await readFile(join(root, 'child.pid'), 'utf8')); } catch {} }
    for (const pid of [waiter, child, parent?.pid]) if (await running(pid)) { try { process.kill(pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
    if (child) { try { await until(async () => !await running(child)); } catch { process.kill(child, 'SIGKILL'); await delay(100); } }
    closeSync(occupied); await rm(root, { recursive: true, force: true });
  }
});
