import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registryWorkflow } from '../packages/sdlc/src/workflow-distribution.mjs';

const workflows = ['lighthouse-sdlc-router.yml', ...['triage', 'refine', 'propose', 'implement', 'apply-review', 'integrate', 'review', 'product-change', 'apply-product-change'].map(name => `lighthouse-sdlc-${name}.md`), 'lighthouse-worker-maintenance.yml', 'lighthouse-sdlc-unattended.yml', 'lighthouse-sdlc-epic.yml', 'shared/lighthouse-opencode.md'];
test('the complete registry projection loads the exact package and preserves adopter source checkouts', async () => {
  for (const name of workflows) {
    const source = await readFile(new URL(`../packages/sdlc/workflows/${name}`, import.meta.url), 'utf8');
    const result = registryWorkflow(source, '1.2.3');
    assert.doesNotMatch(result, /repository: juangcarmona\/lighthouse\n|src\/packages\/sdlc\//);
    if (source.includes('repository: juangcarmona/lighthouse')) {
      assert.match(result, /--ignore-scripts.*--save-exact @juangcarmona\/lighthouse-sdlc@1\.2\.3/);
      assert.equal((result.match(/Install the published Lighthouse harness/g) ?? []).length, (source.match(/repository: juangcarmona\/lighthouse\n/g) ?? []).length);
    }
    if (name === 'lighthouse-sdlc-implement.md') assert.match(result, /ref: \$\{\{ needs\.prepare\.outputs\.source_revision \}\}/);
    if (name === 'lighthouse-sdlc-product-change.md') assert.match(result, /working-directory: \.lighthouse-harness\n\s+run: \|\n\s+npm ci --ignore-scripts/);
    if (name === 'shared/lighthouse-opencode.md') assert.match(result, /args: \[\.lighthouse-harness\/node_modules\/@juangcarmona\/lighthouse-sdlc\/src\/opencode-execute.mjs\]/);
  }
  assert.throws(() => registryWorkflow('repository: juangcarmona/lighthouse\n', '1.2.3'), /refused/);
  for (const version of ['latest', '^1.2.3', '1.2.3; echo unsafe']) assert.throws(() => registryWorkflow('', version), /exact package version/);
});
test('package-mode installer preserves existing provider files, hooks and agent guidance', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-registry-workflow-'));
  try {
    const preserved = { 'AGENTS.md': '# Existing guidance\n', '.product/config.yaml': 'product-root: product-definition\n', '.git/hooks/pre-commit': '#!/bin/sh\nexit 0\n' };
    for (const [name, content] of Object.entries(preserved)) { await mkdir(join(root, name, '..'), { recursive: true }); await writeFile(join(root, name), content); }
    const compiler = join(root, 'compiler'); await writeFile(compiler, `#!${process.execPath}\nif(process.argv.includes('--version'))console.log('gh-aw v0.93.2');\n`, { mode: 0o755 });
    execFileSync(process.execPath, [fileURLToPath(new URL('../packages/sdlc/src/install-workflows.mjs', import.meta.url)), root, 'package', '--with-completion', '--with-product-change', '--with-unattended', '--with-maintenance', '--with-epic', '--apply'], { env: { ...process.env, LIGHTHOUSE_GH_AW_EXECUTABLE: compiler }, stdio: 'pipe' });
    for (const [name, content] of Object.entries(preserved)) assert.equal(await readFile(join(root, name), 'utf8'), content);
    assert.doesNotMatch(await readFile(join(root, '.github/workflows/lighthouse-sdlc-router.yml'), 'utf8'), /repository: juangcarmona\/lighthouse\n/);
    assert.match(await readFile(join(root, '.github/workflows/lighthouse-sdlc-router.yml'), 'utf8'), /Lighthouse epic reconciliation/);
    const epic = await readFile(join(root, '.github/workflows/lighthouse-sdlc-epic.yml'), 'utf8');
    assert.match(epic, /working-directory: \.lighthouse-harness\n\s+run: npm ci --ignore-scripts/);
    assert.match(epic, /node \.lighthouse-harness\/node_modules\/@juangcarmona\/lighthouse-sdlc\/src\/epic-native.mjs/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
