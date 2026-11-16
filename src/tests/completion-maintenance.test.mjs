import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { terminalPublication, reconcilePublishedCi } from '../packages/sdlc/src/publication-recovery.mjs';

test('missing original request evidence is visible before any terminal PR lookup or effect', async () => {
  const run = { id: 200, run_attempt: 1, status: 'completed', conclusion: 'success' };
  const issue = { number: 633, user: { login: 'owner' } };
  const comments = [{ user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-pr-state:{"pr":638,"head":"${'a'.repeat(40)}","complete":true,"run":200} -->` }];
  const result = await reconcilePublishedCi(async () => { throw Error('No PR lookup or effect allowed'); }, 'owner/repo', 'owner', issue, comments, { dispatch: { request: { stage: 'implement' } }, run }, {}, true, Date.now(), { readReport: async () => { throw Error('Original request unavailable'); } });
  assert.equal(result.code, 'publication-unconfirmed');
  assert.match(result.nextAction, /original admitted request/);
});

test('authenticated terminal publications are observations, not renewed completion authority', () => {
  const head = 'a'.repeat(40), identity = 'b'.repeat(64), proof = { pr: 638, head };
  const pr = { number: 638, state: 'closed', merged: true, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-implementation:${identity} -->`, head: { ref: `lighthouse/implement-633-${identity.slice(0, 12)}`, sha: head, repo: { full_name: 'owner/repo' } }, base: { ref: 'main', repo: { full_name: 'owner/repo' } } };
  assert.equal(terminalPublication(pr, 'owner/repo', 633, proof).code, 'publication-merged');
  assert.equal(terminalPublication({ ...pr, merged: false }, 'owner/repo', 633, proof).code, 'publication-closed');
  assert.equal(terminalPublication({ ...pr, state: 'open', merged: false }, 'owner/repo', 633, proof), null);
  for (const changed of [{ ...pr, number: 639 }, { ...pr, user: { login: 'owner', type: 'User' } }, { ...pr, head: { ...pr.head, sha: 'c'.repeat(40) } }]) assert.equal(terminalPublication(changed, 'owner/repo', 633, proof).code, 'publication-authority-invalid');
  assert.equal(terminalPublication({ ...pr, merged: undefined }, 'owner/repo', 633, proof).code, 'publication-unconfirmed');
});

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
