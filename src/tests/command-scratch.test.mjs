import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { commandScratch, scratchCapacity, scratchDiagnostic } from '../packages/sdlc/src/command-scratch.mjs';
import { scratchArgs } from '../packages/sdlc/src/implementation-runtime.mjs';
import { managedCommand } from '../packages/sdlc/src/managed-command.mjs';
import { executionReceipt } from '../packages/sdlc/src/execution-resources.mjs';

const script = fileURLToPath(new URL('../packages/sdlc/src/managed-command.mjs', import.meta.url));
const environment = { ...process.env, LIGHTHOUSE_COMMAND_NPM_CACHE: '1' };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(read) {
  for (let i = 0; i < 150; i++) { try { if (await read()) return; } catch {} await wait(20); }
  throw Error('Command did not reach the expected state');
}
const absent = async path => { await assert.rejects(access(path), { code: 'ENOENT' }); };
const run = (directory, id, code, env = environment) => spawnSync(process.execPath, [script, 'run', directory, id, '--', process.execPath, '-e', code], { env, encoding: 'utf8', timeout: 10000 });
const receipt = async (directory, id) => JSON.parse(await readFile(join(directory, id + '.json'), 'utf8'));

test('scratch policy is explicit, command-owned and activated in both runtime phases', () => {
  assert.equal(commandScratch({}), null);
  assert.ok(scratchArgs.includes('LIGHTHOUSE_COMMAND_NPM_CACHE=1'));
  const removed = [];
  const io = { mkdtempSync(prefix) { assert.equal(prefix, '/tmp/lighthouse-npm-'); return prefix + 'owned'; }, statfsSync() { return { blocks: 10, bavail: 6, bsize: 1024 }; }, rmSync(path) { removed.push(path); } };
  const scratch = commandScratch({ LIGHTHOUSE_COMMAND_NPM_CACHE: '1', NPM_CONFIG_CACHE: '/caller/cache', npm_config_cache: '/other/cache' }, io);
  assert.equal(scratch.environment.NPM_CONFIG_CACHE, '/tmp/lighthouse-npm-owned');
  assert.equal(scratch.environment.npm_config_cache, scratch.environment.NPM_CONFIG_CACHE);
  assert.deepEqual(scratch.receipt.beforeCommand, { capacityBytes: 10240, availableBytes: 6144 });
  assert.equal(scratch.release(), true);
  assert.equal(scratch.release(), true);
  assert.deepEqual(removed, ['/tmp/lighthouse-npm-owned']);
  assert.equal(scratch.receipt.npmCache, 'released');
});

test('allocation and cleanup failures remain failures and unavailable capacity is not invented', () => {
  const io = { mkdtempSync() { return '/tmp/lighthouse-npm-owned'; }, statfsSync() { throw Error('unavailable'); }, rmSync() { throw Error('cannot remove'); } };
  assert.equal(scratchCapacity(io), null);
  const scratch = commandScratch(environment, io);
  assert.equal(scratch.release(), false);
  assert.equal(scratch.release(), false);
  assert.equal(scratch.receipt.npmCache, 'cleanup-failed');
  assert.match(scratchDiagnostic(scratch.receipt), /capacity unavailable.*cleanup-failed/);
  assert.throws(() => commandScratch(environment, { ...io, mkdtempSync() { throw Object.assign(Error('full'), { code: 'ENOSPC' }); } }), { code: 'ENOSPC' });
});

test('managed receipts cannot pass allocation or cleanup failure, and host summaries retain safe scratch data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-scratch-receipt-'));
  try {
    const allocate = await managedCommand(directory, 'allocate', [process.execPath, '-e', 'process.exit(0)'], { createScratch() { throw Error('ENOSPC fixture'); } });
    assert.equal(allocate, 125);
    assert.equal((await receipt(directory, 'allocate')).scratch.npmCache, 'allocation-failed');
    for (const original of [0, 7]) {
      const id = `cleanup-${original}`;
      const result = await managedCommand(directory, id, [process.execPath, '-e', `process.exit(${original})`], { createScratch() { return commandScratch(environment, { mkdtempSync: () => '/tmp/lighthouse-npm-fixture', rmSync() { throw Error('cleanup fixture'); }, statfsSync: () => ({ blocks: 16, bavail: 2, bsize: 1024 }) }); } });
      assert.equal(result, original || 125);
      const host = await executionReceipt(join(directory, id + '.json'), { code: result });
      assert.equal(host.status, 'failed');
      assert.equal(host.scratch.npmCache, 'cleanup-failed');
      assert.deepEqual(host.scratch.afterCleanup, { capacityBytes: 16384, availableBytes: 2048 });
    }
    await writeFile(join(directory, 'untrusted.json'), JSON.stringify({ scratch: { npmCache: 'released', afterCleanup: { capacityBytes: -1, availableBytes: 'secret', extra: 'discard' }, extra: 'discard' } }));
    const sanitized = await executionReceipt(join(directory, 'untrusted.json'), { code: 7 });
    assert.deepEqual(sanitized.scratch, { npmCache: 'released', beforeCommand: null, beforeCleanup: null, afterCleanup: null });
    assert.equal(sanitized.status, 'failed');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('sequential demand fits a scaled budget only after disposable downloads are released', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-scratch-demand-'));
  try {
    const cacheRecord = join(directory, 'cache.json'), packages = join(directory, 'nuget-packages');
    const npmBytes = 6 * 1024, dotnetBytes = 9 * 1024, budget = 12 * 1024;
    assert.ok(npmBytes + dotnetBytes > budget, 'persistent downloads reproduce accumulated demand');
    const install = run(directory, 'install', `const fs=require('node:fs'); const cache=process.env.npm_config_cache; if(cache!==process.env.NPM_CONFIG_CACHE) process.exit(9); fs.writeFileSync(cache+'/tarball',Buffer.alloc(${npmBytes})); fs.writeFileSync(${JSON.stringify(cacheRecord)},JSON.stringify(cache));`);
    assert.equal(install.status, 0, install.stderr);
    const cache = JSON.parse(await readFile(cacheRecord));
    await absent(cache);
    assert.equal((await receipt(directory, 'install')).scratch.npmCache, 'released');
    const verification = run(directory, 'verify', `const fs=require('node:fs'); if(fs.existsSync(${JSON.stringify(cache)})) process.exit(10); fs.mkdirSync(${JSON.stringify(packages)}); fs.writeFileSync(${JSON.stringify(join(packages, 'package'))},Buffer.alloc(${dotnetBytes}));`);
    assert.equal(verification.status, 0, verification.stderr);
    assert.equal((await readFile(join(packages, 'package'))).length, dotnetBytes);
    assert.ok(dotnetBytes <= budget);
    const capacity = (await receipt(directory, 'verify')).scratch.afterCleanup;
    assert.ok(capacity === null || capacity.capacityBytes >= capacity.availableBytes);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('failed and unstartable commands release only their own downloads and preserve status', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-scratch-failure-'));
  try {
    const sentinel = join(directory, 'caller-cache'), record = join(directory, 'cache.json');
    await writeFile(sentinel, 'preserve');
    const failed = run(directory, 'failure', `require('node:fs').writeFileSync(${JSON.stringify(record)},JSON.stringify(process.env.NPM_CONFIG_CACHE)); console.error('ENOSPC fixture'); process.exit(7);`, { ...environment, NPM_CONFIG_CACHE: sentinel, npm_config_cache: sentinel });
    assert.equal(failed.status, 7);
    assert.match(failed.stderr, /ENOSPC fixture/);
    assert.match(failed.stderr, /Private scratch:.*npm cache released/);
    assert.match(failed.stderr, /NU1301 alone does not establish/);
    assert.equal((await receipt(directory, 'failure')).exitCode, 7);
    await absent(JSON.parse(await readFile(record)));
    assert.equal(await readFile(sentinel, 'utf8'), 'preserve');
    const missing = spawnSync(process.execPath, [script, 'run', directory, 'missing', '--', '/nonexistent-lighthouse-command'], { env: environment, encoding: 'utf8' });
    assert.equal(missing.status, 127);
    assert.equal((await receipt(directory, 'missing')).scratch.npmCache, 'released');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('overlap cannot clean an active cache; cancellation releases it before slot reuse', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-scratch-cancel-')), record = join(directory, 'cache.json');
  const child = spawn(process.execPath, [script, 'run', directory, 'active', '--', process.execPath, '-e', `const fs=require('node:fs'); process.on('SIGTERM',()=>{fs.writeFileSync(${JSON.stringify(join(directory, 'cache-alive-at-stop'))},String(fs.existsSync(process.env.NPM_CONFIG_CACHE)));process.exit(0);}); fs.writeFileSync(${JSON.stringify(record)},JSON.stringify(process.env.NPM_CONFIG_CACHE)); setInterval(()=>{},1000);`], { env: environment, stdio: 'ignore' });
  const completed = new Promise(resolve => child.once('exit', resolve));
  try {
    await until(async () => { await access(record); return true; });
    const cache = JSON.parse(await readFile(record));
    const overlap = run(directory, 'overlap', 'process.exit(0)');
    assert.notEqual(overlap.status, 0);
    await access(cache);
    assert.equal(spawnSync(process.execPath, [script, 'stop', directory]).status, 0);
    await completed;
    await absent(cache);
    assert.equal(await readFile(join(directory, 'cache-alive-at-stop'), 'utf8'), 'true');
    assert.equal((await receipt(directory, 'active')).state, 'cancelled');
    assert.notEqual((await receipt(directory, 'active')).exitCode, 0, 'a graceful child exit cannot turn cancellation into success');
    assert.equal((await receipt(directory, 'active')).scratch.npmCache, 'released');
    assert.equal(run(directory, 'next', 'process.exit(0)').status, 0);
  } finally { child.kill('SIGTERM'); await completed; await rm(directory, { recursive: true, force: true }); }
});

test('nested invocations preserve the parent cache and caller-owned .NET state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-scratch-nested-'));
  try {
    const parentRecord = join(directory, 'parent-cache.json'), nestedRecord = join(directory, 'nested-cache.json');
    const dotnet = join(directory, 'dotnet-state');
    await writeFile(dotnet, 'retain');
    const nested = `require('node:fs').writeFileSync(${JSON.stringify(nestedRecord)},JSON.stringify(process.env.NPM_CONFIG_CACHE));`;
    const code = `const fs=require('node:fs'),cp=require('node:child_process'); const parent=process.env.NPM_CONFIG_CACHE; fs.writeFileSync(${JSON.stringify(parentRecord)},JSON.stringify(parent)); const result=cp.spawnSync(process.execPath,${JSON.stringify([script, 'run', join(directory, 'nested'), 'child', '--', process.execPath, '-e', nested])},{stdio:'inherit'}); if(result.status!==0)process.exit(result.status||1); const child=JSON.parse(fs.readFileSync(${JSON.stringify(nestedRecord)})); if(parent===child||!fs.existsSync(parent)||fs.existsSync(child)) process.exit(9);`;
    const result = run(directory, 'parent', code);
    assert.equal(result.status, 0, result.stderr);
    await absent(JSON.parse(await readFile(parentRecord)));
    await absent(JSON.parse(await readFile(nestedRecord)));
    assert.equal(await readFile(dotnet, 'utf8'), 'retain');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
