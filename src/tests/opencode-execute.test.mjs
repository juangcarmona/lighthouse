import { closeSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { snapshotSource, redactLog, acquireEngineSlot } from '../packages/sdlc/src/opencode-execute.mjs';

test('engine snapshot contains tracked regular files but no checkout credentials or symlink targets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-source-')), out = await mkdtemp(join(tmpdir(), 'lh-snapshot-'));
  try {
    execFileSync('git', ['init', '-q', root]);
    await writeFile(join(root, 'asset.png'), Buffer.alloc(4 * 1024 * 1024, 255));
    await writeFile(join(root, 'untracked-secret'), 'private');
    await symlink('untracked-secret', join(root, 'link'));
    execFileSync('git', ['-C', root, 'add', 'asset.png', 'link']);
    await snapshotSource(root, out);
    assert.equal((await readFile(join(out, 'asset.png'))).length, 4 * 1024 * 1024);
    for (const path of ['.git/config', 'link', 'untracked-secret']) await assert.rejects(readFile(join(out, path)));
  } finally { await rm(root, { recursive: true, force: true }); await rm(out, { recursive: true, force: true }); }
});
test('engine logs retain execution events while removing common credential formats', () => {
  const raw = 'tool read /workspace/src/main.ts Bearer private-token sk-abcdefghijklmnop ghp_abcdefghijklmnop eyJhbGci.eyJzdWI.signature';
  const clean = redactLog(raw);
  assert.match(clean, /tool read \/workspace\/src\/main.ts/);
  for (const secret of ['private-token', 'sk-abcdefghijklmnop', 'ghp_abcdefghijklmnop', 'eyJhbGci']) assert.ok(!clean.includes(secret));
});

test('host engine lock excludes another execution and releases with its descriptor', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-slot-'));
  try {
    const lock = join(root, 'engine.lock');
    const fd = acquireEngineSlot(lock, 0);
    try { assert.throws(() => acquireEngineSlot(lock, 0), /capacity unavailable/); }
    finally { closeSync(fd); }
    closeSync(acquireEngineSlot(lock, 0));
  } finally { await rm(root, { recursive: true, force: true }); }
});
