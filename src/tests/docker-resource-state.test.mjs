import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

test('Docker fixture inventory remains readable during a resource state write', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-docker-state-'));
  try {
    const shim = join(root, 'docker.cjs');
    const helper = fileURLToPath(new URL('./helpers/docker-resource-state.cjs', import.meta.url));
    await writeFile(shim, `
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
if (process.env.INTERLEAVE_INVENTORY === '1') {
  const write = fs.writeFileSync;
  fs.writeFileSync = (file, data, ...options) => {
    if (require('node:path').basename(file).startsWith('.docker-resource-state.json')) {
      write(file, data.slice(0, Math.floor(data.length / 2)), ...options);
      const inventory = spawnSync(process.execPath, [__filename, 'container', 'ls', '--filter', 'label=io.lighthouse.execution'], { encoding: 'utf8', env: { ...process.env, INTERLEAVE_INVENTORY: '0' } });
      assert.equal(inventory.status, 0, inventory.stderr);
      assert.ok(inventory.stdout.includes(${JSON.stringify(createHash('sha256').update('first').digest('hex'))}));
    }
    return write(file, data, ...options);
  };
}
require(${JSON.stringify(helper)})(process.argv.slice(2));
`);
    for (const name of ['first', 'second']) {
      const result = spawnSync(process.execPath, [shim, 'run', '--label', `io.lighthouse.execution=${'a'.repeat(64)}`, '--name', name], { encoding: 'utf8', env: { ...process.env, INTERLEAVE_INVENTORY: name === 'second' ? '1' : '0' } });
      assert.equal(result.status, 0, result.stderr);
    }
    const result = spawnSync(process.execPath, [shim, 'container', 'ls', '--filter', 'label=io.lighthouse.execution'], { encoding: 'utf8', env: { ...process.env, INTERLEAVE_INVENTORY: '0' } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim().split('\n').length, 2);
  } finally { await rm(root, { recursive: true, force: true }); }
});
