import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { harnessIdentity } from '../packages/sdlc/src/harness-identity.mjs';

const pkg = { name: '@juangcarmona/lighthouse-sdlc', version: '1.2.3' };
test('an installed harness never mistakes consumer Git history for package provenance', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-harness-identity-'));
  try {
    const harness = join(root, 'node_modules/@juangcarmona/lighthouse-sdlc'); await mkdir(harness, { recursive: true });
    await writeFile(join(harness, 'package.json'), JSON.stringify(pkg));
    const integrity = 'sha512-' + Buffer.alloc(64, 1).toString('base64');
    await writeFile(join(root, 'package-lock.json'), JSON.stringify({ packages: { 'node_modules/@juangcarmona/lighthouse-sdlc': { version: pkg.version, integrity } } }));
    execFileSync('git', ['init', '-q', root]); execFileSync('git', ['-C', root, 'add', '.']);
    execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@localhost', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Consumer history']);
    const receipt = await harnessIdentity(harness);
    assert.deepEqual(receipt, { package: pkg, harnessRevision: null, distribution: { type: 'package', integrity } });
    await writeFile(join(root, 'package-lock.json'), JSON.stringify({ packages: {} }));
    assert.equal((await harnessIdentity(harness)).distribution.integrity, null);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('an unpacked harness works without Git and a tracked source harness reports its own commit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-unpacked-harness-'));
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify(pkg));
    assert.equal((await harnessIdentity(root)).harnessRevision, null);
    execFileSync('git', ['init', '-q', root]); execFileSync('git', ['-C', root, 'add', '.']);
    execFileSync('git', ['-C', root, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@localhost', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Harness source']);
    assert.equal((await harnessIdentity(root)).harnessRevision, execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
  } finally { await rm(root, { recursive: true, force: true }); }
});
