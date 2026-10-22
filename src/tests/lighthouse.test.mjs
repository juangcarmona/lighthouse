import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { initialReviewStatus, readGuardrailCatalog } from '../packages/cli/src/guardrails.mjs';

const tool = new URL('../packages/cli/src/lighthouse.mjs', import.meta.url).pathname;
const manifest = {
  schemaVersion: 1,
  baseline: '0.1.0',
  product: 'fixture',
  profiles: [],
  integrations: { productShape: null, arcShape: null },
  managed: ['LIGHTHOUSE.md'],
  repository: {
    layout: ['src', 'docs', 'infra', 'scripts'],
    publicSite: { enabled: false },
    conventions: {
      commits: 'conventional',
      branchPattern: '^(feat|fix|docs|refactor|test|chore|build|ci|perf|revert)/[1-9]\\d*-[a-z0-9]+(?:-[a-z0-9]+)*$'
    }
  }
};
async function fixture() { const dir = await mkdtemp(join(tmpdir(), 'lighthouse-test-')); await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(manifest)); return dir; }
function run(dir, command, args = []) { return spawnSync(process.execPath, [tool, command, ...args], { cwd: dir, encoding: 'utf8' }); }

test('init creates a projection and refuses to overwrite product work', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    assert.equal(run(dir, 'verify').status, 0);
    assert.match(await readFile(join(dir, 'LIGHTHOUSE.md'), 'utf8'), /# fixture repository baseline/);
    for (const file of ['scripts/lighthouse-guard.mjs', '.husky/commit-msg', '.husky/pre-push', '.github/workflows/lighthouse.yml']) {
      await access(join(dir, file));
    }
    const guard = join(dir, 'scripts/lighthouse-guard.mjs');
    assert.equal(spawnSync(process.execPath, [guard, 'verify'], { cwd: dir }).status, 0);
    const message = join(dir, 'message.txt');
    await writeFile(message, 'feat: add a fixture\n');
    assert.equal(spawnSync(process.execPath, [guard, 'commit-msg', message], { cwd: dir }).status, 0);
    await writeFile(message, 'not conventional\n');
    assert.notEqual(spawnSync(process.execPath, [guard, 'commit-msg', message], { cwd: dir }).status, 0);
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
      { ...manifest, integrations: { ...manifest.integrations, agenticSdlc: null } },
      { ...manifest, unexpected: true }
    ]) {
      await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(changed));
      const result = run(dir, 'verify');
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Invalid lighthouse.json/);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('greenfield init creates the repository boundaries and a default manifest', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-greenfield-'));
  try {
    const result = spawnSync(process.execPath, [tool, 'init', '--name', 'Greenfield'], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    for (const directory of ['src', 'docs', 'infra', 'scripts']) assert.equal((await stat(join(dir, directory))).isDirectory(), true);
    const generated = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    assert.equal(generated.repository.publicSite.enabled, true);
    assert.deepEqual(generated.packages.sdlc, { name: '@juangcarmona/lighthouse-sdlc', version: '0.1.0' });
    assert.match(await readFile(join(dir, '.lighthouse/sdlc.json'), 'utf8'), /"provider": "agent-host"/);
    assert.match(await readFile(join(dir, 'LIGHTHOUSE.md'), 'utf8'), /Repository roots/);
    assert.equal(spawnSync(process.execPath, [tool, 'verify'], { cwd: dir }).status, 0);
    assert.match(await readFile(join(dir, '.github/workflows/lighthouse.yml'), 'utf8'), /npx --no-install lighthouse verify/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init dry-run reports brownfield conflicts without writing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-brownfield-'));
  try {
    await writeFile(join(dir, 'src'), 'project-owned file');
    const result = spawnSync(process.execPath, [tool, 'init', '--name', 'Brownfield', '--dry-run'], { cwd: dir, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /src exists but is not a directory/);
    assert.equal(await readFile(join(dir, 'src'), 'utf8'), 'project-owned file');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('reconcile previews and applies missing managed paths without overwriting drift', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    const missing = join(dir, '.github/workflows/lighthouse.yml');
    await rm(missing);
    const preview = run(dir, 'reconcile');
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /create \.github\/workflows\/lighthouse\.yml/);
    assert.equal(await access(missing).then(() => true).catch(() => false), false);
    const applied = spawnSync(process.execPath, [tool, 'reconcile', '--apply'], { cwd: dir, encoding: 'utf8' });
    assert.equal(applied.status, 0, applied.stderr);
    assert.match(applied.stdout, /Reconciled missing/);
    const drifted = join(dir, 'LIGHTHOUSE.md');
    await writeFile(drifted, 'project-owned content');
    const conflict = run(dir, 'reconcile');
    assert.equal(conflict.status, 1);
    assert.match(conflict.stderr, /LIGHTHOUSE\.md exists with different content/);
    assert.equal(await readFile(drifted, 'utf8'), 'project-owned content');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('verify keeps the human output and exposes the existing catalog as JSON', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    const text = run(dir, 'verify');
    assert.equal(text.status, 0, text.stderr);
    assert.equal(text.stdout.trim(), 'Lighthouse manifest, repository boundaries and managed projection are valid.');
    const json = run(dir, 'verify', ['--format', 'json']);
    assert.equal(json.status, 0, json.stderr);
    const report = JSON.parse(json.stdout);
    assert.equal(report.summary.failed, 0);
    assert.equal(report.summary.drift, 0);
    assert.ok(report.results.some((item) => item.id === 'foundation.manifest' && item.status === 'passed'));
    assert.ok(report.results.some((item) => item.id === 'repository.managed-projection' && item.status === 'passed'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('verify JSON distinguishes managed projection drift', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    await writeFile(join(dir, 'LIGHTHOUSE.md'), 'project-owned content');
    const result = run(dir, 'verify', ['--format=json']);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    const managed = report.results.find((item) => item.id === 'repository.managed-projection');
    assert.equal(managed.status, 'drift');
    assert.match(managed.problems.join('\n'), /LIGHTHOUSE\.md has drifted/);
    assert.deepEqual(report.blocking, ['repository.managed-projection']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('catalog keeps level and kind independent and records pending human review', () => {
  const catalog = readGuardrailCatalog();
  const layout = catalog.guardrails.find((item) => item.id === 'repository.layout');
  assert.equal(layout.level, 'required');
  assert.equal(layout.kind, 'hard');
  assert.equal(initialReviewStatus({ level: 'required', kind: 'soft', verification: 'human' }), 'pending-review');
  assert.equal(initialReviewStatus({ level: 'required', kind: 'hard', verification: 'semantic' }), 'pending-review');
  assert.equal(initialReviewStatus({ level: 'recommended', kind: 'soft', verification: 'deterministic' }), 'unavailable');
});
