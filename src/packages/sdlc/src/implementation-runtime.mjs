import { checkedCandidateTree } from './source-link-tree.mjs';
import { chmod, mkdir, writeFile, readdir, lstat, copyFile, mkdtemp, rename, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { changesDigest, sourceFiles } from './implementation.mjs';
import { sourceDigest } from './verification-integrity.mjs';
import { commandEvidenceBinding, retainedCommandOutput } from './implementation-evidence.mjs';
import { startEnvironment, environmentArgs, environmentReceipt, redactEnvironmentLog } from './execution-environment.mjs';
import { executionLimits, resourceArgs, executionReceipt, executionFailure } from './execution-resources.mjs';
import { fileURLToPath } from 'node:url';
import { ownedDockerArgs, runOwnedDocker } from './execution-cleanup.mjs';

export async function writableTree(root) {
  await chmod(root, 0o777);
  for (const item of await readdir(root, { withFileTypes: true })) {
    const path = join(root, item.name);
    if (item.isDirectory()) await writableTree(path);
    else if (item.isFile()) await chmod(path, (await lstat(path)).mode & 0o111 ? 0o777 : 0o666);
    else throw Error('Workspace must contain regular files only');
  }
}
export function restoreWorkspaceOwnership(root, config) {
  // Checks can create private directories; CHOWN alone cannot traverse another UID's tree.
  runOwnedDocker(config, ['run', '--rm', '--network', 'none', '--user', '0:0', '--cap-drop', 'ALL', '--cap-add', 'CHOWN', '--cap-add', 'DAC_OVERRIDE', '--security-opt', 'no-new-privileges', '--read-only', '--mount', `type=bind,src=${root},dst=/cleanup`, '--entrypoint', 'chown', config.image, '-R', `${process.getuid()}:${process.getgid()}`, '/cleanup'], { stdio: 'ignore', timeout: 30000 });
}
export async function prepareWorkspace(root, config) {
  await writableTree(root);
  // npm workspaces chmod linked executables; write permission alone is insufficient.
  runOwnedDocker(config, ['run', '--rm', '--network', 'none', '--user', '0:0', '--cap-drop', 'ALL', '--cap-add', 'CHOWN', '--security-opt', 'no-new-privileges', '--read-only', '--mount', `type=bind,src=${root},dst=/workspace`, '--entrypoint', 'chown', config.image, '-R', `${config.uid}:${config.uid}`, '/workspace'], { stdio: 'inherit', timeout: 30000 });
}
export function candidateOrigin(repository) {
  if (repository === undefined || repository === null) return null;
  if (typeof repository !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(repository) || repository.endsWith('/.') || repository.endsWith('/..')) throw Error('Invalid repository identity for candidate Git metadata');
  return `https://github.com/${repository}.git`;
}
export async function prepareImplementationWorkspace(workspace, config, issue, repository) {
  if (!Number.isSafeInteger(issue) || issue < 1) throw Error('Implementation workspace requires a positive issue number');
  const origin = candidateOrigin(repository);
  await writableTree(workspace);
  // Candidate-only Git metadata supports repository checks without copying checkout credentials or hooks.
  await mkdir(join(workspace, '.git'));
  const git = args => execFileSync('git', ['-C', workspace, '-c', 'core.hooksPath=/dev/null', ...args], {
    env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 'Lighthouse validation', GIT_AUTHOR_EMAIL: 'validation@localhost', GIT_COMMITTER_NAME: 'Lighthouse validation', GIT_COMMITTER_EMAIL: 'validation@localhost' }, stdio: 'pipe',
  });
  git(['init', '--template=', `--initial-branch=fix/${issue}-validation`]);
  // Disposable snapshots need stable metadata while ownership and permissions are prepared.
  git(['config', 'maintenance.auto', 'false']);
  git(['config', 'gc.auto', '0']);
  if (origin) git(['remote', 'add', 'origin', origin]);
  git(['add', '--force', '--all']);
  git(['commit', '--allow-empty', '-m', 'Candidate snapshot; repository history is checked separately']);
  await prepareWorkspace(workspace, config);
}
export async function copyEvidence(source, destination) {
  let bytes = 0, count = 0;
  const files = [];
  async function visit(dir, relative = '') {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, item.name), name = join(relative, item.name), stat = await lstat(path);
      if (stat.isSymbolicLink() || !stat.isFile() && !stat.isDirectory()) throw Error('Unsafe evidence member');
      if (stat.isDirectory()) await visit(path, name);
      else {
        bytes += stat.size; count++;
        if (count > 200) throw Error(`Evidence exceeds 200 files (${count} observed)`);
        if (bytes > 64 * 1024 * 1024) throw Error(`Evidence exceeds 64 MiB (${bytes} bytes observed)`);
        files.push({ path, name });
      }
    }
  }
  try {
    const stat = await lstat(source);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw Error('Unsafe evidence root');
  } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  await visit(source);
  await mkdir(dirname(destination), { recursive: true });
  const staging = await mkdtemp(join(dirname(destination), '.evidence-'));
  try {
    for (const { path, name } of files) {
      await mkdir(dirname(join(staging, name)), { recursive: true });
      await copyFile(path, join(staging, name));
    }
    await rename(staging, destination);
  } finally { await rm(staging, { recursive: true, force: true }); }
}

// Scratch belongs to the disposable container, never the retained evidence tree.
export const scratchArgs = ['--env', 'TMPDIR=/tmp', '--env', 'NPM_CONFIG_CACHE=/tmp/npm-cache', '--env', 'XDG_CACHE_HOME=/tmp/cache', '--env', 'NODE_DISABLE_COMPILE_CACHE=1'];
// A regular-file stdout prevents providers using process.exit() from truncating pending pipe writes.
const checkOutputCommand = 'node /harness/src/managed-command.mjs run /diagnostics "$@" > /tmp/lighthouse-check.log 2>&1; check_exit=$?; cat /tmp/lighthouse-check.log || exit 125; exit "$check_exit"';
export async function runImplementationChecks({ config, request, changes, workspace, output, name, redact, cancelled, selected = null, repository = request.repository, telemetry }) {
  const checkBaseline = await sourceFiles(workspace);
  await prepareImplementationWorkspace(workspace, config, request.issue, repository);
  const limits = executionLimits(config);
  const harness = fileURLToPath(new URL('../', import.meta.url));
  const receipt = { runId: request.runId, sourceRevision: request.sourceRevision, changesDigest: changesDigest(changes), image: config.image, limits, environment: environmentReceipt(selected), checks: [] };
  if (request.repository && request.workflowRunId && request.attempt && request.taskDigest) {
    receipt.schemaVersion = 2;
    receipt.binding = commandEvidenceBinding(request);
    receipt.candidateTree = await checkedCandidateTree(workspace, request.sourceLinks, request.sourceRevision);
    receipt.observedAt = new Date().toISOString();
  }
  await mkdir(output, { recursive: true });
  await chmod(output, 0o777);
  const runtime = await startEnvironment({ selected, image: config.image, commands: [['sh'], ...request.implementation.policy.checks], agent: false, name: `${name}-validation`, uid: config.uid, run: args => runOwnedDocker(config, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 }) });
  const originalRedact = redact;
  redact = text => originalRedact(redactEnvironmentLog(runtime, text));
  try {
    for (let i = 0; i < request.implementation.policy.checks.length; i++) {
      const deadline = Date.now() + 15 * 60_000;
      const command = request.implementation.policy.checks[i];
      const remaining = deadline - Date.now();
      if (cancelled() || remaining <= 0) { receipt.checks.push({ command, exitCode: 124 }); continue; }
      console.log(`Host check ${i + 1}: ${command.join(' ')}`);
      const checkStarted = Date.now(); telemetry?.emit('check.started', { callId: `check-${i + 1}`, status: 'running' });
      let log = '', pending = '', logTruncated = false;
      const args = ownedDockerArgs(config, ['run', '--rm', '--init', '--name', `${name}-checks`, '--user', `${config.uid}:${config.uid}`, ...resourceArgs(limits), '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only', '--tmpfs', '/tmp:rw,exec,size=2g,mode=1777', '--env', 'HOME=/tmp', '--env', 'CI=true', ...scratchArgs, '--env', 'PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright', ...environmentArgs(runtime), '--mount', `type=bind,src=${workspace},dst=/workspace`, '--mount', `type=bind,src=${harness},dst=/harness,readonly`, '--mount', `type=bind,src=${output},dst=/diagnostics`, '--workdir', '/workspace', '--entrypoint', 'sh', config.image, '-c', checkOutputCommand, 'lighthouse-check', `check-${i + 1}`, '--', ...command]);
      let reason = null;
      const exit = await new Promise(resolve => {
        const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const stop = why => { if (reason) return; reason = why; try { config.resourceOwner?.observe(); } catch {} child.kill('SIGTERM'); try { runOwnedDocker(config, ['rm', '-f', `${name}-checks`], { stdio: 'ignore', timeout: 30000 }); } catch {} };
        const timer = setTimeout(() => stop('timeout'), remaining);
        const cancellation = setInterval(() => { if (cancelled()) stop('cancelled'); }, 100);
        const consume = chunk => {
          pending += chunk;
          let end;
          while ((end = pending.indexOf('\n')) >= 0) {
            const line = redact(pending.slice(0, end)); pending = pending.slice(end + 1);
            if (log.length < 512000) { log += line + '\n'; console.log(`[Check] ${line.slice(0, 1000)}`); }
            else logTruncated = true;
          }
          if (pending.length > 65536) { pending = '[oversized check log line omitted]\n'; logTruncated = true; }
        };
        for (const stream of [child.stdout, child.stderr]) { stream.setEncoding('utf8'); stream.on('data', consume); }
        const complete = (code, signal = null) => { clearTimeout(timer); clearInterval(cancellation); if (Number.isInteger(code) && ![125, 126, 127].includes(code)) config.resourceOwner?.completed(args); resolve({ code, signal }); };
        child.on('error', () => complete(127));
        child.on('close', complete);
      });
      const tail = redact(pending);
      if (tail.length > 65536) logTruncated = true;
      log += tail.slice(0, 65536);
      await writeFile(join(output, `check-${i + 1}.log`), log);
      const execution = await executionReceipt(join(output, `check-${i + 1}.json`), exit, reason);
      const exitCode = execution.status === 'passed' ? 0 : exit.code || 1;
      const evidencePaths = [...changes.map(file => file.path), ...(request.implementation.proposal?.root ? [request.implementation.proposal.root + '/'] : [])];
      receipt.checks.push({ command, exitCode, execution, output: retainedCommandOutput(log, logTruncated, evidencePaths) });
      telemetry?.emit('check.ended', { callId: `check-${i + 1}`, exitCode, status: execution.status, durationMs: Date.now() - checkStarted, ...execution.resources });
      console.log(`Host check ${i + 1}: ${exitCode === 0 ? 'passed' : executionFailure(execution)}`);
      if (exitCode !== 0) {
        for (const skipped of request.implementation.policy.checks.slice(i + 1)) receipt.checks.push({ command: skipped, exitCode: 125, reason: 'Not run after a failed check' });
        break;
      }
    }
  } finally { receipt.serviceCleanup = runtime.cleanup() !== false; }
  if (sourceDigest(checkBaseline) !== sourceDigest(await sourceFiles(workspace, checkBaseline)) && receipt.checks.length) {
    receipt.checks.at(-1).exitCode = 1; receipt.checks.at(-1).reason = 'Checks modified source; candidate not validated';
  }
  if (!receipt.serviceCleanup && receipt.checks.length) { receipt.checks.at(-1).exitCode = 1; receipt.checks.at(-1).reason = 'Environment cleanup failed; operator cleanup required'; }
  if (receipt.schemaVersion === 2) receipt.observedAt = new Date().toISOString();
  return receipt;
}
