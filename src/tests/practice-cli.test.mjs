import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { practiceCli } from '../packages/sdlc/src/practice-cli.mjs';
import { context, observation } from './fixtures/practice-evidence.mjs';

test('package CLI exposes the catalog and never authenticates an offline observation', async () => {
  assert.equal((await practiceCli(['catalog'])).version, '1.0.0');
  const directory = mkdtempSync(join(tmpdir(), 'practice-cli-'));
  try {
    const path = join(directory, 'input.json'); writeFileSync(path, JSON.stringify({ context, observations: [observation()], now: '2026-11-16T13:00:00Z' }));
    const report = await practiceCli(['validate', '--input', path]);
    assert.equal(report.level, 'unverified'); assert.equal(report.practices.find(p => p.practice === 'tests').state, 'unavailable');
    writeFileSync(path, JSON.stringify({ assessments: [], period: { start: '2026-11-01T00:00:00Z', end: '2026-12-01T00:00:00Z' } }));
    assert.equal((await practiceCli(['history', '--input', path])).currentCertification, false);
    for (const args of [['catalog', '--extra'], ['validate'], ['github', '--input', path, '--approve'], ['gate-enable']]) await assert.rejects(practiceCli(args));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
