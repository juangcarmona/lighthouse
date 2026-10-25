// gh-aw engine adapter: one foreground container, no service or orchestration state.
import { readFile, writeFile, mkdir, mkdtemp, readdir, copyFile, chmod, rm, lstat } from 'node:fs/promises';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { openSync, closeSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { validateStageEnvelope } from './host-contract.mjs';
import { formatOpenCodeEvent, progressText } from './opencode-progress.mjs';

export function completionOutput(envelope, request) {
  const errors = validateStageEnvelope(envelope, request);
  if (errors.length) throw Error(errors.join('\n'));
  if (!['passed', 'blocked'].includes(envelope.result.status)) throw Error('Stage did not complete');
  return { type: 'noop', message: `Lighthouse ${request.stage} result validated: ${envelope.result.status}. GitHub publication belongs to the separate publisher job.` };
}
export function redactLog(text) {
  return text.replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
    .replace(/\b(?:sk-|ghp_|github_pat_)[A-Za-z0-9_-]{15,}/g, '[REDACTED]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED]');
}
export async function snapshotSource(root, destination) {
  const files = execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  if (files.length > 5000) throw Error('Source snapshot exceeds file bound');
  let bytes = 0;
  for (const file of files) {
    if (file.split('/').some(part => part === '..' || part === '.git') || file.startsWith('/')) throw Error('Unsafe source path');
    const source = join(root, file), stat = await lstat(source);
    if (!stat.isFile() || stat.isSymbolicLink()) continue;
    bytes += stat.size;
    if (bytes > 32 * 1024 * 1024) throw Error('Source snapshot exceeds byte bound');
    const target = join(destination, file);
    await mkdir(dirname(target), { recursive: true }); await copyFile(source, target); await chmod(target, 0o444);
  }
}
export function acquireEngineSlot(path, seconds = 240) {
  if (!isAbsolute(path ?? '')) throw Error('Operator engine lock must be an absolute path');
  const fd = openSync(path, 'a', 0o600);
  try {
    // Linux flock belongs to the shared open file description, held until closeSync.
    execFileSync('flock', ['--exclusive', '--wait', String(seconds), '3'], { stdio: ['ignore', 'inherit', 'inherit', fd] });
    return fd;
  } catch { closeSync(fd); throw Error('Host engine capacity unavailable'); }
}
async function main() {
  const env = process.env;
  const config = JSON.parse(await readFile(env.LIGHTHOUSE_ENGINE_CONFIG, 'utf8'));
  if (!/^sha256:[a-f0-9]{64}$/.test(config.image) || !/^[\w-]+$/.test(config.authVolume) || !Number.isInteger(config.uid)) throw Error('Invalid operator engine configuration');
  const runDir = join(env.RUNNER_TEMP, `lighthouse-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`);
  const request = JSON.parse(await readFile(join(runDir, 'request.json'), 'utf8'));
  if (!/^[a-f0-9]{64}$/.test(request.runId)) throw Error('Invalid execution identity');
  const dir = await mkdtemp(join(env.RUNNER_TEMP, 'lighthouse-engine-'));
  await chmod(dir, 0o755);
  const source = join(dir, 'source'), output = join(dir, 'output');
  await mkdir(source); await mkdir(output); await chmod(output, 0o777);
  const name = `lighthouse-engine-${request.runId}`;
  const docker = args => execFileSync('docker', args, { stdio: 'ignore', timeout: 30000 });
  let child, timer, heartbeat, slot, cancelled = false;
  const cancel = () => { cancelled = true; child?.kill('SIGTERM'); try { docker(['rm', '-f', name]); } catch {} };
  process.once('SIGTERM', cancel); process.once('SIGINT', cancel);
  try {
    console.log('Waiting for the operator host engine slot');
    slot = acquireEngineSlot(config.lock);
    console.log('Engine slot acquired; starting isolated OpenCode');
    await snapshotSource(env.GITHUB_WORKSPACE, source);
    const context = join(dir, 'context.json');
    await copyFile(join(runDir, 'context.json'), context); await chmod(context, 0o444);
    const prompt = join(dir, 'prompt.txt');
    await writeFile(prompt, await readFile(env.GH_AW_PROMPT), { mode: 0o444 });
    const harness = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const pkg = JSON.parse(await readFile(join(harness, 'package.json'), 'utf8'));
    await writeFile(join(runDir, 'runtime.json'), JSON.stringify({ package: { name: pkg.name, version: pkg.version }, harnessRevision: execFileSync('git', ['-C', harness, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), image: config.image, model: config.model, engine: 'OpenCode 2.1.0', isolation: 'Docker; no AWF egress filtering', skills: await readdir(join(harness, 'skills')), sourceRevision: request.sourceRevision }));
    const args = ['run', '--rm', '--name', name, '--user', `${config.uid}:${config.uid}`, '--cpus', '2', '--memory', '2g', '--pids-limit', '128', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
      '--tmpfs', '/tmp:rw,size=256m,mode=1777', '--tmpfs', `/home/engine/.cache:rw,size=256m,uid=${config.uid},gid=${config.uid}`, '--tmpfs', `/home/engine/.config:rw,size=16m,uid=${config.uid},gid=${config.uid}`, '--tmpfs', `/home/engine/.local/state:rw,size=64m,uid=${config.uid},gid=${config.uid}`,
      '--mount', `type=bind,src=${source},dst=/workspace,readonly`, '--mount', `type=bind,src=${output},dst=/output`, '--mount', `type=bind,src=${context},dst=/input/context.json,readonly`, '--mount', `type=bind,src=${prompt},dst=/input/prompt.txt,readonly`, '--mount', `type=bind,src=${harness},dst=/harness,readonly`,
      '--mount', `type=volume,src=${config.authVolume},dst=/home/engine/.local/share/opencode`, '--env', `ENGINE_SESSION=ses_${request.runId}`, '--env', `ENGINE_MODEL=${config.model}`, config.image];
    const eventsPath = join(env.RUNNER_TEMP, 'gh-aw', 'opencode-events.jsonl');
    await mkdir(dirname(eventsPath), { recursive: true });
    await writeFile(eventsPath, '', { mode: 0o600 });
    const started = Date.now();
    let lastVisible = started;
    const report = text => { lastVisible = Date.now(); console.log(redactLog(text)); };
    const eventLine = line => {
      const redacted = redactLog(line);
      appendFileSync(eventsPath, redacted + '\n');
      const visible = formatOpenCodeEvent(redacted);
      if (visible) report(visible);
    };
    report(progressText('Run', `Refining issue #${request.issue}. Public progress and tool activity appear below; structured events are retained as an artifact.`));
    heartbeat = setInterval(() => {
      if (Date.now() - lastVisible >= 30000) report(progressText('Run', `OpenCode is still running (${Math.floor((Date.now() - started) / 1000)}s elapsed). No new public update; waiting for the next event.`));
    }, 10000);
    await new Promise((ok, no) => {
      child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      const consume = line => {
        try {
          if (line.length > 1024 * 1024) throw Error('Engine log line exceeds bound');
          eventLine(line);
        } catch (error) { no(error); cancel(); }
      };
      // Keep line boundaries across chunks so credential shapes cannot bypass redaction.
      for (const stream of [child.stdout, child.stderr]) {
        let pending = ''; stream.setEncoding('utf8');
        stream.on('data', chunk => { if (cancelled) return; pending += chunk; let end; while ((end = pending.indexOf('\n')) >= 0) { consume(pending.slice(0, end)); if (cancelled) return; pending = pending.slice(end + 1); } if (pending.length > 1024 * 1024) { no(Error('Engine log line exceeds bound')); cancel(); } });
        stream.on('end', () => { if (pending && !cancelled) consume(pending); });
      }
      child.on('error', no); child.on('close', code => code === 0 && !cancelled ? ok() : no(Error('OpenCode failed or was cancelled')));
      timer = setTimeout(cancel, 600000);
    });
    const result = join(output, 'envelope.json'), stat = await lstat(result);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 128000) throw Error('Invalid engine result file');
    const envelope = JSON.parse(await readFile(result, 'utf8'));
    const completion = completionOutput(envelope, request);
    report(progressText('Result', redactLog(envelope.effect.body)));
    report(progressText('Run', `Validated outcome: ${envelope.result.status}. The publisher will recheck authority before updating the issue.`));
    await writeFile(join(runDir, 'envelope.json'), JSON.stringify(envelope));
    // gh-aw requires a terminal safe output even when a separate job owns publication.
    await mkdir(dirname(env.GH_AW_SAFE_OUTPUTS), { recursive: true });
    await writeFile(env.GH_AW_SAFE_OUTPUTS, JSON.stringify(completion) + '\n');
  } finally {
    clearTimeout(timer); clearInterval(heartbeat); process.removeListener('SIGTERM', cancel); process.removeListener('SIGINT', cancel);
    try { docker(['rm', '-f', name]); } catch {}
    try { docker(['run', '--rm', '--network', 'none', '--user', `${config.uid}:${config.uid}`, '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--mount', `type=volume,src=${config.authVolume},dst=/home/engine/.local/share/opencode`, config.image, 'cleanup-session', `ses_${request.runId}`]); } catch { console.error('Session cleanup failed; operator inspection required'); }
    if (slot !== undefined) closeSync(slot);
    await rm(dir, { recursive: true, force: true });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(progressText('Engine error', redactLog(error.message))); process.exitCode = 1; });
