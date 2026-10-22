import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { composeProfiles, readProfileCatalog } from '../packages/cli/src/profiles.mjs';

const tool = new URL('../packages/cli/src/lighthouse.mjs', import.meta.url).pathname;
const fixtures = [
  new URL('./fixtures/profiles/react-web-platform.json', import.meta.url),
  new URL('./fixtures/profiles/web-bff.json', import.meta.url),
  new URL('./fixtures/profiles/pwa-capability.json', import.meta.url),
];
function run(dir, command, args = []) {
  return spawnSync(process.execPath, [tool, command, ...args], { cwd: dir, encoding: 'utf8' });
}

for (const fixtureUrl of fixtures) {
  const fixture = JSON.parse(await readFile(fixtureUrl, 'utf8'));
  test(`consumer fixture composes ${fixture.profiles.join(', ')}`, async () => {
    const catalog = readProfileCatalog();
    const composition = composeProfiles(catalog, fixture);
    assert.equal(composition.status, fixture.expected.status);
    assert.deepEqual(composition.selected.map((profile) => profile.id), fixture.expected.requiredProfiles);
    assert.ok(composition.selected.some((profile) => profile.verification.layers.some((layer) => layer.id === fixture.expected.browserLayer)));
    for (const profileId of ['react-web-platform', 'web-bff']) {
      const profile = composition.selected.find((item) => item.id === profileId);
      if (profile) assert.equal(profile.consumerFixture, 'src/tests/profile-fixtures.test.mjs');
    }
  });
}

test('consumer initialization projects the complete private web composition without remote writes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-web-consumer-'));
  try {
    const profiles = ['visual-theme', 'react-web-platform', 'dotnet-backend', 'web-bff'];
    const initialized = run(dir, 'init', ['--name', 'WebConsumer', ...profiles.flatMap((profile) => ['--profile', profile])]);
    assert.equal(initialized.status, 0, initialized.stderr);
    const manifestPath = join(dir, 'lighthouse.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.application = { shape: 'full-stack', stacks: ['react', 'dotnet'] };
    await writeFile(manifestPath, JSON.stringify(manifest));
    const planned = run(dir, 'profiles', ['--format', 'json']);
    assert.equal(planned.status, 0, planned.stderr);
    assert.equal(JSON.parse(planned.stdout).status, 'passed');
    const verified = run(dir, 'verify', ['--format', 'json']);
    assert.equal(verified.status, 0, verified.stderr);
    assert.equal(JSON.parse(verified.stdout).results.find((result) => result.id === 'foundation.profile-composition').status, 'passed');
    assert.equal(await access(join(dir, '.lighthouse/reconciliation')).then(() => true).catch(() => false), false);
    assert.equal(await access(join(dir, '.git')).then(() => true).catch(() => false), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
