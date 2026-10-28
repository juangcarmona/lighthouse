import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { executionLimits, resourceArgs, executionReceipt, executionFailure } from '../packages/sdlc/src/execution-resources.mjs';

const script = fileURLToPath(new URL('../packages/sdlc/src/managed-command.mjs', import.meta.url));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(read) {
  for (let i = 0; i < 100; i++) { try { const value = await read(); if (value) return value; } catch {} await wait(20); }
  throw Error('Command did not reach the expected state');
}

test('workspace commands exclude overlap, retain exit status and stop their children', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-command-'));
  const child = spawn(process.execPath, [script, 'run', directory, 'first', '--', process.execPath, '-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
  const completed = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  try {
    await until(async () => JSON.parse(await readFile(join(directory, 'first.json'))).state === 'running');
    const overlap = spawnSync(process.execPath, [script, 'run', directory, 'second', '--', process.execPath, '-e', 'process.exit(0)'], { encoding: 'utf8' });
    assert.notEqual(overlap.status, 0);
    assert.match(overlap.stderr, /Another command owns/);
    assert.equal(spawnSync(process.execPath, [script, 'stop', directory]).status, 0);
    assert.notEqual((await completed).code, 0);
    const receipt = JSON.parse(await readFile(join(directory, 'first.json')));
    assert.equal(receipt.state, 'cancelled');
    assert.equal(receipt.signal, 'SIGTERM');
    const next = spawnSync(process.execPath, [script, 'run', directory, 'second', '--', process.execPath, '-e', 'process.exit(7)'], { encoding: 'utf8' });
    assert.equal(next.status, 7, next.stderr);
    assert.equal(JSON.parse(await readFile(join(directory, 'second.json'))).exitCode, 7);
    const duplicate = spawnSync(process.execPath, [script, 'run', directory, 'second', '--', process.execPath, '-e', 'process.exit(0)'], { encoding: 'utf8' });
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /already has a receipt/);
    assert.equal(JSON.parse(await readFile(join(directory, 'second.json'))).exitCode, 7);
  } finally { child.kill('SIGTERM'); await completed; await rm(directory, { recursive: true, force: true }); }
});

test('operator limits remain bounded and shared by both container phases', () => {
  assert.deepEqual(resourceArgs(executionLimits({})), ['--cpus', '2', '--memory', '4g', '--pids-limit', '1024']);
  assert.equal(executionLimits({}, false).pids, 128);
  assert.equal(executionLimits({ resources: { implementationPids: 512, planningPids: 256 } }).pids, 512);
  for (const resources of [null, [], { other: 512 }, { implementationPids: 0 }, { implementationPids: 4097 }, { implementationPids: '512' }, { planningPids: 128.5 }]) {
    assert.throws(() => executionLimits({ resources }), /Invalid operator resources/);
  }
});

test('failure receipts distinguish rejected tasks, OOM, abort, timeout and cancellation without inventing missing evidence', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-receipt-')), path = join(directory, 'receipt.json');
  try {
    for (const [observed, code, reason, status] of [
      [{ resources: { pidsDenied: 3, pidsLimit: 128, pidsPeak: 128 } }, 134, null, 'process-limit'],
      [{ resources: { oomKills: 1 } }, 137, null, 'out-of-memory'],
      [{ signal: 'SIGABRT' }, 134, null, 'aborted'],
      [{}, 137, 'timeout', 'timeout'],
      [{}, 137, 'cancelled', 'cancelled'],
      [{ state: 'cancelled' }, 0, null, 'cancelled'],
      [{}, 7, null, 'failed'],
      [{}, 0, null, 'passed'],
    ]) {
      await writeFile(path, JSON.stringify(observed));
      const receipt = await executionReceipt(path, { code, signal: null }, reason);
      assert.equal(receipt.status, status);
      assert.ok(!executionFailure(receipt).includes('failed or cancelled'));
    }
    await rm(path);
    const absent = await executionReceipt(path, { code: 134, signal: null });
    assert.equal(absent.status, 'aborted');
    assert.equal(absent.resources.pidsDenied, null);
    await writeFile(path, 'null');
    assert.equal((await executionReceipt(path, { code: 7, signal: null })).status, 'failed');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('completed commands terminate their background descendants before releasing the slot', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-descendants-'));
  try {
    const pidFile = join(directory, 'child.pid');
    const code = `const fs=require('node:fs'); const child=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); fs.writeFileSync(${JSON.stringify(pidFile)},String(child.pid)); child.unref();`;
    const run = spawnSync(process.execPath, [script, 'run', directory, 'background', '--', process.execPath, '-e', code], { encoding: 'utf8', timeout: 5000 });
    assert.equal(run.status, 0, run.stderr);
    const pid = Number(await readFile(pidFile, 'utf8'));
    await until(async () => {
      try { return (await readFile(`/proc/${pid}/stat`, 'utf8')).split(') ')[1].startsWith('Z '); }
      catch (error) { if (error.code === 'ENOENT') return true; throw error; }
    });
    assert.equal(JSON.parse(await readFile(join(directory, 'background.json'))).state, 'completed');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
