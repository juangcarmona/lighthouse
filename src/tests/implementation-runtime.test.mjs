import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm, chmod, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { prepareWorkspace, prepareImplementationWorkspace, runImplementationChecks } from '../packages/sdlc/src/implementation-runtime.mjs';

test('candidate Git metadata passes the baseline branch guard without copying repository hooks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workspace-branch-'));
  const previousPath = process.env.PATH;
  try {
    const bin = join(root, 'bin'), workspace = join(root, 'source');
    await mkdir(bin); await mkdir(workspace);
    await writeFile(join(bin, 'docker'), '#!/bin/sh\nexit 0\n');
    await chmod(join(bin, 'docker'), 0o755);
    process.env.PATH = `${bin}:${previousPath}`;
    await writeFile(join(workspace, 'README.md'), 'Candidate source');
    await assert.rejects(prepareImplementationWorkspace(workspace, {}, 0), /positive issue number/);
    await prepareImplementationWorkspace(workspace, { image: 'fixture', uid: process.getuid() }, 53);
    const branch = execFileSync('git', ['-C', workspace, 'branch', '--show-current'], { encoding: 'utf8' }).trim();
    const baseline = /^(feat|fix|docs|refactor|test|chore|build|ci|perf|revert)\/[1-9]\d*-[a-z0-9]+(?:-[a-z0-9]+)*$/;
    assert.match(branch, baseline);
    assert.ok(branch.includes('/53-'));
    assert.equal(execFileSync('git', ['-C', workspace, 'remote'], { encoding: 'utf8' }).trim(), '');
    assert.equal(execFileSync('git', ['-C', workspace, 'rev-list', '--all', '--count'], { encoding: 'utf8' }).trim(), '1');
    await assert.rejects(lstat(join(workspace, '.git/hooks')));
  } finally { process.env.PATH = previousPath; await rm(root, { recursive: true, force: true }); }
});

test('workspace preparation rejects links before changing ownership', async () => {
  const root = await mkdtemp(join(tmpdir(), 'workspace-links-'));
  try {
    await symlink('/etc', join(root, 'outside'));
    await assert.rejects(prepareWorkspace(root, {}), /regular files only/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('container checks install workspace bins and execute temporary tools', { skip: !process.env.LIGHTHOUSE_TEST_IMAGE }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'workspace-checks-'));
  const workspace = join(root, 'source');
  const image = process.env.LIGHTHOUSE_TEST_IMAGE;
  const config = { image, uid: 20003 };
  try {
    await mkdir(join(workspace, 'packages/tool'), { recursive: true });
    await writeFile(join(workspace, 'package.json'), JSON.stringify({ name: 'workspace-check', private: true, workspaces: ['packages/*'] }));
    await writeFile(join(workspace, 'packages/tool/package.json'), JSON.stringify({ name: 'workspace-tool', version: '1.0.0', bin: { 'workspace-tool': 'tool.js' } }));
    await writeFile(join(workspace, 'packages/tool/tool.js'), '#!/usr/bin/env node\nconsole.log("workspace tool ran");\n');
    execFileSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: workspace, stdio: 'pipe' });
    const checks = [
      ['npm', 'ci', '--ignore-scripts'],
      ['./node_modules/.bin/workspace-tool'],
      ['node', '-e', 'const {execFileSync:git}=require("node:child_process"); const assert=require("node:assert/strict"); assert.equal(git("git",["branch","--show-current"],{encoding:"utf8"}).trim(),"fix/53-validation"); assert.equal(git("git",["rev-list","--all","--count"],{encoding:"utf8"}).trim(),"1"); assert.equal(git("git",["remote"],{encoding:"utf8"}).trim(),""); assert.equal(require("node:fs").existsSync(".git/hooks"),false);'],
      ['node', '-e', 'require("node:fs").writeFileSync("/tmp/tool", "#!/bin/sh\\nexit 0\\n", {mode:0o755}); require("node:child_process").execFileSync("/tmp/tool");'],
    ];
    const receipt = await runImplementationChecks({ config, request: { issue: 53, runId: 'workspace-test', sourceRevision: 'test', implementation: { policy: { checks } } }, changes: [], workspace, output: join(root, 'output'), name: `workspace-test-${process.pid}`, redact: text => text, cancelled: () => false });
    assert.deepEqual(receipt.checks.map(check => check.exitCode), [0, 0, 0, 0]);
  } finally {
    execFileSync('docker', ['run', '--rm', '--network', 'none', '--user', '0:0', '--mount', `type=bind,src=${root},dst=/cleanup`, '--entrypoint', 'chown', image, '-R', `${process.getuid()}:${process.getgid()}`, '/cleanup']);
    await rm(root, { recursive: true, force: true });
  }
});
