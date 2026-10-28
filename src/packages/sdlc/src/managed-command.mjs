// Runs inside the workload: one command group, one receipt, bounded child cleanup.
import { mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { constants } from 'node:os';

const number = path => { try { const value = Number(readFileSync(path, 'utf8').trim()); return Number.isSafeInteger(value) && value >= 0 ? value : null; } catch { return null; } };
const counter = (path, key) => { try { const line = readFileSync(path, 'utf8').split('\n').find(line => line.startsWith(key + ' ')); return line ? Number(line.split(' ')[1]) : null; } catch { return null; } };
const ticks = pid => { try { return readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ')[19]; } catch { return null; } };
const atomic = (path, value) => { writeFileSync(path + '.tmp', JSON.stringify(value), { mode: 0o644 }); renameSync(path + '.tmp', path); };

export async function managedCommand(directory, id, command) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id) || !command.length) throw Error('Use a unique command ID and an executable');
  mkdirSync(directory, { recursive: true });
  const lock = join(directory, '.active'), receipt = join(directory, id + '.json');
  try { mkdirSync(lock); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    throw Error('Another command owns this workspace command slot; wait for its receipt or stop it before retrying');
  }
  let child, interval, stopping = false;
  const signalGroup = signal => { if (child?.pid) { try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; } } };
  const stop = () => { stopping = true; signalGroup('SIGTERM'); };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  const baselineDenied = counter('/sys/fs/cgroup/pids.events', 'max');
  const baselineOom = counter('/sys/fs/cgroup/memory.events', 'oom_kill');
  const state = { state: 'running', pid: process.pid, startTicks: ticks(process.pid), exitCode: null, signal: null, resources: { pidsLimit: number('/sys/fs/cgroup/pids.max'), pidsPeak: null, pidsDenied: null, memoryPeakBytes: null, oomKills: null } };
  const sample = () => {
    const current = number('/sys/fs/cgroup/pids.current'), denied = counter('/sys/fs/cgroup/pids.events', 'max'), oom = counter('/sys/fs/cgroup/memory.events', 'oom_kill');
    state.resources.pidsPeak = current === null ? state.resources.pidsPeak : Math.max(state.resources.pidsPeak ?? 0, current, number('/sys/fs/cgroup/pids.peak') ?? 0);
    state.resources.pidsDenied = denied === null || baselineDenied === null ? null : Math.max(0, denied - baselineDenied);
    state.resources.oomKills = oom === null || baselineOom === null ? null : Math.max(0, oom - baselineOom);
    state.resources.memoryPeakBytes = number('/sys/fs/cgroup/memory.peak');
    atomic(receipt, state);
  };
  try {
    if (existsSync(receipt)) throw Error('Command ID already has a receipt; use a new ID for the next attempt');
    atomic(join(lock, 'owner.json'), { pid: process.pid, startTicks: state.startTicks });
    sample();
    child = spawn(command[0], command.slice(1), { stdio: 'inherit', detached: true });
    let killTimer;
    const forceStop = () => { stop(); killTimer = setTimeout(() => signalGroup('SIGKILL'), 1000); };
    process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop);
    process.once('SIGTERM', forceStop); process.once('SIGINT', forceStop);
    interval = setInterval(sample, 200);
    try {
      const exit = await new Promise(resolve => {
        child.once('error', () => resolve({ code: 127, signal: null }));
        child.once('close', (code, signal) => resolve({ code, signal }));
      });
      signalGroup('SIGTERM');
      // Reap background servers and grandchildren before releasing the workspace slot.
      await new Promise(resolve => setTimeout(resolve, 100));
      signalGroup('SIGKILL');
      clearTimeout(killTimer);
      state.state = stopping ? 'cancelled' : 'completed';
      state.signal = exit.signal;
      state.exitCode = exit.code ?? 128 + (constants.signals[exit.signal] ?? 0);
      sample();
      return state.exitCode;
    } finally { process.removeListener('SIGTERM', forceStop); process.removeListener('SIGINT', forceStop); }
  } finally {
    clearInterval(interval);
    signalGroup('SIGKILL');
    process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop);
    rmSync(lock, { recursive: true, force: true });
  }
}

async function main() {
  const [action, directory, id, separator, ...command] = process.argv.slice(2);
  if (!directory) throw Error('Usage: managed-command run <directory> <id> -- <command...> | stop <directory>');
  if (action === 'stop') {
    const owner = JSON.parse(readFileSync(join(directory, '.active/owner.json'), 'utf8'));
    if (!Number.isSafeInteger(owner.pid) || owner.pid <= 1 || !owner.startTicks || ticks(owner.pid) !== owner.startTicks) throw Error('Command owner is no longer running; inspect the stale slot before removing it');
    process.kill(owner.pid, 'SIGTERM');
    return;
  }
  if (action !== 'run' || separator !== '--') throw Error('Usage: managed-command run <directory> <id> -- <command...> | stop <directory>');
  process.exitCode = await managedCommand(directory, id, command);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
