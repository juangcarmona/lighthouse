import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registryWorkflow } from '../packages/sdlc/src/workflow-distribution.mjs';
import { createIssueControlManifest } from '../packages/sdlc/src/issue-control-contract.mjs';

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
    execFileSync(process.execPath, [fileURLToPath(new URL('../packages/sdlc/src/install-workflows.mjs', import.meta.url)), root, 'package', '--with-completion', '--with-product-change', '--with-unattended', '--with-maintenance', '--with-epic', '--with-issue-control', '--apply'], { env: { ...process.env, LIGHTHOUSE_GH_AW_EXECUTABLE: compiler }, stdio: 'pipe' });
    for (const [name, content] of Object.entries(preserved)) assert.equal(await readFile(join(root, name), 'utf8'), content);
    assert.doesNotMatch(await readFile(join(root, '.github/workflows/lighthouse-sdlc-router.yml'), 'utf8'), /repository: juangcarmona\/lighthouse\n/);
    const router = await readFile(join(root, '.github/workflows/lighthouse-sdlc-router.yml'), 'utf8');
    assert.match(router, /Lighthouse epic reconciliation/);
    const manifest = JSON.parse(await readFile(join(root, '.lighthouse/issue-control.json'), 'utf8'));
    assert.deepEqual(manifest, createIssueControlManifest(router, ['lighthouse-sdlc-unattended.yml', 'lighthouse-sdlc-epic.yml']));
    assert.match(router, /issue-control-actions\.mjs admit/);
    assert.match(router, /client-control:\n    if: >-\n      true &&/);
    const epic = await readFile(join(root, '.github/workflows/lighthouse-sdlc-epic.yml'), 'utf8');
    assert.match(epic, /working-directory: \.lighthouse-harness\n\s+run: npm ci --ignore-scripts/);
    assert.match(epic, /node \.lighthouse-harness\/node_modules\/@juangcarmona\/lighthouse-sdlc\/src\/epic-native.mjs/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('CI App secrets are confined to trusted publishing and recovery steps', async () => {
  for (const name of ['lighthouse-sdlc-implement.md', 'lighthouse-sdlc-apply-review.md', 'lighthouse-sdlc-unattended.yml', 'lighthouse-worker-maintenance.yml', 'lighthouse-sdlc-epic.yml']) {
    const source = await readFile(new URL('../packages/sdlc/workflows/' + name, import.meta.url), 'utf8');
    const blocks = source.split('      - name: ');
    const credential = blocks.filter(block => block.includes('LIGHTHOUSE_CI_APP_PRIVATE_KEY:'));
    assert.equal(credential.length, 1, name);
    assert.match(credential[0], /^(?:Recheck authority and publish the validated result|Execute the authorized bounded composition|Reconcile and record one bounded retry|Reconcile native child issues)/);
    assert.ok(credential[0].includes('LIGHTHOUSE_CI_APP_CLIENT_ID: ${{ vars.LIGHTHOUSE_CI_APP_CLIENT_ID }}'));
    assert.ok(credential[0].includes('LIGHTHOUSE_CI_APP_PRIVATE_KEY: ${{ secrets.LIGHTHOUSE_CI_APP_PRIVATE_KEY }}'));
  }
});

test('workflow installation never silently enables the optional client entry', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-control-optin-'));
  try {
    const compiler = join(root, 'compiler'); await writeFile(compiler, `#!${process.execPath}\nif(process.argv.includes('--version'))console.log('gh-aw v0.93.2');\n`, { mode: 0o755 });
    const installer = fileURLToPath(new URL('../packages/sdlc/src/install-workflows.mjs', import.meta.url));
    execFileSync(process.execPath, [installer, root, 'a'.repeat(40), '--apply'], { env: { ...process.env, LIGHTHOUSE_GH_AW_EXECUTABLE: compiler } });
    const router = await readFile(join(root, '.github/workflows/lighthouse-sdlc-router.yml'), 'utf8');
    assert.match(router, /client-control:\n    if: >-\n      false &&/);
    assert.doesNotMatch(router, /^# lighthouse-issue-control:v1$/m);
    await assert.rejects(readFile(join(root, '.lighthouse/issue-control.json')), { code: 'ENOENT' });
    // Existing background producers remain part of coverage when not reselected.
    await writeFile(join(root, '.github/workflows/lighthouse-sdlc-unattended.yml'), '# existing reviewed producer\n');
    execFileSync(process.execPath, [installer, root, 'a'.repeat(40), '--with-issue-control', '--replace-reviewed', '--apply'], { env: { ...process.env, LIGHTHOUSE_GH_AW_EXECUTABLE: compiler } });
    assert.deepEqual(JSON.parse(await readFile(join(root, '.lighthouse/issue-control.json'), 'utf8')).backgroundWorkflows, ['lighthouse-sdlc-unattended.yml']);
  } finally { await rm(root, { recursive: true, force: true }); }
});
