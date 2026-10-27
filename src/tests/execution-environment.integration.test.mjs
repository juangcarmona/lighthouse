import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { startEnvironment } from '../packages/sdlc/src/execution-environment.mjs';
import { runImplementationChecks } from '../packages/sdlc/src/implementation-runtime.mjs';

const image = process.env.LIGHTHOUSE_TEST_DOTNET_IMAGE;
const postgresImage = process.env.LIGHTHOUSE_TEST_POSTGRES_IMAGE;
const selected = { profile: 'dotnet', image, postgresImage };
const docker = args => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const absent = name => {
  assert.equal(docker(['ps', '-aq', '--filter', `name=^/${name}`]), '');
  assert.equal(docker(['network', 'ls', '-q', '--filter', `name=^${name}`]), '');
};

test('real PostgreSQL is fresh between phases and leaves no container or network', { skip: !image || !postgresImage }, async () => {
  const name = `lighthouse-real-environment-${process.pid}`;
  for (const phase of ['agent', 'validation']) {
    const runtime = await startEnvironment({ selected, name: `${name}-${phase}`, uid: 20003 });
    try {
      const sql = statement => docker(['exec', `${name}-${phase}-postgres`, 'psql', '-U', 'sofa', '-d', 'sofa', '-Atc', statement]);
      assert.equal(sql("select count(*) from information_schema.tables where table_name = 'previous_phase'"), '0');
      sql('create table previous_phase (id integer)');
    } finally { assert.equal(runtime.cleanup(), true); }
    absent(name);
  }
});

test('real host checks preserve failure and cancellation and clean services', { skip: !image || !postgresImage }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-environment-checks-'));
  try {
    for (const scenario of ['failure', 'cancel']) {
      const name = `lighthouse-real-${scenario}-${process.pid}`;
      const workspace = join(root, scenario);
      await mkdir(workspace);
      await writeFile(join(workspace, 'check.mjs'), scenario === 'failure' ? 'process.exit(7);' : 'setInterval(() => {}, 1000);');
      let cancelled = false, timer, isolation;
      if (scenario === 'cancel') timer = setInterval(() => {
        if (spawnSync('docker', ['inspect', '--format', '{{.State.Running}}', `${name}-checks`], { encoding: 'utf8' }).stdout?.trim() === 'true') {
          isolation = JSON.parse(docker(['inspect', `${name}-checks`]))[0];
          cancelled = true;
          spawnSync('docker', ['rm', '-f', `${name}-checks`], { stdio: 'ignore' });
          clearInterval(timer);
        }
      }, 200);
      try {
        const receipt = await runImplementationChecks({ config: { image, uid: 20003 }, request: { runId: name, sourceRevision: 'integration-test', implementation: { policy: { checks: [['node', 'check.mjs']] } } }, changes: [], workspace, output: join(root, `${scenario}-logs`), name, redact: text => text, cancelled: () => cancelled, selected });
        assert.equal(receipt.serviceCleanup, true);
        if (scenario === 'failure') assert.equal(receipt.checks[0].exitCode, 7);
        else {
          assert.equal(cancelled, true); assert.notEqual(receipt.checks[0].exitCode, 0);
          assert.equal(isolation.HostConfig.ReadonlyRootfs, true);
          assert.equal(isolation.Config.User, '20003:20003');
          assert.ok(isolation.Mounts.every(m => m.Type !== 'volume' && !m.Source.includes('docker.sock') && !m.Destination.includes('opencode')));
          assert.ok(isolation.HostConfig.CapDrop.includes('ALL'));
        }
        absent(name);
      } finally { clearInterval(timer); }
    }
  } finally {
    docker(['run', '--rm', '--network', 'none', '--user', '0:0', '--mount', `type=bind,src=${root},dst=/cleanup`, '--entrypoint', 'chown', image, '-R', `${process.getuid()}:${process.getgid()}`, '/cleanup']);
    await rm(root, { recursive: true, force: true });
  }
});
