import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('each distributed package carries the approved license, attribution and metadata', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-licenses-'));
  try {
    const license = await readFile('LICENSE', 'utf8');
    const notice = await readFile('NOTICE', 'utf8');
    const artifacts = JSON.parse(execFileSync('npm', ['pack', '--workspaces', '--pack-destination', directory, '--json'], { encoding: 'utf8' }));
    assert.equal(artifacts.length, 3);
    for (const artifact of artifacts) {
      const extract = (path) => execFileSync('tar', ['-xOf', join(directory, artifact.filename), `package/${path}`], { encoding: 'utf8' });
      const metadata = JSON.parse(extract('package.json'));
      assert.equal(metadata.name, artifact.name);
      assert.equal(metadata.license, 'Apache-2.0', artifact.name);
      assert.equal(extract('LICENSE'), license, artifact.name);
      assert.equal(extract('NOTICE'), notice, artifact.name);
      assert.equal(artifact.files.some(({ path }) => /(^|\/)(node_modules|\.agents|\.product)\//.test(path)), false, artifact.name);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
