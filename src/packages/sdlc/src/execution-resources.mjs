import { execFileSync } from 'node:child_process';
import { readFile, lstat } from 'node:fs/promises';

export function executionLimits(config, implementing = true) {
  const resources = config.resources === undefined ? {} : config.resources;
  if (!resources || typeof resources !== 'object' || Array.isArray(resources) || Object.keys(resources).some(key => !['implementationPids', 'planningPids'].includes(key)) ||
      Object.values(resources).some(value => !Number.isSafeInteger(value) || value < 128 || value > 4096)) {
    throw Error('Invalid operator resources: implementationPids and planningPids must be integers from 128 to 4096');
  }
  return { cpus: 2, memory: implementing ? '4g' : '2g', pids: resources[implementing ? 'implementationPids' : 'planningPids'] ?? (implementing ? 1024 : 128) };
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
  const status = reason ?? (observed.state === 'cancelled' ? 'cancelled' : resources.oomKills > 0 ? 'out-of-memory' : resources.pidsDenied > 0 ? 'process-limit' : exitCode === 0 ? 'passed' : signal === 'SIGABRT' || exitCode === 134 ? 'aborted' : 'failed');
  return { status, exitCode, signal, resources };
}

export function executionFailure(receipt) {
  const explanation = {
    'process-limit': 'Container process/thread limit reached',
    'out-of-memory': 'Container memory limit triggered an OOM kill',
    timeout: 'Execution timed out',
    cancelled: 'Execution cancelled',
    aborted: 'Execution aborted (SIGABRT)',
    failed: 'Execution failed',
  }[receipt.status] ?? 'Execution failed';
  return `${explanation}; exit code ${receipt.exitCode ?? 'unavailable'}, signal ${receipt.signal ?? 'unavailable'}; task peak ${receipt.resources.pidsPeak ?? 'unavailable'}/${receipt.resources.pidsLimit ?? 'unavailable'}, rejected tasks ${receipt.resources.pidsDenied ?? 'unavailable'}`;
}
