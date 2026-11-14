import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const creator = fileURLToPath(new URL('../packages/cli/internal/create-dotnet.mjs', import.meta.url));
const packagedCreator = fileURLToPath(new URL('../packages/cli/src/lighthouse.mjs', import.meta.url));
test('creator seeds an independent product and refuses an occupied target', async () => {
  const parent = await mkdtemp(resolve(tmpdir(), 'lighthouse-adoption-'));
  const target = resolve(parent, 'Workshop');
  try {
    const result = spawnSync(process.execPath, [creator, target, '--name', 'Workshop'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(resolve(target, 'Lighthouse.LICENSE'), 'utf8'), await readFile('LICENSE', 'utf8'));
    assert.equal(await readFile(resolve(target, 'Lighthouse.NOTICE'), 'utf8'), await readFile('NOTICE', 'utf8'));
    assert.match(await readFile(resolve(target, 'README.md'), 'utf8'), /starter remains under Apache-2\.0/);
    const packageJson = JSON.parse(await readFile(resolve(target, 'package.json'), 'utf8'));
    assert.equal(packageJson.license, undefined);
    assert.equal(packageJson.devDependencies['@prodshape/cli'], '0.26.1');
    assert.equal(packageJson.devDependencies['@prodshape/core'], '0.25.0');
    assert.match(await readFile(resolve(target, 'README.md'), 'utf8'), /authorities --apply/);
    await access(resolve(target, 'docs/upgrades/pdac-v1alpha2.md'));
    const solution = await readFile(resolve(target, 'Workshop.slnx'), 'utf8');
    assert.match(solution, /src\/root\/Workshop.Api/);
    assert.equal((solution.match(/<Project Path=/g) ?? []).length, 7);
    assert.doesNotMatch(solution, /<Folder/);
    const manifest = JSON.parse(await readFile(resolve(target, 'lighthouse.json'), 'utf8'));
    assert.equal(manifest.product, 'Workshop');
    assert.deepEqual(manifest.managed, ['LIGHTHOUSE.md', 'scripts/lighthouse-guard.mjs', '.husky/commit-msg', '.husky/pre-push', '.github/workflows/lighthouse.yml', '.lighthouse/sdlc.json', '.agents/skills/lighthouse-init/SKILL.md', '.lighthouse/upgrade.json', '.lighthouse/commands.json']);
    assert.deepEqual(manifest.packages.sdlc, { name: '@juangcarmona/lighthouse-sdlc', version: '0.1.0' });
    await access(resolve(target, '.lighthouse/sdlc.json'));
    await access(resolve(target, '.lighthouse/commands.json'));
    assert.match(await readFile(resolve(target, '.github/workflows/lighthouse.yml'), 'utf8'), /node scripts\/lighthouse\.mjs verify/);
    const program = await readFile(resolve(target, 'src/root/Workshop.Api/Program.cs'), 'utf8');
    assert.match(program, /namespace JuanGCarmona.Workshop.Api/);
    assert.doesNotMatch(program, /Lighthouse\.Example/);
    await writeFile(resolve(target, 'keep.txt'), 'existing work');
    const again = spawnSync(process.execPath, [creator, target, '--name', 'Workshop'], { encoding: 'utf8' });
    assert.notEqual(again.status, 0);
    assert.equal(await readFile(resolve(target, 'keep.txt'), 'utf8'), 'existing work');
    assert.deepEqual(await readdir(parent), ['Workshop']);
  } finally { await rm(parent, { recursive: true, force: true }); }
});

test('creator rejects names that cannot be product identifiers', async () => {
  const result = spawnSync(process.execPath, [creator, '/tmp/unused-lighthouse-target', '--name', '../Bad'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
});

test('packaged creator seeds the profile assets and verifier without remote writes', async () => {
  const parent = await mkdtemp(resolve(tmpdir(), 'lighthouse-packaged-dotnet-'));
  const target = resolve(parent, 'Product');
  try {
    const result = spawnSync(process.execPath, [packagedCreator, 'create-dotnet', target, '--name', 'Product'], { encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.equal(await readFile(resolve(target, 'Lighthouse.LICENSE'), 'utf8'), await readFile('LICENSE', 'utf8'));
    assert.equal(await readFile(resolve(target, 'Lighthouse.NOTICE'), 'utf8'), await readFile('NOTICE', 'utf8'));
    assert.match(await readFile(resolve(target, 'README.md'), 'utf8'), /starter remains under Apache-2\.0/);
    const packageJson = JSON.parse(await readFile(resolve(target, 'package.json'), 'utf8'));
    assert.equal(packageJson.license, undefined);
    assert.equal(packageJson.devDependencies['@prodshape/cli'], '0.26.1');
    assert.equal(packageJson.devDependencies['@prodshape/core'], '0.25.0');
    assert.match(await readFile(resolve(target, 'README.md'), 'utf8'), /authorities --apply/);
    assert.match(await readFile(resolve(target, '.github/workflows/ci.yml'), 'utf8'), /npm ci --ignore-scripts/);
    await access(resolve(target, 'docs/upgrades/pdac-v1alpha2.md'));
    assert.match(await readFile(resolve(target, 'docs/profiles/dotnet/README.md'), 'utf8'), /Minimal APIs/);
    assert.match(await readFile(resolve(target, '.agents/skills/lighthouse-dotnet/SKILL.md'), 'utf8'), /Aspire/);
    assert.match(await readFile(resolve(target, 'scripts/verify-dotnet.mjs'), 'utf8'), /LighthouseModule/);
    assert.match(await readFile(resolve(target, 'Product.slnx'), 'utf8'), /src\/root\/Product.Api/);
    await access(resolve(target));
    const verify = spawnSync(process.execPath, [resolve(target, 'scripts/lighthouse.mjs'), 'verify', '--format', 'json'], { cwd: target, encoding: 'utf8' });
    assert.equal(verify.status, 1, `${verify.stdout}\n${verify.stderr}`);
    assert.deepEqual(JSON.parse(verify.stdout).blocking, ['foundation.pdac']);
  } finally { await rm(parent, { recursive: true, force: true }); }
});
