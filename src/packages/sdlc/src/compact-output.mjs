import { openSync, closeSync, statSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';

// Format retained output only. Command execution and trusted checks stay upstream.
export function compactCommandOutput(log, command, exitCode, { env = process.env, execute = spawnSync } = {}) {
  if (env.LIGHTHOUSE_COMPACT_OUTPUT !== 'rtk') return null;
  const raw = { mode: 'rtk', status: 'unabridged', rawLog: log };
  if (exitCode !== 0) return { ...raw, reason: 'command-failed' };
  const [program, subcommand] = command, name = basename(program);
  const filter = name === 'git' && ['status', 'diff', 'log'].includes(subcommand) ? `git-${subcommand}`
    : ({ rg: 'rg', grep: 'grep', find: 'find', fd: 'fd', tsc: 'tsc', pytest: 'pytest', vitest: 'vitest' })[name];
  if (!filter) return { ...raw, reason: 'unsupported-command' };
  if (statSync(log).size > 4 * 1024 * 1024) return { ...raw, reason: 'output-bound' };
  if (/\b(?:fatal|panic|exception|errors?|failed|failure)\b/i.test(readFileSync(log, 'utf8'))) return { ...raw, reason: 'diagnostics-present' };
  const fd = openSync(log, 'r');
  try {
    const result = execute('rtk', ['pipe', '--filter', filter], { stdio: [fd, 'pipe', 'pipe'], encoding: 'utf8', timeout: 10000, maxBuffer: 256 * 1024, env });
    if (result.status !== 0 || result.error || !result.stdout?.trim() || result.stderr?.trim() || Buffer.byteLength(result.stdout) >= statSync(log).size) return { ...raw, reason: result.error?.code === 'ENOENT' ? 'optimizer-missing' : 'optimizer-unavailable' };
    return { mode: 'rtk', status: 'compacted', filter, rawLog: log, text: result.stdout };
  } catch { return { ...raw, reason: 'optimizer-unavailable' }; }
  finally { closeSync(fd); }
}
