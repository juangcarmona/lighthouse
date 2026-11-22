import { execFileSync } from 'node:child_process';
import { readFile, lstat } from 'node:fs/promises';
import { scratchErrorCode } from './command-scratch.mjs';

export function executionBudget(implementing, { deadline, now = Date.now() } = {}) {
  const configuredMs = (implementing ? 60 : 10) * 60_000;
  if (deadline !== undefined && !Number.isSafeInteger(deadline)) throw Error('Invalid delivery execution deadline');
  const timeoutMs = Math.min(configuredMs, deadline === undefined ? Infinity : deadline - now);
  if (timeoutMs <= 0) throw Error('Delivery execution deadline exceeded');
  return { configuredMs, timeoutMs, startedAt: now, deadline: now + timeoutMs };
}

const tokenKeys = ['implementationTokens', 'planningTokens'];
// Defaults bound one engine run; operators tune them in the runner config.
export const defaultTokenLimits = Object.freeze({ implementationTokens: 5_000_000, planningTokens: 1_000_000 });

export function executionLimits(config, implementing = true) {
  const resources = config.resources === undefined ? {} : config.resources;
  const pids = Object.entries(resources ?? {}).filter(([key]) => !tokenKeys.includes(key));
  if (!resources || typeof resources !== 'object' || Array.isArray(resources) || pids.some(([key]) => !['implementationPids', 'planningPids'].includes(key)) ||
      pids.some(([, value]) => !Number.isSafeInteger(value) || value < 128 || value > 4096)) {
    throw Error('Invalid operator resources: implementationPids and planningPids must be integers from 128 to 4096');
  }
  return { cpus: 2, memory: implementing ? '4g' : '2g', pids: resources[implementing ? 'implementationPids' : 'planningPids'] ?? (implementing ? 1024 : 128) };
}

// Token cap per engine run, counted from the engine's own step_finish usage.
export function executionTokenLimit(config, implementing = true) {
  const key = implementing ? 'implementationTokens' : 'planningTokens';
  const value = config.resources?.[key];
  if (value === undefined) return defaultTokenLimits[key];
  if (!Number.isSafeInteger(value) || value < 10_000 || value > 100_000_000) throw Error('Invalid operator resources: implementationTokens and planningTokens must be integers from 10000 to 100000000');
  return value;
}

// Counts uncached input, output and reasoning tokens reported by OpenCode CLI
// step_finish events. Cache reads are excluded. When the engine reports no
// usage the meter stays at zero and the cap cannot fire: status 'unobserved'.
export function tokenMeter(limit) {
  let total = 0, steps = 0;
  return {
    limit,
    observe(event) {
      const tokens = event?.type === 'step_finish' ? event.part?.tokens : null;
      if (!tokens) return false;
      steps++;
      for (const key of ['input', 'output', 'reasoning']) if (Number.isSafeInteger(tokens[key]) && tokens[key] > 0) total += tokens[key];
      return total > limit;
    },
    receipt: () => ({ limit, observedTokens: total, observedSteps: steps, status: steps ? total > limit ? 'exceeded' : 'enforced' : 'unobserved' }),
  };
}

export const resourceArgs = limits => ['--cpus', String(limits.cpus), '--memory', limits.memory, '--pids-limit', String(limits.pids)];

export function imageCommand(image) {
  const config = JSON.parse(execFileSync('docker', ['image', 'inspect', '--format', '{"entrypoint":{{json .Config.Entrypoint}},"command":{{json .Config.Cmd}}}', image], { encoding: 'utf8', timeout: 30000 }));
  if ([config.entrypoint, config.command].some(value => value != null && !Array.isArray(value))) throw Error('Engine image has no valid entrypoint');
  const command = [...(config.entrypoint ?? []), ...(config.command ?? [])];
  if (!command.length || command.some(value => typeof value !== 'string' || value.length > 8192)) throw Error('Engine image has no valid entrypoint');
  return command;
}

export async function executionReceipt(path, exit, reason = null) {
  let observed = {};
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384) throw Error('Invalid command receipt');
    const value = JSON.parse(await readFile(path, 'utf8'));
    if (value && typeof value === 'object' && !Array.isArray(value)) observed = value;
  } catch {}
  const resources = {};
  for (const key of ['pidsLimit', 'pidsPeak', 'pidsDenied', 'memoryPeakBytes', 'oomKills']) {
    const value = observed.resources?.[key];
    resources[key] = Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  const signal = /^SIG[A-Z0-9]+$/.test(observed.signal ?? '') ? observed.signal : exit.signal ?? null;
  const exitCode = Number.isInteger(exit.code) ? exit.code : null;
  const scratchFailed = ['active', 'allocation-failed', 'cleanup-failed'].includes(observed.scratch?.npmCache);
  const status = reason ?? (observed.state === 'cancelled' ? 'cancelled' : resources.oomKills > 0 ? 'out-of-memory' : resources.pidsDenied > 0 ? 'process-limit' : scratchFailed ? 'failed' : exitCode === 0 ? 'passed' : signal === 'SIGABRT' || exitCode === 134 ? 'aborted' : 'failed');
  let scratch;
  if (['active', 'released', 'allocation-failed', 'cleanup-failed'].includes(observed.scratch?.npmCache)) {
    scratch = { npmCache: observed.scratch.npmCache };
    const errorCode = scratchErrorCode({ code: observed.scratch.errorCode });
    if (errorCode) scratch.errorCode = errorCode;
    for (const key of ['beforeCommand', 'beforeCleanup', 'afterCleanup']) {
      const value = observed.scratch[key];
      scratch[key] = value && Number.isSafeInteger(value.capacityBytes) && Number.isSafeInteger(value.availableBytes) && value.capacityBytes >= 0 && value.availableBytes >= 0 && value.availableBytes <= value.capacityBytes ? { capacityBytes: value.capacityBytes, availableBytes: value.availableBytes } : null;
    }
  }
  return { status, exitCode, signal, resources, ...(scratch ? { scratch } : {}), ...(Number.isSafeInteger(observed.resourceSamplesDropped) && observed.resourceSamplesDropped > 0 ? { resourceSamplesDropped: observed.resourceSamplesDropped } : {}) };
}

export function executionFailure(receipt) {
  const explanation = {
    'process-limit': 'Container process/thread limit reached',
    'out-of-memory': 'Container memory limit triggered an OOM kill',
    timeout: 'Execution timed out',
    'token-limit': 'Execution reached its token limit',
    cancelled: 'Execution cancelled',
    aborted: 'Execution aborted (SIGABRT)',
    failed: 'Execution failed',
  }[receipt.status] ?? 'Execution failed';
  return `${explanation}; exit code ${receipt.exitCode ?? 'unavailable'}, signal ${receipt.signal ?? 'unavailable'}; task peak ${receipt.resources.pidsPeak ?? 'unavailable'}/${receipt.resources.pidsLimit ?? 'unavailable'}, rejected tasks ${receipt.resources.pidsDenied ?? 'unavailable'}`;
}
