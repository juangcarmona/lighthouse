import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { housekeepingFiles } from '../packages/sdlc/src/housekeeping-assets.mjs';

const tool = new URL('../packages/cli/src/lighthouse.mjs', import.meta.url).pathname;
const version = JSON.parse(await readFile(new URL('../packages/sdlc/package.json', import.meta.url))).version;
const workflow = '.github/workflows/lighthouse-worker-maintenance.yml';
const run = (cwd, ...args) => spawnSync(process.execPath, [tool, ...args], { cwd, encoding: 'utf8' });

test('packed CLI and SDLC artifacts generate and upgrade housekeeping in an isolated consumer', async () => {
  const root = await mkdtemp(join(tmpdir(), 'housekeeping-packed-'));
  try {
    for (const name of ['lighthouse', 'lighthouse-sdlc']) {
      const packed = spawnSync('npm', ['pack', '--workspace', `@juangcarmona/${name}`, '--pack-destination', root, '--json'], { cwd: new URL('../../', import.meta.url), encoding: 'utf8' });
      assert.equal(packed.status, 0, packed.stderr);
      const [artifact] = JSON.parse(packed.stdout), target = join(root, 'node_modules/@juangcarmona', name);
      await mkdir(target, { recursive: true });
      const extract = spawnSync('tar', ['-xzf', join(root, artifact.filename), '--strip-components=1', '-C', target], { encoding: 'utf8' });
      assert.equal(extract.status, 0, extract.stderr);
    }
    const entry = join(root, 'node_modules/@juangcarmona/lighthouse/src/lighthouse.mjs');
    const packedRun = (...args) => spawnSync(process.execPath, [entry, ...args], { cwd: root, encoding: 'utf8' });
    const initialized = packedRun('init', '--name', 'Packed adopter');
    assert.equal(initialized.status, 0, initialized.stderr);
    assert.equal(await readFile(join(root, workflow), 'utf8'), housekeepingFiles(version)[workflow]);
    await rm(join(root, workflow));
    const preview = JSON.parse(packedRun('upgrade', '--scope', 'sdlc', '--format', 'json').stdout);
    assert.equal(preview.changes.find(change => change.path === workflow).classification, 'additive');
    assert.match(preview.housekeeping.runtime, /No native complete-scan/);
    const applied = packedRun('upgrade', '--scope', 'sdlc', '--apply');
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(await readFile(join(root, workflow), 'utf8'), housekeepingFiles(version)[workflow]);
    assert.match(await readFile(join(root, '.lighthouse/housekeeping.json'), 'utf8'), /explicit repository-variable opt-in/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('init, reviewed upgrade and reconcile share packaged daily housekeeping without activating it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'housekeeping-upgrade-'));
  try {
    const init = run(root, 'init', '--name', 'Housekeeping consumer');
    assert.equal(init.status, 0, init.stderr);
    assert.equal(await readFile(join(root, workflow), 'utf8'), housekeepingFiles(version)[workflow]);
    const original = JSON.parse(await readFile(join(root, 'lighthouse.json'), 'utf8'));
    const state = JSON.parse(await readFile(join(root, '.lighthouse/upgrade.json'), 'utf8'));
    for (const path of [workflow, '.lighthouse/housekeeping.json']) { await rm(join(root, path)); delete state.files[path]; }
    original.managed = original.managed.filter(path => ![workflow, '.lighthouse/housekeeping.json'].includes(path));
    await writeFile(join(root, 'lighthouse.json'), JSON.stringify(original));
    await writeFile(join(root, '.lighthouse/upgrade.json'), JSON.stringify(state));
    const deferred = JSON.parse(run(root, 'upgrade', '--scope', 'harness', '--format', 'json').stdout);
    assert.match(deferred.housekeeping.installation, /deferred/);
    assert.ok(!deferred.changes.some(change => change.path === workflow));
    const preview = JSON.parse(run(root, 'upgrade', '--scope', 'sdlc', '--format', 'json').stdout);
    assert.equal(preview.changes.find(change => change.path === workflow).classification, 'additive');
    assert.match(preview.housekeeping.activation, /explicit opt-in/);
    assert.ok(preview.housekeeping.requirements.configuration.some(value => value.includes('LIGHTHOUSE_REPORT_INDEX_ISSUE')));
    const apply = run(root, 'upgrade', '--scope', 'sdlc', '--apply');
    assert.equal(apply.status, 0, apply.stderr);
    assert.equal(await readFile(join(root, workflow), 'utf8'), housekeepingFiles(version)[workflow]);
    await rm(join(root, workflow));
    const reconcile = run(root, 'reconcile', '--apply');
    assert.equal(reconcile.status, 0, reconcile.stderr);
    assert.equal(await readFile(join(root, workflow), 'utf8'), housekeepingFiles(version)[workflow]);
    await writeFile(join(root, workflow), '# Owner customized maintenance\n');
    const customized = JSON.parse(run(root, 'upgrade', '--scope', 'sdlc', '--format', 'json').stdout);
    assert.equal(customized.changes.find(change => change.path === workflow).classification, 'customized');
    run(root, 'upgrade', '--scope', 'sdlc', '--apply');
    assert.equal(await readFile(join(root, workflow), 'utf8'), '# Owner customized maintenance\n');
    assert.equal(run(root, 'reconcile', '--apply').status, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
