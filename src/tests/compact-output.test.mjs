import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { compactCommandOutput } from '../packages/sdlc/src/compact-output.mjs';

const script = resolve('src/packages/sdlc/src/managed-command.mjs');
const original = 'raw diagnostic line\n'.repeat(100);
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'lighthouse-compact-'));
  const log = join(directory, 'command.log'); writeFileSync(log, original);
  return { directory, log, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

test('disabled, failed and unsupported commands keep full output without calling an optimizer', () => {
  const f = fixture();
  try {
    const execute = () => { throw Error('Unexpected optimizer execution'); };
    assert.equal(compactCommandOutput(f.log, ['git', 'status'], 0, { env: {}, execute }), null);
    const env = { LIGHTHOUSE_COMPACT_OUTPUT: 'rtk' };
    assert.equal(compactCommandOutput(f.log, ['git', 'status'], 7, { env, execute }).reason, 'command-failed');
    assert.equal(compactCommandOutput(f.log, ['node', 'build.mjs'], 0, { env, execute }).reason, 'unsupported-command');
    assert.equal(readFileSync(f.log, 'utf8'), original);
  } finally { f.cleanup(); }
});

test('RTK filters retained data only, and missing, failing or noisy formatters fall back', () => {
  const f = fixture(), env = { LIGHTHOUSE_COMPACT_OUTPUT: 'rtk' };
  try {
    const result = compactCommandOutput(f.log, ['git', 'status'], 0, { env, execute: (program, args, options) => {
      assert.equal(program, 'rtk'); assert.deepEqual(args, ['pipe', '--filter', 'git-status']);
      assert.equal(readFileSync(options.stdio[0], 'utf8'), original);
      return { status: 0, stdout: 'short summary', stderr: '' };
    } });
    assert.equal(result.status, 'compacted'); assert.equal(result.rawLog, f.log);
    for (const failure of [{ error: { code: 'ENOENT' } }, { status: 9 }, { status: 0, stdout: '' }, { status: 0, stdout: original }, { status: 0, stdout: 'short', stderr: 'warning' }]) {
      assert.equal(compactCommandOutput(f.log, ['git', 'status'], 0, { env, execute: () => failure }).status, 'unabridged');
    }
    assert.equal(compactCommandOutput(f.log, ['git', 'status'], 0, { env, execute: () => { throw Error('formatter failed'); } }).status, 'unabridged');
    assert.equal(readFileSync(f.log, 'utf8'), original);
  } finally { f.cleanup(); }
});

test('managed commands retain original status and bytes across compact, failure, disabled and missing modes', () => {
  const f = fixture();
  try {
    const bin = join(f.directory, 'bin'); mkdirSync(bin);
    // A deterministic formatter double; real RTK and a model worker qualify separately.
    writeFileSync(join(bin, 'rtk'), '#!/bin/sh\ncat >/dev/null\nprintf "compact summary\\n"\n'); chmodSync(join(bin, 'rtk'), 0o755);
    writeFileSync(join(bin, 'git'), '#!/bin/sh\nprintf "original diagnostic\\n%.0s" 1 2 3 4 5 6 7 8 9 10\nexit "${COMMAND_STATUS:-0}"\n'); chmodSync(join(bin, 'git'), 0o755);
    for (const mode of ['compact', 'failed', 'disabled', 'missing']) {
      const directory = join(f.directory, mode); mkdirSync(directory);
      const command = mode === 'missing' ? [process.execPath, '-e', 'console.log("raw missing output")'] : [join(bin, 'git'), 'status'];
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_COMMAND_PROGRESS_ROOT: directory, LIGHTHOUSE_COMPACT_OUTPUT: mode === 'disabled' ? '' : 'rtk', COMMAND_STATUS: mode === 'failed' ? '7' : '0' };
      if (mode === 'missing') { env.PATH = '/nonexistent'; command.splice(0, command.length, join(bin, 'git'), 'status'); }
      const result = spawnSync(process.execPath, [script, 'run', directory, 'check', '--', ...command], { env, encoding: 'utf8' });
      const receipt = JSON.parse(readFileSync(join(directory, 'check.json'))), raw = readFileSync(join(directory, 'check.log'), 'utf8');
      assert.equal(result.status, mode === 'failed' ? 7 : 0, result.stderr);
      assert.equal(receipt.exitCode, result.status); assert.equal(receipt.state, 'completed'); assert.match(raw, /original diagnostic/);
      if (mode === 'compact') { assert.match(result.stdout, /compact summary/); assert.ok(!result.stdout.includes('original diagnostic')); assert.equal(receipt.output.status, 'compacted'); }
      else { assert.equal(result.stdout, raw); assert.equal(receipt.output?.status, mode === 'disabled' ? undefined : 'unabridged'); }
      if (mode === 'missing') assert.match(result.stderr, /optimizer-missing/);
    }
  } finally { f.cleanup(); }
});
