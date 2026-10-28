// gh-aw engine adapter: one foreground container and optional host-owned test services.
import { readFile, writeFile, appendFile, mkdir, mkdtemp, readdir, copyFile, chmod, rm, lstat } from 'node:fs/promises';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { openSync, closeSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { sourceFiles, collectChanges, materializeCandidate, validateChanges, changesDigest } from './implementation.mjs';
import { prepareImplementationWorkspace, copyEvidence, runImplementationChecks } from './implementation-runtime.mjs';
import { validateStageEnvelope } from './host-contract.mjs';
import { formatOpenCodeEvent, progressText, boundedEventLines } from './opencode-progress.mjs';
import { selectEnvironment, startEnvironment, environmentArgs, environmentReceipt, redactEnvironmentLog } from './execution-environment.mjs';
import { resolveModelProfile, modelExecutionReceipt } from './model-profiles.mjs';
import { executionLimits, resourceArgs, imageCommand, executionReceipt, executionFailure } from './execution-resources.mjs';

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
    await mkdir(dirname(target), { recursive: true }); await copyFile(source, target); await chmod(target, stat.mode & 0o111 ? 0o555 : 0o444);
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
  // Sequential workers share the runner temp directory; only this stage's outputs may survive.
  for (const file of ['envelope.json', 'runtime.json', 'changes.json', 'checks.json', 'engine-error.json']) await rm(join(runDir, file), { force: true });
  const limits = executionLimits(config, request.stage === 'implement');
  let projectModels = null;
  try {
    const directory = join(env.GITHUB_WORKSPACE, '.lighthouse'), directoryStat = await lstat(directory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw Error('Invalid project model configuration directory');
    const path = join(directory, 'models.json'), stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536) throw Error('Invalid project model configuration file');
    projectModels = JSON.parse(await readFile(path, 'utf8'));
  }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const modelSelection = resolveModelProfile({ project: projectModels, operator: config, worker: env.LIGHTHOUSE_WORKER ?? request.stage, ...(env.LIGHTHOUSE_MODEL_PROFILE ? { profile: env.LIGHTHOUSE_MODEL_PROFILE } : {}) });
  const selected = request.stage === 'implement' ? selectEnvironment(config, request.implementation?.environment) : null;
  if (request.stage === 'implement') {
    if (selected) config.implementationImage = selected.image;
    if (!/^sha256:[a-f0-9]{64}$/.test(config.implementationImage ?? '')) throw Error('Operator must provision and pin an implementation image');
    config.image = config.implementationImage;
  }
  if (!/^[a-f0-9]{64}$/.test(request.runId)) throw Error('Invalid execution identity');
  const dir = await mkdtemp(join(env.RUNNER_TEMP, 'lighthouse-engine-'));
  await chmod(dir, 0o755);
  const source = join(dir, 'source'), output = join(dir, 'output');
  await mkdir(source); await mkdir(output); await chmod(output, 0o777);
  const implementing = request.stage === 'implement';
  const name = `lighthouse-engine-${request.runId}`;
  const docker = args => execFileSync('docker', args, { stdio: 'ignore', timeout: 30000 });
  let child, timer, heartbeat, slot, baseline, trackedSource, runtime, cancelled = false, stopReason = null;
  const cancel = (reason = 'cancelled') => { cancelled = true; stopReason ??= reason; child?.kill('SIGTERM'); try { docker(['rm', '-f', name, `${name}-checks`]); } catch {} };
  const onSignal = () => cancel();
  process.once('SIGTERM', onSignal); process.once('SIGINT', onSignal);
  try {
    console.log('Waiting for the operator host engine slot');
    slot = acquireEngineSlot(config.lock);
    runtime = await startEnvironment({ selected, name: `${name}-agent`, uid: config.uid });
    if (cancelled) throw Error('Execution cancelled before agent startup');
    console.log('Engine slot acquired; starting isolated OpenCode');
    await snapshotSource(env.GITHUB_WORKSPACE, source);
    baseline = implementing ? await sourceFiles(source) : null;
    trackedSource = baseline ? new Map(baseline) : null;
    if (implementing) {
      if (request.seedDigest) {
        const seed = validateChanges(JSON.parse(await readFile(join(runDir, 'seed.json'), 'utf8')), request.implementation.policy);
        if (changesDigest(seed) !== request.seedDigest) throw Error('Seed artifact identity mismatch');
        for (const file of seed) if (file.content !== null) trackedSource.set(file.path, {});
        await rm(source, { recursive: true, force: true }); await mkdir(source);
        await materializeCandidate(baseline, seed, source);
      }
      await prepareImplementationWorkspace(source, config, request.issue);
    }
    const context = join(dir, 'context.json');
    await copyFile(join(runDir, 'context.json'), context); await chmod(context, 0o444);
    const prompt = join(dir, 'prompt.txt');
    const completionBoundary = '\n\n# Completion in this custom engine adapter\nThe trusted host, outside this container, records the gh-aw terminal noop after validating /output/envelope.json. The safeoutputs CLI and /tmp/gh-aw/agent instructions describe host duties in this integration. Their absence inside the engine is expected, not an unavailable product check. Read /harness/skills/concise-results/SKILL.md when writing effect.body. Write the envelope and stop; do not install or invoke safeoutputs.\n';
    await writeFile(prompt, await readFile(env.GH_AW_PROMPT, 'utf8') + completionBoundary, { mode: 0o444 });
    const harness = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const pkg = JSON.parse(await readFile(join(harness, 'package.json'), 'utf8'));
    const runtimeReceipt = { package: { name: pkg.name, version: pkg.version }, harnessRevision: execFileSync('git', ['-C', harness, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), image: config.image, limits, environment: environmentReceipt(selected), model: modelSelection.model, modelExecution: modelExecutionReceipt(modelSelection), engine: 'OpenCode 2.1.0', isolation: 'Docker; no AWF egress filtering', skills: await readdir(join(harness, 'skills')), sourceRevision: request.sourceRevision, seed: request.implementation?.policy.seed ?? null, seedDigest: request.seedDigest ?? null };
    await writeFile(join(runDir, 'runtime.json'), JSON.stringify(runtimeReceipt));
    const command = imageCommand(config.image);
    const args = ['run', '--rm', '--init', '--name', name, '--user', `${config.uid}:${config.uid}`, ...resourceArgs(limits), '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
      '--tmpfs', '/tmp:rw,exec,size=1g,mode=1777', '--tmpfs', `/home/engine/.cache:rw,size=1g,uid=${config.uid},gid=${config.uid}`, '--tmpfs', `/home/engine/.config:rw,size=16m,uid=${config.uid},gid=${config.uid}`, '--tmpfs', `/home/engine/.local/state:rw,size=64m,uid=${config.uid},gid=${config.uid}`,
      '--mount', `type=bind,src=${source},dst=/workspace${implementing ? '' : ',readonly'}`, '--mount', `type=bind,src=${output},dst=/output`, '--mount', `type=bind,src=${context},dst=/input/context.json,readonly`, '--mount', `type=bind,src=${prompt},dst=/input/prompt.txt,readonly`, '--mount', `type=bind,src=${harness},dst=/harness,readonly`,
      '--mount', `type=volume,src=${config.authVolume},dst=/home/engine/.local/share/opencode`, '--env', `ENGINE_SESSION=ses_${request.runId}`, '--env', `ENGINE_MODEL=${modelSelection.engineModel}`, '--env', `ENGINE_STAGE=${request.stage}`, '--env', 'NPM_CONFIG_CACHE=/tmp/npm-cache', '--env', 'PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright', ...environmentArgs(runtime), '--entrypoint', 'node', config.image, '/harness/src/managed-command.mjs', 'run', '/output/execution', 'engine', '--', ...command];
    const eventsPath = join(env.RUNNER_TEMP, 'gh-aw', `opencode-events-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}.jsonl`);
    await mkdir(dirname(eventsPath), { recursive: true });
    await writeFile(eventsPath, '', { mode: 0o600 });
    const started = Date.now();
    let lastVisible = started, engineError = false;
    const redact = text => redactLog(redactEnvironmentLog(runtime, text));
    const report = text => { lastVisible = Date.now(); console.log(redact(text)); };
    const eventLine = line => {
      const redacted = redact(line);
      try { if (JSON.parse(redacted).type === 'error') engineError = true; } catch {}
      appendFileSync(eventsPath, redacted + '\n');
      const visible = formatOpenCodeEvent(redacted);
      if (visible) report(visible);
    };
    report(progressText('Run', `${request.stage} for issue #${request.issue}. Public progress and tool activity appear below; structured events are retained as an artifact.`));
    heartbeat = setInterval(() => {
      if (Date.now() - lastVisible >= 30000) report(progressText('Run', `OpenCode is still running (${Math.floor((Date.now() - started) / 1000)}s elapsed). No new public update; waiting for the next event.`));
    }, 10000);
    const exit = await new Promise((ok, no) => {
      child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      const consume = line => {
        try {
          eventLine(line);
        } catch (error) { no(error); cancel(); }
      };
      // Keep line boundaries across chunks so credential shapes cannot bypass redaction.
      for (const stream of [child.stdout, child.stderr]) {
        const lines = boundedEventLines(consume, () => {
          eventLine(JSON.stringify({ type: 'diagnostic_omitted', reason: 'Event exceeded the 8 MiB character limit' }));
          report(progressText('Run', 'One oversized diagnostic event was omitted. Execution continues; candidate files are collected separately.'));
        });
        stream.setEncoding('utf8');
        stream.on('data', chunk => { if (!cancelled) lines.write(chunk); });
        stream.on('end', () => { if (!cancelled) lines.end(); });
      }
      child.on('error', () => ok({ code: 127, signal: null })); child.on('close', (code, signal) => ok({ code, signal }));
      timer = setTimeout(() => cancel('timeout'), implementing ? 1800000 : 600000);
    });
    runtimeReceipt.execution = await executionReceipt(join(output, 'execution/engine.json'), exit, stopReason);
    await writeFile(join(runDir, 'runtime.json'), JSON.stringify(runtimeReceipt));
    if (exit.code !== 0 || cancelled || runtimeReceipt.execution.status !== 'passed') throw Error(executionFailure(runtimeReceipt.execution));
    if (engineError) throw Error('OpenCode reported an execution error; no model fallback attempted');
    const result = join(output, 'envelope.json'), stat = await lstat(result);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 128000) throw Error('Invalid engine result file');
    const envelope = JSON.parse(await readFile(result, 'utf8'));
    clearTimeout(timer);
    completionOutput(envelope, request);
    if (implementing) {
      const changes = collectChanges(baseline, await sourceFiles(source, trackedSource), request.implementation.policy);
      await writeFile(join(runDir, 'changes.json'), JSON.stringify(changes));
      await copyEvidence(join(output, 'evidence'), join(runDir, 'evidence', 'agent'));
      const candidate = join(dir, 'candidate'); await mkdir(candidate);
      await materializeCandidate(baseline, changes, candidate);
      const checkBaseline = await sourceFiles(candidate);
      if (runtime.cleanup() === false) throw Error('Agent test service cleanup failed; operator action required');
      const receipt = await runImplementationChecks({ config, request, changes, workspace: candidate, output: join(runDir, 'evidence', 'host'), name, redact: redactLog, cancelled: () => cancelled, selected });
      if (collectChanges(checkBaseline, await sourceFiles(candidate, checkBaseline), request.implementation.policy).length) { receipt.checks.at(-1).exitCode = 1; receipt.checks.at(-1).reason = 'Checks modified source; candidate not validated'; }
      await writeFile(join(runDir, 'checks.json'), JSON.stringify(receipt));
      if (request.implementation.policy.reviewRequired) {
        envelope.result.status = 'blocked';
        envelope.result.pendingReview.push('Repository policy requires owner acceptance of this candidate; engine assertions cannot grant it.');
      }
      if (!changes.length && envelope.result.status === 'passed') { envelope.result.status = 'blocked'; envelope.result.missingEvidence.push('No implementation changes were returned'); }
      if (receipt.checks.some(c => c.exitCode !== 0)) {
        envelope.result.status = 'blocked';
        envelope.result.missingEvidence.push('The independent host checks did not all pass; inspect checks.json and host logs.');
        envelope.effect.body += '\n\nIndependent host checks failed. This candidate requires corrections before completion.';
      }
      if (cancelled) throw Error('Implementation cancelled before publication');
    }
    const completion = completionOutput(envelope, request);
    report(progressText('Result', redactLog(envelope.effect.body)));
    report(progressText('Run', `Validated outcome: ${envelope.result.status}. The publisher will recheck authority before updating the issue.`));
    await writeFile(join(runDir, 'envelope.json'), JSON.stringify(envelope));
    // gh-aw requires a terminal safe output even when a separate job owns publication.
    await mkdir(dirname(env.GH_AW_SAFE_OUTPUTS), { recursive: true });
    await writeFile(env.GH_AW_SAFE_OUTPUTS, JSON.stringify(completion) + '\n');
  } catch (error) {
    if (implementing && baseline) {
      try {
        try { docker(['rm', '-f', name, `${name}-checks`]); } catch {}
        const changes = collectChanges(baseline, await sourceFiles(source, trackedSource), request.implementation.policy);
        await writeFile(join(runDir, 'changes.json'), JSON.stringify(changes));
        await copyEvidence(join(output, 'evidence'), join(runDir, 'evidence', 'agent'));
        console.error(progressText('Recovery', 'Retained bounded candidate changes and available evidence. This failed run cannot publish a PR.'));
      } catch (recoveryError) { console.error(progressText('Recovery', redactLog(`Candidate could not be retained: ${recoveryError.message}`))); }
    }
    throw error;
  } finally {
    clearTimeout(timer); clearInterval(heartbeat); process.removeListener('SIGTERM', onSignal); process.removeListener('SIGINT', onSignal);
    try { docker(['rm', '-f', name, `${name}-checks`]); } catch {}
    runtime?.cleanup();
    try { docker(['run', '--rm', '--network', 'none', '--user', `${config.uid}:${config.uid}`, '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--mount', `type=volume,src=${config.authVolume},dst=/home/engine/.local/share/opencode`, config.image, 'cleanup-session', `ses_${request.runId}`]); } catch { console.error('Session cleanup failed; operator inspection required'); }
    if (slot !== undefined) closeSync(slot);
    // Read-only stages also create engine-owned command receipt directories.
    try { docker(['run', '--rm', '--network', 'none', '--user', '0:0', '--cap-drop', 'ALL', '--cap-add', 'CHOWN', '--security-opt', 'no-new-privileges', '--mount', `type=bind,src=${dir},dst=/cleanup`, '--entrypoint', 'chown', config.image, '-R', `${process.getuid()}:${process.getgid()}`, '/cleanup']); } catch { console.error('Workspace ownership cleanup failed; operator inspection required'); }
    await rm(dir, { recursive: true, force: true });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(async error => {
  const message = redactLog(error.message);
  console.error(progressText('Engine error', message));
  try { await writeFile(join(process.env.RUNNER_TEMP, `lighthouse-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`, 'engine-error.json'), JSON.stringify({ schemaVersion: 1, message: message.slice(0, 3000) })); } catch {}
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### Execution failed\n\n${message.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}\n\nInspect runtime.json and the retained engine events before retrying.\n`); } catch {}
  }
  process.exitCode = 1;
});
