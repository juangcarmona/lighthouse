import { chmod, mkdir, writeFile, readdir, lstat, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { changesDigest } from './implementation.mjs';
import { startEnvironment, environmentArgs, environmentReceipt, redactEnvironmentLog } from './execution-environment.mjs';
import { executionLimits, resourceArgs, executionReceipt, executionFailure } from './execution-resources.mjs';
import { fileURLToPath } from 'node:url';

export async function writableTree(root) {
  await chmod(root, 0o777);
  for (const item of await readdir(root, { withFileTypes: true })) {
    const path = join(root, item.name);
    if (item.isDirectory()) await writableTree(path);
    else if (item.isFile()) await chmod(path, (await lstat(path)).mode & 0o111 ? 0o777 : 0o666);
    else throw Error('Workspace must contain regular files only');
  }
}
export async function prepareWorkspace(root, config) {
  await writableTree(root);
  // npm workspaces chmod linked executables; write permission alone is insufficient.
  execFileSync('docker', ['run', '--rm', '--network', 'none', '--user', '0:0', '--cap-drop', 'ALL', '--cap-add', 'CHOWN', '--security-opt', 'no-new-privileges', '--read-only', '--mount', `type=bind,src=${root},dst=/workspace`, '--entrypoint', 'chown', config.image, '-R', `${config.uid}:${config.uid}`, '/workspace'], { stdio: 'inherit', timeout: 30000 });
}
export async function prepareImplementationWorkspace(workspace, config) {
  await writableTree(workspace);
  // Candidate-only Git metadata supports repository checks without copying checkout credentials or hooks.
  await mkdir(join(workspace, '.git'));
  const git = args => execFileSync('git', ['-C', workspace, '-c', 'core.hooksPath=/dev/null', ...args], {
    env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 'Lighthouse validation', GIT_AUTHOR_EMAIL: 'validation@localhost', GIT_COMMITTER_NAME: 'Lighthouse validation', GIT_COMMITTER_EMAIL: 'validation@localhost' }, stdio: 'pipe',
  });
  git(['init', '--template=', '--initial-branch=validation']);
  git(['add', '--force', '--all']);
  git(['commit', '--allow-empty', '-m', 'Candidate snapshot; repository history is checked separately']);
  await prepareWorkspace(workspace, config);
}
export async function copyEvidence(source, destination) {
  let bytes = 0, count = 0;
  async function visit(dir, relative = '') {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, item.name), name = join(relative, item.name), stat = await lstat(path);
      if (stat.isSymbolicLink() || !stat.isFile() && !stat.isDirectory()) throw Error('Unsafe evidence member');
      if (stat.isDirectory()) await visit(path, name);
      else {
        bytes += stat.size; count++;
        if (bytes > 32 * 1024 * 1024 || count > 200) throw Error('Evidence exceeds 200 files or 32 MiB');
        await mkdir(dirname(join(destination, name)), { recursive: true }); await copyFile(path, join(destination, name));
      }
    }
  }
  try { await lstat(source); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  await visit(source);
}
export async function runImplementationChecks({ config, request, changes, workspace, output, name, redact, cancelled, selected = null }) {
  await prepareImplementationWorkspace(workspace, config);
  const limits = executionLimits(config);
  const harness = fileURLToPath(new URL('../', import.meta.url));
  const receipt = { runId: request.runId, sourceRevision: request.sourceRevision, changesDigest: changesDigest(changes), image: config.image, limits, environment: environmentReceipt(selected), checks: [] };
  const deadline = Date.now() + 600000;
  await mkdir(output, { recursive: true });
  await chmod(output, 0o777);
  const runtime = await startEnvironment({ selected, name: `${name}-validation`, uid: config.uid });
  const originalRedact = redact;
  redact = text => originalRedact(redactEnvironmentLog(runtime, text));
  try {
    for (let i = 0; i < request.implementation.policy.checks.length; i++) {
      const command = request.implementation.policy.checks[i];
      const remaining = deadline - Date.now();
      if (cancelled() || remaining <= 0) { receipt.checks.push({ command, exitCode: 124 }); continue; }
      console.log(`Host check ${i + 1}: ${command.join(' ')}`);
      let log = '', pending = '';
      const args = ['run', '--rm', '--init', '--name', `${name}-checks`, '--user', `${config.uid}:${config.uid}`, ...resourceArgs(limits), '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only', '--tmpfs', '/tmp:rw,exec,size=1g,mode=1777', '--env', 'HOME=/tmp', '--env', 'CI=true', '--env', 'PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright', ...environmentArgs(runtime), '--mount', `type=bind,src=${workspace},dst=/workspace`, '--mount', `type=bind,src=${harness},dst=/harness,readonly`, '--mount', `type=bind,src=${output},dst=/diagnostics`, '--workdir', '/workspace', '--entrypoint', 'node', config.image, '/harness/src/managed-command.mjs', 'run', '/diagnostics', `check-${i + 1}`, '--', ...command];
      let reason = null;
      const exit = await new Promise(resolve => {
        const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const stop = why => { if (reason) return; reason = why; child.kill('SIGTERM'); spawn('docker', ['rm', '-f', `${name}-checks`], { stdio: 'ignore' }); };
        const timer = setTimeout(() => stop('timeout'), remaining);
        const cancellation = setInterval(() => { if (cancelled()) stop('cancelled'); }, 100);
        const consume = chunk => {
          pending += chunk;
          let end;
          while ((end = pending.indexOf('\n')) >= 0) {
            const line = redact(pending.slice(0, end)); pending = pending.slice(end + 1);
            if (log.length < 512000) { log += line + '\n'; console.log(`[Check] ${line.slice(0, 1000)}`); }
          }
          if (pending.length > 65536) pending = '[oversized check log line omitted]\n';
        };
        for (const stream of [child.stdout, child.stderr]) { stream.setEncoding('utf8'); stream.on('data', consume); }
        const complete = (code, signal = null) => { clearTimeout(timer); clearInterval(cancellation); resolve({ code, signal }); };
        child.on('error', () => complete(127));
        child.on('close', complete);
      });
      log += redact(pending).slice(0, 65536);
      await writeFile(join(output, `check-${i + 1}.log`), log);
      const execution = await executionReceipt(join(output, `check-${i + 1}.json`), exit, reason);
      const exitCode = execution.status === 'passed' ? 0 : exit.code || 1;
      receipt.checks.push({ command, exitCode, execution });
      console.log(`Host check ${i + 1}: ${exitCode === 0 ? 'passed' : executionFailure(execution)}`);
      if (exitCode !== 0) {
        for (const skipped of request.implementation.policy.checks.slice(i + 1)) receipt.checks.push({ command: skipped, exitCode: 125, reason: 'Not run after a failed check' });
        break;
      }
    }
  } finally { receipt.serviceCleanup = runtime.cleanup() !== false; }
  if (!receipt.serviceCleanup && receipt.checks.length) { receipt.checks.at(-1).exitCode = 1; receipt.checks.at(-1).reason = 'Environment cleanup failed; operator cleanup required'; }
  return receipt;
}
