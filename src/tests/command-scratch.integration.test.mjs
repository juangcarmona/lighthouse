import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const image = process.env.LIGHTHOUSE_TEST_SCRATCH_IMAGE;
const root = fileURLToPath(new URL('../../', import.meta.url));
const docker = (args, options = {}) => execFileSync('docker', args, { encoding: 'utf8', timeout: 900000, maxBuffer: 20 * 1024 * 1024, ...options });

test('cold npm installation releases downloads before real .NET verification in private 2 GiB scratch', { skip: !image, timeout: 1800000 }, async () => {
  assert.match(image, /^sha256:[a-f0-9]{64}$/);
  const name = 'lighthouse-scratch-' + randomBytes(8).toString('hex');
  const output = await mkdtemp(join(tmpdir(), name + '-'));
  await mkdir(join(output, 'receipts'), { mode: 0o777 });
  // The execution UID writes only this disposable diagnostics directory.
  await chmod(output, 0o755);
  await chmod(join(output, 'receipts'), 0o777);
  const receipts = [], logs = {}, ids = ['local-install', 'local-dotnet', 'independent-dotnet'];
  let passed = false;
  const capture = (phase, args) => {
    try { return logs[phase] = docker(args); }
    catch (error) { logs[phase] = String(error.stdout ?? '') + String(error.stderr ?? ''); console.error(logs[phase]); throw error; }
  };
  try {
    docker(['volume', 'create', name]);
    docker(['volume', 'create', name + '-harness']);
    const source = execFileSync('tar', ['--exclude=node_modules', '--exclude=bin', '--exclude=obj', '-C', root, '-cf', '-', 'package.json', 'package-lock.json', 'src'], { maxBuffer: 100 * 1024 * 1024 });
    docker(['run', '--rm', '-i', '--user', '0:0', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--cap-add', 'CHOWN', '--security-opt', 'no-new-privileges', '--mount', `type=volume,src=${name},dst=/workspace`, '--mount', `type=volume,src=${name}-harness,dst=/harness`, '--entrypoint', 'sh', image, '-ec', 'tar --no-same-owner --no-same-permissions -xf - -C /workspace && cp -R /workspace/src/packages/sdlc/. /harness/ && chown -R 20003:20003 /workspace /harness'], { input: source });
    const args = ['run', '--rm', '--init', '--name', name, '--user', '20003:20003', '--cpus', '2', '--memory', '4g', '--pids-limit', '1024', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only', '--tmpfs', '/tmp:rw,exec,size=2g,mode=1777', '--env', 'HOME=/tmp', '--env', 'CI=true', '--env', 'TMPDIR=/tmp', '--env', 'LIGHTHOUSE_COMMAND_NPM_CACHE=1', '--env', 'XDG_CACHE_HOME=/tmp/cache', '--env', 'NODE_DISABLE_COMPILE_CACHE=1', '--env', 'DOTNET_CLI_HOME=/tmp/dotnet', '--env', 'NUGET_PACKAGES=/tmp/nuget-packages', '--env', 'DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1', '--env', 'DOTNET_NOLOGO=1', '--env', 'DOTNET_CLI_TELEMETRY_OPTOUT=1', '--mount', `type=volume,src=${name},dst=/workspace`, '--mount', `type=volume,src=${name}-harness,dst=/harness,readonly`, '--mount', `type=bind,src=${output}/receipts,dst=/diagnostics`, '--workdir', '/workspace', '--entrypoint', 'sh', image, '-ec'];
    const command = (id, command) => `node /harness/src/managed-command.mjs run /diagnostics ${id} -- sh -ec '${command}'`;
    const install = 'npm ci --ignore-scripts && du -sk "$NPM_CONFIG_CACHE" /tmp && df -k /tmp';
    const verify = 'npm run verify:dotnet && du -sk /tmp && df -k /tmp';
    capture('localLog', [...args, command('local-install', install) + ' && ' + command('local-dotnet', verify)]);
    // A new container gives the independent verifier fresh private scratch.
    capture('independentLog', [...args, command('independent-dotnet', verify)]);
    for (const id of ids) {
      const receipt = JSON.parse(await readFile(join(output, 'receipts', id + '.json'), 'utf8'));
      assert.equal(receipt.exitCode, 0, id);
      assert.equal(receipt.scratch.npmCache, 'released', id);
      assert.equal(receipt.scratch.afterCleanup.capacityBytes, 2 * 1024 ** 3, id);
      assert.equal(receipt.resources.oomKills, 0, id);
      receipts.push({ id, ...receipt });
    }
    assert.ok(receipts[0].scratch.afterCleanup.availableBytes > receipts[0].scratch.beforeCleanup.availableBytes, 'actual npm downloads were reclaimed');
    passed = true;
  } finally {
    try {
      const retained = [];
      for (const id of ids) {
        try { retained.push({ id, ...JSON.parse(await readFile(join(output, 'receipts', id + '.json'), 'utf8')) }); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
      if (process.env.LIGHTHOUSE_SCRATCH_EVIDENCE) await writeFile(process.env.LIGHTHOUSE_SCRATCH_EVIDENCE, JSON.stringify({ image, passed, receipts: retained, ...logs }, null, 2) + '\n');
    } finally {
      try { docker(['rm', '-f', name], { stdio: 'ignore' }); } catch { /* --rm normally already removed this test-owned container. */ }
      docker(['volume', 'rm', name, name + '-harness']);
      await rm(output, { recursive: true, force: true });
    }
  }
});
