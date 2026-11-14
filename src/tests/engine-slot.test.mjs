import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireEngineSlot } from '../packages/sdlc/src/opencode-execute.mjs';
import { engineSlotWaitSeconds } from '../packages/sdlc/src/engine-slot.mjs';

test('operator admission wait preserves the default and rejects unbounded values', () => {
  assert.equal(engineSlotWaitSeconds({}), 240);
  for (const value of [0, 900, 3600]) assert.equal(engineSlotWaitSeconds({ engineSlotWaitSeconds: value }), value);
  for (const value of [null, '900', -1, 3601, 1.5, Infinity, NaN]) assert.throws(() => engineSlotWaitSeconds({ engineSlotWaitSeconds: value }), /integer from 0 to 3600/);
});

test('delivery admission uses the remaining budget while preserving explicit operator bounds', () => {
  const now = 1000000, deadline = now + 1800000;
  assert.equal(engineSlotWaitSeconds({}, { deadline, now }), 1800);
  assert.equal(engineSlotWaitSeconds({}, { deadline: now + 7200000, now }), 3600);
  for (const value of [0, 240, 900]) assert.equal(engineSlotWaitSeconds({ engineSlotWaitSeconds: value }, { deadline, now }), value);
  assert.equal(engineSlotWaitSeconds({ engineSlotWaitSeconds: 900 }, { deadline: now + 50000, now }), 50);
  for (const value of [null, '900', NaN, now - 1, now, now + 999]) assert.throws(() => engineSlotWaitSeconds({}, { deadline: value, now }), /deadline/i);
});

test('cancelled admission creates no lock file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-engine-preabort-')), lock = join(root, 'engine.lock');
  const controller = new AbortController(); controller.abort();
  try {
    await assert.rejects(acquireEngineSlot(lock, 30, { signal: controller.signal }), { name: 'AbortError' });
    await assert.rejects(access(lock), { code: 'ENOENT' });
    await assert.rejects(acquireEngineSlot('relative.lock'), /absolute path/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('a queued engine acquires the released slot without blocking the event loop', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-engine-wait-'));
  const lock = join(root, 'engine.lock');
  let occupied = await acquireEngineSlot(lock, 0), acquired;
  const release = setTimeout(() => { closeSync(occupied); occupied = null; }, 25);
  try {
    acquired = await acquireEngineSlot(lock, 1);
    await assert.rejects(async () => acquireEngineSlot(lock, 0), /capacity unavailable/);
  } finally {
    clearTimeout(release);
    if (occupied !== null) closeSync(occupied);
    if (acquired !== undefined) closeSync(acquired);
    await rm(root, { recursive: true, force: true });
  }
});

test('cancelling queued admission leaves the active engine and subsequent admission intact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-engine-cancel-'));
  const lock = join(root, 'engine.lock'), occupied = await acquireEngineSlot(lock, 0);
  const controller = new AbortController(), cancel = setTimeout(() => controller.abort(), 25);
  try {
    await assert.rejects(async () => acquireEngineSlot(lock, 1, { signal: controller.signal }), { name: 'AbortError' });
    await assert.rejects(async () => acquireEngineSlot(lock, 0), /capacity unavailable/);
  } finally { clearTimeout(cancel); closeSync(occupied); }
  try { closeSync(await acquireEngineSlot(lock, 0)); }
  finally { await rm(root, { recursive: true, force: true }); }
});
