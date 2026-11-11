// gh-aw engine adapter: one foreground container and optional host-owned test services.
import { readFile, writeFile, appendFile, mkdir, mkdtemp, readdir, copyFile, chmod, rm, lstat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { closeSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn, execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { reviewOutputProtocol, reviewTemplate, reviewEnvelope } from './independent-review.mjs';
import { createRequire } from 'node:module';
import { synchronizedSource, synchronizationDigest } from './source-sync.mjs';
import { sourceFiles, collectChanges, isVerificationOnlyCorrection, materializeCandidate, validateChanges, changesDigest, withinScope } from './implementation.mjs';
import { candidateOrigin, prepareImplementationWorkspace, copyEvidence, runImplementationChecks, restoreWorkspaceOwnership, scratchArgs } from './implementation-runtime.mjs';
import { validateStageEnvelope } from './host-contract.mjs';
import { formatOpenCodeEvent, progressText, boundedEventLines } from './opencode-progress.mjs';
import { selectEnvironment, startEnvironment, environmentArgs, environmentReceipt, redactEnvironmentLog } from './execution-environment.mjs';
import { resolveModelProfile, modelExecutionReceipt } from './model-profiles.mjs';
import { executionLimits, resourceArgs, imageCommand, executionReceipt, executionFailure } from './execution-resources.mjs';
import { codegraphSelection, startCodegraph, stopCodegraph } from './codegraph-runtime.mjs';
import { createExecutionOwner, recoverExecutionOwners, ownedDockerArgs, runOwnedDocker } from './execution-cleanup.mjs';
import { harnessIdentity } from './harness-identity.mjs';
import { verificationIntegrity } from './verification-integrity.mjs';
import { implementationPlanMetadata, prepareImplementationPlanMetadata } from './implementation-plan.mjs';
import { acquireEngineSlot, engineSlotWaitSeconds } from './engine-slot.mjs';
export { acquireEngineSlot } from './engine-slot.mjs';
import { prepareProductEvidence, productModelDigest, productModelDirectory, loadProductCore } from './product-change.mjs';
import { createTelemetry, telemetryContext, readTelemetry } from './telemetry.mjs';
import { observeCli, collectNativeFile, usageSummary } from './telemetry-opencode.mjs';

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
export async function installProductEvidence(input, source, expectedBaseline) {
  const stat = await lstat(input);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('ProductShape evidence directory is unavailable or unsafe');
  const names = await readdir(input);
  if (!names.includes('index.json') || names.length > 513 || names.some(name => name !== 'index.json' && !/^[A-Z0-9][A-Z0-9-]{0,159}\.json$/.test(name))) throw Error('ProductShape evidence inventory is invalid');
  const index = JSON.parse(await readFile(join(input, 'index.json'), 'utf8'));
  if (index.schemaVersion !== 1 || index.source !== '@prodshape/core' || index.version !== '0.25.0' || expectedBaseline && index.baselineDigest !== expectedBaseline || !Array.isArray(index.artifacts) || index.artifacts.length !== names.length - 1 || new Set(index.artifacts.map(item => item.report)).size !== index.artifacts.length || index.artifacts.some(item => !names.includes(item.report) || item.report !== `${item.id}.json`)) throw Error('ProductShape evidence index is invalid');
  let bytes = 0;
  const destination = join(source, '.lighthouse-product-evidence');
  await mkdir(destination, { mode: 0o755 });
  for (const name of names) {
    const file = join(input, name), item = await lstat(file);
    if (!item.isFile() || item.isSymbolicLink() || item.size > 512 * 1024 || (bytes += item.size) > 17 * 1024 * 1024) throw Error('ProductShape evidence is unsafe or exceeds bounds');
    await copyFile(file, join(destination, name)); await chmod(join(destination, name), 0o444);
  }
}

export async function preparePlanningProductEvidence(source, runDir, { core, install = promisify(execFile), signal } = {}) {
  signal?.throwIfAborted();
  try { await lstat(join(source, '.product/config.yaml')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  try {
    const manifest = JSON.parse(await readFile(join(source, 'lighthouse.json'), 'utf8'));
    if (manifest.integrations?.productShape === null) return null;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!core) {
    const prefix = join(runDir, 'product-provider'), home = join(prefix, 'home');
    await mkdir(home, { recursive: true });
    const userConfig = join(home, 'user.npmrc'), globalConfig = join(home, 'global.npmrc');
    await writeFile(userConfig, '', { flag: 'wx' }); await writeFile(globalConfig, '', { flag: 'wx' });
    try {
      await install('npm', ['install', '--prefix', prefix, '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=true', '--save-exact', '--registry=https://registry.npmjs.org', '@prodshape/core@0.25.0'], {
        cwd: prefix, timeout: 60000, maxBuffer: 1024 * 1024, signal,
        env: { PATH: process.env.PATH, HOME: home, NPM_CONFIG_USERCONFIG: userConfig, NPM_CONFIG_GLOBALCONFIG: globalConfig, NPM_CONFIG_CACHE: join(home, 'cache'), CI: 'true' },
      });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw Error('ProductShape planning provider setup failed: ' + redactLog(String(error.stderr || error.message)).slice(0, 3000));
    }
    core = await loadProductCore({ entry: createRequire(join(prefix, 'package.json')).resolve('@prodshape/core') });
    await mkdir(join(runDir, 'evidence/host'), { recursive: true });
    await copyFile(join(prefix, 'package-lock.json'), join(runDir, 'evidence/host/product-provider-lock.json'));
  }
  signal?.throwIfAborted();
  const baselineDigest = await productModelDigest(source), reports = join(runDir, 'evidence/host/product-context');
  const result = await prepareProductEvidence(source, reports, core, { baselineDigest });
  signal?.throwIfAborted();
  await installProductEvidence(reports, source, baselineDigest);
  const evidence = { provider: '@prodshape/core', version: core.version, baselineDigest, artifacts: result.artifacts, acceptedModelPath: `/workspace/${await productModelDirectory(source)}`, evidenceRoot: '/workspace/.lighthouse-product-evidence' };
  const path = join(runDir, 'context.json'), context = JSON.parse(await readFile(path, 'utf8'));
  context.productEvidence = evidence;
  context.contract.rules += ' The host prepared current ProductShape inspect, impact and citation reports for this isolated baseline. Read context.productEvidence.evidenceRoot/index.json and the relevant reports for product discovery and current citation payloads. These read-only reports supply context; they grant no product approval, apply or scope expansion. An empty graph supplies no accepted product intent.';
  signal?.throwIfAborted();
  await writeFile(path, JSON.stringify(context));
  return evidence;
}
async function main() {
  const env = process.env;
  const config = JSON.parse(await readFile(env.LIGHTHOUSE_ENGINE_CONFIG, 'utf8'));
  if (!/^sha256:[a-f0-9]{64}$/.test(config.image) || !/^[\w-]+$/.test(config.authVolume) || !Number.isInteger(config.uid)) throw Error('Invalid operator engine configuration');
  const runDir = join(env.RUNNER_TEMP, `lighthouse-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`);
  const request = JSON.parse(await readFile(join(runDir, 'request.json'), 'utf8'));
  const telemetry = createTelemetry({ component: 'engine-adapter', context: telemetryContext(env, request) });
  process.once('exit', () => telemetry.close('interrupted'));
  telemetry.emit('execution.admitted', { status: 'admitted', model: config.model, modelSource: 'requested-configuration', image: config.image });
  let outcome = 'failed', nativeCollect = () => {}, nativeTimer;
  // Sequential workers share the runner temp directory; only this stage's outputs may survive.
  for (const file of ['envelope.json', 'runtime.json', 'changes.json', 'checks.json', 'engine-error.json']) await rm(join(runDir, file), { force: true });
  const reviewOutput = reviewOutputProtocol(request);
  const implementing = request.stage === 'implement' && request.worker !== 'product-change';
  const repository = request.repository ?? env.GITHUB_REPOSITORY;
  if (implementing) candidateOrigin(repository);
  const limits = executionLimits(config, implementing);
  let projectModels = null;
  try {
    const directory = join(env.GITHUB_WORKSPACE, '.lighthouse'), directoryStat = await lstat(directory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw Error('Invalid project model configuration directory');
    const path = join(directory, 'models.json'), stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536) throw Error('Invalid project model configuration file');
    projectModels = JSON.parse(await readFile(path, 'utf8'));
  }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const modelSelection = resolveModelProfile({ project: projectModels, operator: config, worker: env.LIGHTHOUSE_WORKER ?? request.stage, ...(request.modelSelection ? { executionSelection: request.modelSelection } : {}), ...(env.LIGHTHOUSE_MODEL_PROFILE ? { profile: env.LIGHTHOUSE_MODEL_PROFILE } : {}) });
  const selected = implementing ? selectEnvironment(config, request.implementation?.environment) : null;
  if (implementing) {
    if (selected) config.implementationImage = selected.image;
    if (!/^sha256:[a-f0-9]{64}$/.test(config.implementationImage ?? '')) throw Error('Operator must provision and pin an implementation image');
    config.image = config.implementationImage;
  }
  if (!/^[a-f0-9]{64}$/.test(request.runId)) throw Error('Invalid execution identity');
  const dir = await mkdtemp(join(env.RUNNER_TEMP, 'lighthouse-engine-'));
  await chmod(dir, 0o755);
  const source = join(dir, 'source'), output = join(dir, 'output');
  await mkdir(source); await mkdir(output); await chmod(output, 0o777);
  let name;
  const harness = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const runtimeReceipt = { ...await harnessIdentity(harness), image: config.image, limits, environment: environmentReceipt(selected), model: modelSelection.model, modelExecution: modelExecutionReceipt(modelSelection, request.modelSelection), engine: 'OpenCode 2.1.0', isolation: 'Docker; no AWF egress filtering', skills: await readdir(join(harness, 'skills')), sourceRevision: request.sourceRevision, seed: request.implementation?.policy.seed ?? null, seedDigest: request.seedDigest ?? null, phases: {} };
  let phase = 'preflight', evidenceRetained = false;
  const phaseStarted = new Map();
  const recordPhase = async status => { runtimeReceipt.phases[phase] = status; if (status === 'running') phaseStarted.set(phase, Date.now()); telemetry.emit('execution.phase', { phase, status, durationMs: phaseStarted.has(phase) ? Date.now() - phaseStarted.get(phase) : null }); await writeFile(join(runDir, 'runtime.json'), JSON.stringify(runtimeReceipt)); };
  const docker = args => runOwnedDocker(config, args, { stdio: 'ignore', timeout: 30000 });
  let child, timer, heartbeat, slot, baseline, trackedSource, planningBaseline, runtime, codegraph, eventsPath, cancelled = false, stopReason = null;
  const preparation = new AbortController();
  const cancel = (reason = 'cancelled') => { cancelled = true; preparation.abort(); stopReason ??= reason; try { config.resourceOwner?.observe(); } catch {} child?.kill('SIGTERM'); try { if (name) docker(['rm', '-f', name, `${name}-checks`]); } catch {} };
  const onSignal = () => cancel();
  process.once('SIGTERM', onSignal); process.once('SIGINT', onSignal);
  try {
    console.log('Waiting for the operator host engine slot');
    const waitStarted = Date.now(); telemetry.emit('execution.host-wait.started', { status: 'waiting' });
    slot = await acquireEngineSlot(config.lock, engineSlotWaitSeconds(config), { signal: preparation.signal });
    telemetry.emit('execution.host-wait.ended', { status: 'acquired', durationMs: Date.now() - waitStarted });
    const ownershipDirectory = `${config.lock}.resources`;
    runtimeReceipt.recoveredCleanup = recoverExecutionOwners(ownershipDirectory);
    const command = imageCommand(config.image);
    config.resourceOwner = createExecutionOwner(ownershipDirectory, { repository: request.repository ?? env.GITHUB_REPOSITORY, runId: request.runId, workflowRunId: String(env.GITHUB_RUN_ID), attempt: Number(env.GITHUB_RUN_ATTEMPT) });
    name = `${config.resourceOwner.prefix}-engine`;
    await recordPhase('running');
    runtime = await startEnvironment({ selected, image: config.image, commands: implementing ? [['git'], ['sh'], ...(request.implementation.policy.checks ?? [])] : [], name: `${name}-agent`, uid: config.uid, run: args => runOwnedDocker(config, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 }) });
    await recordPhase('passed');
    if (cancelled) throw Error('Execution cancelled before agent startup');
    console.log('Engine slot acquired; starting isolated OpenCode');
    await snapshotSource(env.GITHUB_WORKSPACE, source);
    if (request.worker === 'product-change') {
      if (!/^[a-f0-9]{64}$/.test(request.baselineDigest ?? '')) throw Error('ProductShape evidence lacks its authenticated baseline');
      await installProductEvidence(join(runDir, 'product-evidence'), source, request.baselineDigest);
    } else if (!implementing) runtimeReceipt.productEvidence = await preparePlanningProductEvidence(source, runDir, { signal: preparation.signal });
    baseline = implementing ? await sourceFiles(source) : null;
    trackedSource = baseline ? new Map(baseline) : null;
    if (implementing) {
      if (request.sourceSynchronization) {
        if (!isVerificationOnlyCorrection(request) || request.epic || request.productResume || request.productAlignment || request.seedDigest || request.implementation.policy.verification?.synchronizeBase !== true || request.sourceSynchronization.source !== request.sourceRevision || request.sourceSynchronization.base !== request.baseRevision) throw Error('Unauthorized source synchronization');
        baseline = synchronizedSource(env.GITHUB_WORKSPACE, baseline, request.sourceSynchronization);
        trackedSource = new Map(baseline);
        runtimeReceipt.synchronization = { source: request.sourceRevision, base: request.baseRevision, digest: synchronizationDigest(request.sourceSynchronization) };
        await rm(source, { recursive: true, force: true }); await mkdir(source);
        await materializeCandidate(baseline, [], source);
      }
      if (request.seedDigest) {
        const seed = validateChanges(JSON.parse(await readFile(join(runDir, 'seed.json'), 'utf8')), request.implementation.policy);
        if (changesDigest(seed) !== request.seedDigest) throw Error('Seed artifact identity mismatch');
        for (const file of seed) if (file.content !== null) trackedSource.set(file.path, {});
        await rm(source, { recursive: true, force: true }); await mkdir(source);
        await materializeCandidate(baseline, seed, source);
      }
      if (request.implementation.proposal && !request.sourceSynchronization) {
        planningBaseline = await sourceFiles(source, trackedSource);
        const metadata = await prepareImplementationPlanMetadata(planningBaseline, request, undefined, preparation.signal);
        if (metadata) {
          if (!withinScope(metadata.path, request.implementation.policy)) throw Error('OpenSpec metadata is outside the authorized implementation scope');
          await mkdir(dirname(join(source, metadata.path)), { recursive: true });
          await writeFile(join(source, metadata.path), metadata.content);
          planningBaseline.set(metadata.path, metadata); trackedSource.set(metadata.path, {});
          runtimeReceipt.planningMetadata = { provider: '@fission-ai/openspec@1.15.0', path: metadata.path, origin: metadata.origin, sha256: createHash('sha256').update(metadata.content).digest('hex') };
        }
      }
      await prepareImplementationWorkspace(source, config, request.issue, repository);
    }
    const context = join(dir, 'context.json');
    await copyFile(join(runDir, 'context.json'), context); await chmod(context, 0o444);
    if (reviewOutput) {
      await writeFile(join(output, 'envelope.json'), JSON.stringify(reviewTemplate(reviewOutput)));
      await chmod(join(output, 'envelope.json'), 0o666);
    } else if (request.worker === 'independent-review') {
      const template = JSON.parse(await readFile(context, 'utf8')).contract?.envelope;
      completionOutput(template, request);
      template.result = { ...template.result, status: 'blocked', evidence: [], missingEvidence: ['Independent reviewer must complete the assessment'], unavailableChecks: [], pendingReview: [], output: {}, nextAction: 'Independent reviewer: complete the supplied review assessment' };
      template.effect.body = 'Independent review has not been completed.';
      await writeFile(join(output, 'envelope.json'), JSON.stringify(template));
      await chmod(join(output, 'envelope.json'), 0o666);
    }
    const prompt = join(dir, 'prompt.txt');
    const completionBoundary = reviewOutput ? '\n\n# Completion in this custom engine adapter\nWrite only /output/envelope.json using contract.review. The host validates the binding, verdict and findings and constructs the stage envelope and terminal noop. Stop after writing the review; safeoutputs is a host duty.\n' : '\n\n# Completion in this custom engine adapter\nThe trusted host, outside this container, records the gh-aw terminal noop after validating /output/envelope.json. The safeoutputs CLI and /tmp/gh-aw/agent instructions describe host duties in this integration. Their absence inside the engine is expected, not an unavailable product check. Read /harness/skills/concise-results/SKILL.md when writing effect.body. Write the envelope and stop; do not install or invoke safeoutputs.\n';
    await writeFile(prompt, await readFile(env.GH_AW_PROMPT, 'utf8') + completionBoundary, { mode: 0o444 });
    codegraph = codegraphSelection(config, implementing);
    if (codegraph.status === 'pending') codegraph = await startCodegraph({ config, source, harness, dir, name, docker });
    runtimeReceipt.codegraph = { status: codegraph.status, ...(codegraph.reason ? { reason: codegraph.reason } : {}), ...(codegraph.tools ? { tools: codegraph.tools } : {}) };
    let workerConfigPath = codegraph.workerConfigPath;
    if (telemetry.health().status !== 'disabled') {
      try {
        const workerConfig = workerConfigPath ? JSON.parse(await readFile(workerConfigPath, 'utf8')) : JSON.parse(runOwnedDocker(config, ['run', '--rm', '--network', 'none', '--entrypoint', 'cat', config.image, '/etc/opencode/opencode.json'], { encoding: 'utf8', timeout: 30000 }));
        if (!Array.isArray(workerConfig.policies)) throw Error('Unsupported engine policy');
        workerConfig.plugins = [...(workerConfig.plugins ?? []), '/harness/src/opencode-telemetry'];
        workerConfig.policies.push({ action: 'integration.use', resource: 'plugin:/harness/src/opencode-telemetry', effect: 'allow' });
        workerConfigPath = join(dir, 'telemetry-opencode.json');
        await writeFile(workerConfigPath, JSON.stringify(workerConfig), { mode: 0o444 });
      } catch { telemetry.emit('collection.capability', { capability: 'opencode-native', status: 'unavailable', reasonCode: 'engine-policy-unavailable' }); }
    }
    const collectEvents = collectNativeFile(join(output, 'execution/native-events.jsonl'), telemetry), collectResources = collectNativeFile(join(output, 'execution/resource-events.jsonl'), telemetry);
    nativeCollect = () => { collectEvents(); collectResources(); };
    nativeTimer = setInterval(nativeCollect, 1000);
    phase = 'execution'; await recordPhase('running');
    const args = ownedDockerArgs(config, ['run', '--rm', '--init', '--name', name, '--user', `${config.uid}:${config.uid}`, ...resourceArgs(limits), '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
      '--tmpfs', '/tmp:rw,exec,size=2g,mode=1777', '--tmpfs', `/home/engine/.cache:rw,size=1g,uid=${config.uid},gid=${config.uid}`, '--tmpfs', `/home/engine/.config:rw,size=16m,uid=${config.uid},gid=${config.uid}`, '--tmpfs', `/home/engine/.local/state:rw,size=64m,uid=${config.uid},gid=${config.uid}`,
      '--mount', `type=bind,src=${source},dst=/workspace${implementing ? '' : ',readonly'}`, '--mount', `type=bind,src=${output},dst=/output`, '--mount', `type=bind,src=${context},dst=/input/context.json,readonly`, '--mount', `type=bind,src=${prompt},dst=/input/prompt.txt,readonly`, '--mount', `type=bind,src=${harness},dst=/harness,readonly`,
      ...(codegraph.status === 'available' ? ['--mount', `type=bind,src=${codegraph.state},dst=/codegraph,readonly`] : []),
      ...(workerConfigPath ? ['--mount', `type=bind,src=${workerConfigPath},dst=/etc/opencode/opencode.json,readonly`, '--env', 'LIGHTHOUSE_NATIVE_TELEMETRY_FILE=/output/execution/native-events.jsonl'] : []),
      '--mount', `type=volume,src=${config.authVolume},dst=/home/engine/.local/share/opencode`, ...(telemetry.health().status !== 'disabled' ? ['--env', 'LIGHTHOUSE_RESOURCE_TELEMETRY_FILE=/output/execution/resource-events.jsonl'] : []), '--env', `ENGINE_SESSION=ses_${request.runId}`, '--env', `ENGINE_MODEL=${modelSelection.engineModel}`, '--env', `ENGINE_STAGE=${request.stage}`, ...scratchArgs, '--env', 'PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright', ...environmentArgs(runtime), '--entrypoint', 'node', config.image, '/harness/src/managed-command.mjs', 'run', '/output/execution', 'engine', '--', ...command]);
    eventsPath = join(env.RUNNER_TEMP, 'gh-aw', `opencode-events-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}.jsonl`);
    await mkdir(dirname(eventsPath), { recursive: true });
    await writeFile(eventsPath, '', { mode: 0o600 });
    const started = Date.now();
    let lastVisible = started, engineError = false;
    const redact = text => redactLog(redactEnvironmentLog(runtime, text));
    const report = text => { lastVisible = Date.now(); console.log(redact(text)); };
    const eventLine = line => {
      const redacted = redact(line);
      try { observeCli(telemetry, JSON.parse(redacted)); } catch { /* Non-event engine logs have no telemetry payload. */ }
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
      if (cancelled) throw Error('Execution cancelled before agent startup');
      child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let ownershipObserved = false;
      const consume = line => {
        try {
          if (!ownershipObserved) ownershipObserved = config.resourceOwner.observe();
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
      child.on('error', () => ok({ code: 127, signal: null })); child.on('close', (code, signal) => { if (Number.isInteger(code) && ![125, 126, 127].includes(code)) config.resourceOwner?.completed(args); ok({ code, signal }); });
      timer = setTimeout(() => cancel('timeout'), implementing ? 1800000 : 600000);
    });
    runtimeReceipt.execution = await executionReceipt(join(output, 'execution/engine.json'), exit, stopReason);
    await recordPhase(runtimeReceipt.execution.status);
    if (exit.code !== 0 || cancelled || runtimeReceipt.execution.status !== 'passed') throw Error(executionFailure(runtimeReceipt.execution));
    if (engineError) throw Error('OpenCode reported an execution error; no model fallback attempted');
    phase = 'evidence'; await recordPhase('running');
    // The worker has exited. Reclaim only this run's tree before reading private output.
    restoreWorkspaceOwnership(dir, config);
    runtimeReceipt.execution = await executionReceipt(join(output, 'execution/engine.json'), exit, stopReason);
    if (runtimeReceipt.execution.status !== 'passed') { phase = 'execution'; throw Error(executionFailure(runtimeReceipt.execution)); }
    const result = join(output, 'envelope.json'), stat = await lstat(result);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 128000) throw Error('Invalid engine result file');
    const rawEnvelope = await readFile(result, 'utf8');
    let envelope;
    try { envelope = reviewOutput ? reviewEnvelope(JSON.parse(rawEnvelope), request) : JSON.parse(rawEnvelope); completionOutput(envelope, request); }
    catch (error) {
      await mkdir(join(runDir, 'evidence/host'), { recursive: true });
      await writeFile(join(runDir, reviewOutput ? 'evidence/host/rejected-review.txt' : 'evidence/host/rejected-envelope.txt'), redact(rawEnvelope).slice(0, 128000));
      throw error;
    }
    if (reviewOutput) {
      await mkdir(join(runDir, 'evidence/host'), { recursive: true });
      await writeFile(join(runDir, 'evidence/host/review-payload.json'), rawEnvelope);
      runtimeReceipt.independentReview = { ...reviewOutput, sha256: createHash('sha256').update(rawEnvelope).digest('hex') };
    }
    clearTimeout(timer);
    if (implementing) {
      const candidateFiles = await sourceFiles(source, trackedSource);
      const modelChanges = collectChanges(baseline, candidateFiles, request.implementation.policy);
      const metadata = request.sourceSynchronization ? null : await implementationPlanMetadata(candidateFiles, planningBaseline ?? baseline, request, undefined, preparation.signal);
      if (metadata) {
        candidateFiles.set(metadata.path, { content: metadata.content, mode: metadata.mode });
        runtimeReceipt.planningMetadata = { provider: '@fission-ai/openspec@1.15.0', path: metadata.path, origin: metadata.origin, sha256: createHash('sha256').update(metadata.content).digest('hex') };
      }
      const changes = metadata ? collectChanges(baseline, candidateFiles, request.implementation.policy) : modelChanges;
      if (request.sourceSynchronization && changes.length) throw Error('Synchronized verification cannot include model file changes');
      const verification = verificationIntegrity(baseline, candidateFiles, request.implementation.policy, request.issue);
      await writeFile(join(runDir, 'changes.json'), JSON.stringify(changes));
      await mkdir(join(runDir, 'evidence'), { recursive: true });
      await writeFile(join(runDir, 'evidence', 'candidate-envelope.json'), JSON.stringify(envelope));
      await copyEvidence(join(output, 'evidence'), join(runDir, 'evidence', 'agent'));
      evidenceRetained = true;
      await recordPhase('passed'); phase = 'verification'; await recordPhase('running');
      const candidate = join(dir, 'candidate'); await mkdir(candidate);
      await materializeCandidate(baseline, changes, candidate);
      if (runtime.cleanup() === false) throw Error('Agent test service cleanup failed; operator action required');
      const receipt = await runImplementationChecks({ config, request, changes, workspace: candidate, output: join(runDir, 'evidence', 'host'), name, redact: redactLog, cancelled: () => cancelled, selected, repository, telemetry });
      receipt.verification = verification;
      await writeFile(join(runDir, 'checks.json'), JSON.stringify(receipt));
      await recordPhase(receipt.checks.every(c => c.exitCode === 0) ? 'passed' : 'failed');
      if (request.implementation.policy.reviewRequired) {
        envelope.result.status = 'blocked';
        envelope.result.pendingReview.push('Repository policy requires owner acceptance of this candidate; engine assertions cannot grant it.');
      }
      if (!changes.length && !isVerificationOnlyCorrection(request) && envelope.result.status === 'passed') { envelope.result.status = 'blocked'; envelope.result.missingEvidence.push('No implementation changes were returned'); }
      if (receipt.checks.some(c => c.exitCode !== 0)) {
        envelope.result.status = 'blocked';
        envelope.result.missingEvidence.push('The independent host checks did not all pass; inspect checks.json and host logs.');
        envelope.effect.body += '\n\nIndependent host checks failed. This candidate requires corrections before completion.';
      }
      if (cancelled) throw Error('Implementation cancelled before publication');
    }
    if (!implementing) await recordPhase('passed');
    phase = 'completion'; await recordPhase('running');
    const completion = completionOutput(envelope, request);
    report(progressText('Result', redactLog(envelope.effect.body)));
    report(progressText('Run', `Validated outcome: ${envelope.result.status}. The publisher will recheck authority before updating the issue.`));
    await writeFile(join(runDir, 'envelope.json'), JSON.stringify(envelope));
    // gh-aw requires a terminal safe output even when a separate job owns publication.
    await mkdir(dirname(env.GH_AW_SAFE_OUTPUTS), { recursive: true });
    await writeFile(env.GH_AW_SAFE_OUTPUTS, JSON.stringify(completion) + '\n');
    await recordPhase('passed');
    outcome = envelope.result.status;
    telemetry.emit('execution.result', { status: outcome, reasonCode: outcome === 'blocked' ? envelope.result.pendingReview.length ? 'pending-review' : 'missing-evidence' : 'validated-result' });
  } catch (error) {
    error.phase = phase;
    await recordPhase('failed');
    if (implementing && baseline) {
      try {
        try { if (name) docker(['rm', '-f', name, `${name}-checks`]); } catch {}
        restoreWorkspaceOwnership(dir, config);
        const changes = collectChanges(baseline, await sourceFiles(source, trackedSource), request.implementation.policy);
        await writeFile(join(runDir, 'changes.json'), JSON.stringify(changes));
        console.error(progressText('Recovery', 'Retained bounded candidate changes. This failed run cannot publish a PR.'));
      } catch (recoveryError) { console.error(progressText('Recovery', redactLog(`Candidate could not be retained: ${recoveryError.message}`))); }
      if (!evidenceRetained && phase !== 'evidence') {
        try { await copyEvidence(join(output, 'evidence'), join(runDir, 'evidence', 'agent')); }
        catch { console.error(progressText('Recovery', 'Additional evidence could not be collected; inspect the retained candidate and failed phase.')); }
      }
    }
    throw error;
  } finally {
    clearInterval(nativeTimer); nativeCollect();
    if (eventsPath) {
      try { await mkdir(join(runDir, 'evidence/host'), { recursive: true }); await copyFile(eventsPath, join(runDir, 'evidence/host/engine-events.jsonl')); }
      catch { console.error('Engine events could not be retained; inspect the runner diagnostics.'); }
    }
    clearTimeout(timer); clearInterval(heartbeat); process.removeListener('SIGTERM', onSignal); process.removeListener('SIGINT', onSignal);
    try { if (name) docker(['rm', '-f', name, `${name}-checks`]); } catch {}
    stopCodegraph(codegraph?.sidecar, config);
    runtime?.cleanup();
    try { if (config.resourceOwner) docker(['run', '--rm', '--network', 'none', '--user', `${config.uid}:${config.uid}`, '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--mount', `type=volume,src=${config.authVolume},dst=/home/engine/.local/share/opencode`, config.image, 'cleanup-session', `ses_${request.runId}`]); } catch { console.error('Session cleanup failed; operator inspection required'); }
    // Read-only stages also create engine-owned command receipt directories.
    try { if (config.resourceOwner) restoreWorkspaceOwnership(dir, config); } catch { console.error('Workspace ownership cleanup failed; operator inspection required'); }
    try {
      if (config.resourceOwner) { runtimeReceipt.cleanup = config.resourceOwner.cleanup(); await writeFile(join(runDir, 'runtime.json'), JSON.stringify(runtimeReceipt)); }
      try { await mkdir(join(runDir, 'evidence/host'), { recursive: true }); await copyFile(join(output, 'execution/native-events.jsonl'), join(runDir, 'evidence/host/native-events.jsonl')); } catch { telemetry.emit('collection.capability', { capability: 'opencode-native', status: 'unavailable', reasonCode: 'native-file-unavailable' }); }
      if (runtimeReceipt.execution?.resourceSamplesDropped) telemetry.emit('collection.gap', { reasonCode: 'resource-sample-capacity', omittedEvents: runtimeReceipt.execution.resourceSamplesDropped });
      telemetry.emit('execution.resources', { ...runtimeReceipt.execution?.resources });
      telemetry.emit('execution.cleanup', { status: runtimeReceipt.cleanup?.status ?? 'unknown' });
      telemetry.emit('execution.ended', { status: stopReason ?? (runtimeReceipt.cleanup && runtimeReceipt.cleanup.status !== 'clean' ? 'cleanup-failed' : outcome), exitCode: runtimeReceipt.execution?.exitCode, signal: runtimeReceipt.execution?.signal });
      telemetry.close(outcome);
      try {
        const events = readTelemetry(telemetry.directory, { stream: telemetry.stream });
        await mkdir(join(runDir, 'evidence/host'), { recursive: true });
        await writeFile(join(runDir, 'evidence/host/telemetry.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + '\n');
        await writeFile(join(runDir, 'evidence/host/telemetry-usage.json'), JSON.stringify(usageSummary(events, { health: [telemetry.health()] })));
        runtimeReceipt.telemetry = telemetry.health(); await writeFile(join(runDir, 'runtime.json'), JSON.stringify(runtimeReceipt));
      } catch { console.error('Telemetry retention incomplete; inspect collector health.'); }
      await rm(dir, { recursive: true, force: true });
    } finally { if (slot !== undefined) closeSync(slot); }
    if (runtimeReceipt.cleanup && runtimeReceipt.cleanup.status !== 'clean') throw Object.assign(Error('Execution cleanup is not verified; inspect runtime.json and the operator ownership journal before retrying'), { phase: 'cleanup' });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(async error => {
  const message = redactLog(error.message);
  console.error(progressText('Engine error', message));
  try { await writeFile(join(process.env.RUNNER_TEMP, `lighthouse-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`, 'engine-error.json'), JSON.stringify({ schemaVersion: 1, phase: error.phase ?? 'preparation', message: message.slice(0, 3000) })); } catch {}
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n### Execution failed\n\n${message.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}\n\nInspect runtime.json and the retained engine events before retrying.\n`); } catch {}
  }
  process.exitCode = 1;
});
