import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { config } from './fixtures/github-profile/provider.mjs';

const cli = process.env.LIGHTHOUSE_TEST_PACKED_CLI ?? new URL('../packages/cli/src/lighthouse.mjs', import.meta.url).pathname;
const fixture = new URL('./fixtures/github-profile/provider.mjs', import.meta.url).href;

test('CLI discovers opt-in adoption and runs authorized plan/apply/live verify without changing source files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-github-cli-'));
  const planDirectory = await mkdtemp(join(tmpdir(), 'lighthouse-github-plan-'));
  const planPath = join(planDirectory, 'plan.json');
  try {
    await mkdir(join(root, 'bin')); await mkdir(join(root, '.lighthouse'));
    const gh = join(root, 'bin/gh');
    await writeFile(gh, `#!/usr/bin/env node
import { readFile, writeFile, rename } from 'node:fs/promises';
import { github } from ${JSON.stringify(fixture)};
const api = github();
try { Object.assign(api.state, JSON.parse(await readFile(process.env.GH_FIXTURE_STATE, 'utf8'))); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const before = api.state.writes.length;
const args = process.argv.slice(2);
if (args[0] !== 'api' || args[1] !== '--hostname' || args[2] !== 'github.com') throw new Error('Unexpected API host.');
let input = ''; for await (const chunk of process.stdin) input += chunk;
try {
  const result = await api.request(args[5], args[4], input ? JSON.parse(input) : undefined);
  if (api.state.writes.length !== before) { const path = process.env.GH_FIXTURE_STATE + '.tmp'; await writeFile(path, JSON.stringify(api.state)); await rename(path, process.env.GH_FIXTURE_STATE); }
  if (result !== null) console.log(JSON.stringify(result));
} catch (e) { console.error('HTTP ' + (e.status ?? 500)); process.exitCode = 1; }
`);
    await chmod(gh, 0o755);
    const env = { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}`, GH_HOST: 'untrusted.invalid', GH_FIXTURE_STATE: join(root, 'provider.json') };
    const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, env, encoding: 'utf8' });
    assert.equal(run('init', '--name', 'Profile fixture').status, 0);
    const upgrade = JSON.parse(run('upgrade', '--format', 'json').stdout);
    assert.equal(upgrade.adoption.capabilities['github-profile'].status, 'available');
    assert.equal(upgrade.adoption.capabilities['github-profile'].selection, 'opt-in');
    assert.equal(run('capabilities', 'decline', '--id', 'github-profile').status, 0);
    assert.equal(run('verify').status, 0);
    await writeFile(join(root, '.lighthouse/github.json'), JSON.stringify(config()));
    await writeFile(join(root, 'authored.txt'), 'ongoing work');
    assert.equal(run('capabilities', 'select', '--id', 'github-profile').status, 0);
    const filesBefore = await readdir(join(root, '.lighthouse'), { recursive: true });
    const planned = run('capabilities', 'plan', '--id', 'github-profile', '--plan-file', planPath, '--format', 'json');
    assert.equal(planned.status, 0, planned.stderr);
    const plan = JSON.parse(await readFile(planPath, 'utf8'));
    assert.equal(run('capabilities', 'apply', '--plan-file', planPath, '--authorize', 'wrong').status, 1);
    await writeFile(env.GH_FIXTURE_STATE, JSON.stringify({ failures: { 'PATCH repos/example/project': 403 } }));
    const failed = run('capabilities', 'apply', '--plan-file', planPath, '--authorize', plan.authorization.planHash, '--format', 'json');
    assert.equal(failed.status, 1);
    assert.equal(JSON.parse(failed.stdout).status, 'failed');
    assert.deepEqual(JSON.parse(failed.stdout).completed, ['rules.main', 'rules.evidence']);
    assert.deepEqual(await readdir(join(root, '.lighthouse'), { recursive: true }), filesBefore);
    const partial = JSON.parse(await readFile(env.GH_FIXTURE_STATE, 'utf8')); partial.failures = {};
    await writeFile(env.GH_FIXTURE_STATE, JSON.stringify(partial));
    const applied = run('capabilities', 'apply', '--plan-file', planPath, '--authorize', plan.authorization.planHash, '--format', 'json');
    assert.equal(applied.status, 0, applied.stderr); assert.equal(JSON.parse(applied.stdout).status, 'passed');
    const live = run('capabilities', 'verify', '--id', 'github-profile', '--format', 'json');
    assert.equal(live.status, 0, live.stderr); assert.equal(JSON.parse(live.stdout).status, 'passed');
    assert.equal(await readFile(join(root, 'authored.txt'), 'utf8'), 'ongoing work');
    const local = JSON.parse(run('verify', '--format', 'json').stdout);
    assert.equal(local.results.find((item) => item.id === 'foundation.github-profile').status, 'unconfigured');
    assert.equal(JSON.parse(await readFile(join(root, '.lighthouse/upgrade.json'), 'utf8')).adoption['github-profile'].status, 'adopted');
    assert.equal(JSON.parse(await readFile(join(root, '.lighthouse/upgrade.json'), 'utf8')).adoption['github-profile'].recordPath, undefined);
    assert.deepEqual(await readdir(join(root, '.lighthouse'), { recursive: true }), filesBefore);
    const remote = JSON.parse(await readFile(join(root, 'provider.json'), 'utf8')); remote.repo.allow_auto_merge = false;
    await writeFile(join(root, 'provider.json'), JSON.stringify(remote));
    const drift = run('capabilities', 'verify', '--id', 'github-profile', '--format', 'json');
    assert.equal(drift.status, 1); assert.equal(JSON.parse(drift.stdout).status, 'drift');
    assert.equal(run('capabilities', 'plan', '--id', 'github-profile', '--repo', 'another/repository', '--plan-file', 'other.json').status, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(planDirectory, { recursive: true, force: true });
  }
});
