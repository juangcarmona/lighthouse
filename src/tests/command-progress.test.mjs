import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, appendFile, readFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { commandProgress } from '../packages/sdlc/src/command-progress.mjs';
import { redactLog } from '../packages/sdlc/src/opencode-execute.mjs';
import { executionBudget } from '../packages/sdlc/src/execution-resources.mjs';

test('implementation receives one hour, planning ten minutes and outer deadlines only narrow them', () => {
  assert.equal(executionBudget(true).timeoutMs, 3600000);
  assert.equal(executionBudget(false).timeoutMs, 600000);
  assert.deepEqual(executionBudget(true, { now: 1000, deadline: 61000 }), { configuredMs: 3600000, timeoutMs: 60000, startedAt: 1000, deadline: 61000 });
  assert.equal(executionBudget(false, { now: 0, deadline: 7200000 }).timeoutMs, 600000);
  for (const deadline of [NaN, Infinity, '60000', 0, -1]) assert.throws(() => executionBudget(true, { now: 0, deadline }));
});

test('managed command logs are visible before completion even when its caller redirects stdout', { skip: process.platform !== 'linux' }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-live-command-'));
  const dir = join(root, 'evidence/commands'); await mkdir(dir, { recursive: true });
  const script = new URL('../packages/sdlc/src/managed-command.mjs', import.meta.url);
  const child = spawn(process.execPath, [script.pathname, 'run', dir, 'verify-final', '--', process.execPath, '-e', 'console.log("test phase started"); setTimeout(()=>{console.error("last output");process.exitCode=7},1000)'], { env: { ...process.env, LIGHTHOUSE_COMMAND_PROGRESS_ROOT: dir }, stdio: ['ignore', 'pipe', 'pipe'] });
  const output = []; child.stdout.on('data', bytes => output.push(bytes.toString())); child.stderr.resume();
  const exited = once(child, 'close');
  const lines = [], progress = commandProgress(root, line => lines.push(redactLog(line)));
  try {
    for (let i = 0; i < 100 && !lines.some(line => line.includes('test phase started')); i++) { progress.poll(); await new Promise(resolve => setTimeout(resolve, 10)); }
    assert.ok(lines.some(line => line.includes('test phase started')), lines.join('\n'));
    assert.equal(JSON.parse(await readFile(join(dir, 'verify-final.json'))).state, 'running');
    assert.deepEqual((await exited)[0], 7);
    progress.poll();
    assert.match(lines.join('\n'), /verify-final completed; exit 7/);
    assert.match(lines.join('\n'), /last output/);
    assert.equal(progress.last.id, 'verify-final');
    assert.match(output.join(''), /test phase started[\s\S]*last output/);
  } finally { child.kill(); await rm(root, { recursive: true, force: true }); }
});

test('progress preserves split lines for redaction, bounds output and rejects unsafe members', { skip: process.platform !== 'linux' }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-progress-safe-'));
  const dir = join(root, 'evidence/commands'); await mkdir(dir, { recursive: true });
  const lines = [], progress = commandProgress(root, line => lines.push(redactLog(line)));
  try {
    await writeFile(join(dir, 'verify.json'), JSON.stringify({ state: 'running', startedAt: 1 }));
    await writeFile(join(dir, 'verify.log'), 'Bearer pri'); progress.poll();
    assert.ok(!lines.join('\n').includes('pri'));
    await appendFile(join(dir, 'verify.log'), 'vate-token\n::error::forged\n'); progress.poll();
    assert.ok(!lines.join('\n').includes('private-token'));
    assert.match(lines.join('\n'), /\[Command verify\] ::error::forged/);
    const before = lines.length; progress.poll(); assert.equal(lines.length, before);
    await writeFile(join(root, 'private'), 'PRIVATE CONTENT');
    await writeFile(join(dir, 'unsafe.json'), JSON.stringify({ state: 'completed', startedAt: 2 }));
    await symlink(join(root, 'private'), join(dir, 'unsafe.log'));
    await symlink(join(root, 'private'), join(dir, 'forged.json'));
    await appendFile(join(dir, 'verify.log'), 'x'.repeat(9000) + '\n'); progress.poll();
    assert.ok(!lines.join('\n').includes('PRIVATE CONTENT'));
    assert.match(lines.join('\n'), /Oversized output line omitted/);
    await appendFile(join(dir, 'verify.log'), 'y\n'.repeat(300000));
    for (let i = 0; i < 40; i++) progress.poll();
    assert.equal(lines.filter(line => line.includes('Live output limit reached')).length, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('progress never follows a replaced evidence directory', { skip: process.platform !== 'linux' }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-progress-link-'));
  const outside = await mkdtemp(join(tmpdir(), 'lighthouse-private-'));
  try {
    await mkdir(join(outside, 'commands'));
    await writeFile(join(outside, 'commands/secret.json'), JSON.stringify({ state: 'running', startedAt: 1 }));
    await symlink(outside, join(root, 'evidence'));
    const lines = []; commandProgress(root, line => lines.push(line)).poll();
    assert.ok(!lines.join('\n').includes('secret started'));
  } finally { await rm(root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
});
