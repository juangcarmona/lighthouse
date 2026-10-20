import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const creator = fileURLToPath(new URL('../packages/cli/internal/create-dotnet.mjs', import.meta.url));
test('creator seeds an independent product and refuses an occupied target', async () => {
  const parent = await mkdtemp(resolve(tmpdir(), 'lighthouse-adoption-'));
  const target = resolve(parent, 'Workshop');
  try {
    const result = spawnSync(process.execPath, [creator, target, '--name', 'Workshop'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const solution = await readFile(resolve(target, 'Workshop.slnx'), 'utf8');
    assert.match(solution, /src\/root\/Workshop.Api/);
    assert.equal((solution.match(/<Project Path=/g) ?? []).length, 7);
    assert.doesNotMatch(solution, /<Folder/);
    const manifest = JSON.parse(await readFile(resolve(target, 'lighthouse.json'), 'utf8'));
    assert.equal(manifest.product, 'Workshop');
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
