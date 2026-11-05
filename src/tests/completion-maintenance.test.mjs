import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('../packages/sdlc/src/worker-maintenance.mjs', import.meta.url));
test('the maintenance command signals recovered integration but never starts another final review', async () => {
  const root = await mkdtemp(join(tmpdir(), 'final-review-maintenance-'));
  try {
    const directory = join(root, 'lighthouse-maintenance-300-42'); await mkdir(directory);
    for (const stage of [undefined, 'review']) {
      await writeFile(join(directory, 'completion-recovery.json'), JSON.stringify({ schemaVersion: 1, issue: 42, stage }));
      const program = `
        const calls = [];
        globalThis.fetch = async (url, options) => {
          calls.push({ url, method: options.method, body: options.body && JSON.parse(options.body) });
          if (options.method === 'GET' && url.endsWith('/actions/runs/300/attempts/1')) return new Response(JSON.stringify({ id: 300, path: '.github/workflows/lighthouse-worker-maintenance.yml', repository: { full_name: 'owner/repo' }, event: 'workflow_dispatch', actor: { login: 'owner' }, triggering_actor: { login: 'owner' }, head_branch: 'main' }));
          if (options.method === 'POST' && url.endsWith('/actions/workflows/lighthouse-sdlc-router.yml/dispatches')) return new Response(null, { status: 204 });
          throw Error('Unexpected network operation');
        };
        process.argv = [process.execPath, ${JSON.stringify(entry)}, 'signal-completion'];
        process.once('beforeExit', () => process.stdout.write(JSON.stringify(calls)));
        await import(${JSON.stringify(entry)});
      `;
      const child = spawnSync(process.execPath, ['--input-type=module', '-e', program], { encoding: 'utf8', env: { ...process.env, RUNNER_TEMP: root, GITHUB_REPOSITORY: 'owner/repo', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_RUN_ID: '300', GITHUB_RUN_ATTEMPT: '1', LIGHTHOUSE_ISSUE: '42', LIGHTHOUSE_MAINTENANCE_ENABLED: 'true', LIGHTHOUSE_RECOVERY_ENABLED: 'true', LIGHTHOUSE_MAINTENANCE_ISSUES: '[42]' } });
      assert.equal(child.status, 0, child.stderr);
      const calls = JSON.parse(child.stdout);
      assert.equal(calls.length, stage === 'review' ? 1 : 2);
      if (stage !== 'review') assert.deepEqual(calls[1].body, { ref: 'main', inputs: { issue: '42', stage: 'review', workflow: 'stage', after_run: '300' } });
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
