import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const tool = new URL('../packages/cli/src/lighthouse.mjs', import.meta.url).pathname;
const manifest = { schemaVersion: 1, baseline: '0.1.0', product: 'fixture', profiles: [], integrations: { productShape: null, arcShape: null, agenticSdlc: null }, managed: ['LIGHTHOUSE.md'] };
async function fixture() { const dir = await mkdtemp(join(tmpdir(), 'lighthouse-test-')); await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(manifest)); return dir; }
function run(dir, command) { return spawnSync(process.execPath, [tool, command], { cwd: dir, encoding: 'utf8' }); }

test('init creates a projection and refuses to overwrite product work', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    assert.equal(run(dir, 'verify').status, 0);
    assert.match(await readFile(join(dir, 'LIGHTHOUSE.md'), 'utf8'), /# fixture repository baseline/);
    const again = run(dir, 'init');
    assert.equal(again.status, 1);
    assert.match(again.stderr, /refusing to overwrite/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('verify reports projection drift and invalid manifests', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    await writeFile(join(dir, 'LIGHTHOUSE.md'), 'product edit');
    assert.match(run(dir, 'verify').stderr, /drifted/);
    await writeFile(join(dir, 'lighthouse.json'), '{"schemaVersion":2}');
    assert.match(run(dir, 'verify').stderr, /Invalid lighthouse.json/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('manifest cannot advertise unsupported checks or unverified managed files', async () => {
  const dir = await fixture();
  try {
    for (const changed of [
      { ...manifest, profiles: ['imaginary-profile'] },
      { ...manifest, managed: ['LIGHTHOUSE.md', 'unverified.md'] },
      { ...manifest, baseline: '99.0.0' },
      { ...manifest, integrations: { ...manifest.integrations, arcShape: 'latest' } },
      { ...manifest, unexpected: true }
    ]) {
      await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(changed));
      const result = run(dir, 'verify');
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Invalid lighthouse.json/);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
