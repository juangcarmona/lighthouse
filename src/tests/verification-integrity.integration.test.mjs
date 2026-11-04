import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { restoreWorkspaceOwnership, writableTree } from '../packages/sdlc/src/implementation-runtime.mjs';

test('real checks cannot hide committed or index-flagged working-tree edits', { skip: !process.env.LIGHTHOUSE_TEST_IMAGE, timeout: 180000 }, async t => {
  const config = { image: process.env.LIGHTHOUSE_TEST_IMAGE, uid: 20003 };
  const harness = await mkdtemp(join(process.env.RUNNER_TEMP ?? tmpdir(), 'lighthouse-integrity-harness-'));
  await cp(new URL('../packages/sdlc/', import.meta.url), harness, { recursive: true });
  await writableTree(harness);
  const { runImplementationChecks } = await import(pathToFileURL(join(harness, 'src/implementation-runtime.mjs')));
  try {
  for (const scenario of ['unchanged', 'working-tree', 'assume-unchanged', 'skip-worktree', 'committed']) await t.test(scenario, async () => {
    const root = await mkdtemp(join(process.env.RUNNER_TEMP ?? tmpdir(), 'lighthouse-check-tamper-')), workspace = join(root, 'workspace');
    await mkdir(join(workspace, 'scripts'), { recursive: true });
    await writeFile(join(workspace, 'scripts/verify.mjs'), 'required check bytes');
    const script = `const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const git=args=>execFileSync('git',args,{stdio:'pipe'});
const scenario=${JSON.stringify(scenario)};
if(['assume-unchanged','skip-worktree'].includes(scenario))git(['update-index','--'+scenario,'scripts/verify.mjs']);
if(scenario!=='unchanged')fs.writeFileSync('scripts/verify.mjs','weakened checker');
if(scenario==='committed'){git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@localhost','commit','-m','Hide edit in HEAD']);}
if(scenario!=='working-tree'&&git(['status','--porcelain']).toString().trim())throw Error('Expected clean Git status');`;
    const request = { issue: 101, runId: 'a'.repeat(64), sourceRevision: 'b'.repeat(40), implementation: { policy: { scope: 'Disposable checker experiment', paths: ['scripts/'], checks: [['node', '-e', script]], reviewRequired: false } } };
    try {
      const receipt = await runImplementationChecks({ config, request, changes: [], workspace, output: join(root, 'host'), name: `verification-101-${process.pid}-${scenario}`, redact: text => text, cancelled: () => false });
      assert.equal(receipt.checks[0].execution.status, 'passed');
      assert.equal(receipt.checks[0].exitCode, scenario === 'unchanged' ? 0 : 1);
      if (scenario !== 'unchanged') assert.match(receipt.checks[0].reason, /Checks modified source/);
      const executed = JSON.parse(await readFile(join(root, 'host/check-1.json'), 'utf8'));
      assert.equal(executed.state, 'completed'); assert.equal(executed.exitCode, 0);
    } finally { restoreWorkspaceOwnership(root, config); await rm(root, { recursive: true, force: true }); }
  });
  } finally { await rm(harness, { recursive: true, force: true }); }
});
