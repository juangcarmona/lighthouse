import test from 'node:test';
import assert from 'node:assert/strict';
import { readActionsJson } from '../packages/sdlc/src/actions-artifact.mjs';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('optional recovery evidence distinguishes confirmed absence from incomplete or expired inventories', async () => {
  assert.equal(await readActionsJson(async () => ({ total_count: 0, artifacts: [] }), 'owner/repo', 100, 'result', 'envelope.json', true), null);
  for (const inventory of [
    { total_count: 1, artifacts: [] },
    { total_count: 101, artifacts: [] },
    { total_count: 1, artifacts: [{ name: 'result', expired: true, size_in_bytes: 10 }] },
    { total_count: 2, artifacts: [{ name: 'result', size_in_bytes: 10 }, { name: 'result', size_in_bytes: 10 }] },
  ]) await assert.rejects(readActionsJson(async () => inventory, 'owner/repo', 100, 'result', 'envelope.json', true), /inventory|bound|unavailable/);
});

test('production archive reader distinguishes an absent envelope from empty, null and malformed members', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-artifact-reader-')), priorPath = process.env.PATH;
  try {
    const archive = join(dir, 'artifact.zip'), gh = join(dir, 'gh');
    await writeFile(gh, `#!${process.execPath}\nprocess.stdout.write(require('node:fs').readFileSync(${JSON.stringify(archive)}));\n`);
    await chmod(gh, 0o700);
    process.env.PATH = `${dir}:${priorPath}`;
    const api = async () => ({ total_count: 1, artifacts: [{ id: 1, name: 'result', expired: false, size_in_bytes: 1024 }] });
    for (const content of [undefined, '', 'null', '{', '{"status":"blocked"}']) {
      execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],"w"); z.writestr(sys.argv[2],sys.argv[3]); z.close()', archive, content === undefined ? 'runtime.json' : 'envelope.json', content ?? '{}']);
      const read = () => readActionsJson(api, 'owner/repo', 100, 'result', 'envelope.json', true);
      if (content === undefined) assert.equal(await read(), null);
      else if (content === '{"status":"blocked"}') assert.deepEqual(await read(), { status: 'blocked' });
      else await assert.rejects(read());
    }
  } finally { process.env.PATH = priorPath; await rm(dir, { recursive: true, force: true }); }
});
