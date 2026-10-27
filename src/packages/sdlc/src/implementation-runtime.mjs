import { chmod, mkdir, writeFile, readdir, lstat, copyFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { changesDigest } from './implementation.mjs';

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
export async function runImplementationChecks({ config, request, changes, workspace, output, name, redact, cancelled }) {
  await prepareWorkspace(workspace, config);
  const receipt = { runId: request.runId, sourceRevision: request.sourceRevision, changesDigest: changesDigest(changes), checks: [] };
  const deadline = Date.now() + 600000;
  await mkdir(output, { recursive: true });
  for (let i = 0; i < request.implementation.policy.checks.length; i++) {
    const command = request.implementation.policy.checks[i];
    const remaining = deadline - Date.now();
    if (cancelled() || remaining <= 0) { receipt.checks.push({ command, exitCode: 124 }); continue; }
    console.log(`Host check ${i + 1}: ${command.join(' ')}`);
    let log = '', pending = '';
    const args = ['run', '--rm', '--init', '--name', `${name}-checks`, '--user', `${config.uid}:${config.uid}`, '--cpus', '2', '--memory', '4g', '--pids-limit', '256', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only', '--tmpfs', '/tmp:rw,exec,size=1g,mode=1777', '--env', 'HOME=/tmp', '--env', 'CI=true', '--env', 'PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright', '--mount', `type=bind,src=${workspace},dst=/workspace`, '--workdir', '/workspace', '--entrypoint', command[0], config.image, ...command.slice(1)];
    const exitCode = await new Promise(resolve => {
      const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      const timer = setTimeout(() => { child.kill('SIGTERM'); spawn('docker', ['rm', '-f', `${name}-checks`], { stdio: 'ignore' }); }, remaining);
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
      child.on('error', () => { clearTimeout(timer); resolve(127); });
      child.on('close', code => { clearTimeout(timer); resolve(code ?? 124); });
    });
    log += redact(pending).slice(0, 65536);
    await writeFile(join(output, `check-${i + 1}.log`), log);
    receipt.checks.push({ command, exitCode });
    console.log(`Host check ${i + 1} exit: ${exitCode}`);
  }
  return receipt;
}
