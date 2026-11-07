import { openSync, closeSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';

function boundedWait(seconds) {
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > 3600) throw Error('Operator engineSlotWaitSeconds must be an integer from 0 to 3600');
  return seconds;
}

export const engineSlotWaitSeconds = config => boundedWait(config.engineSlotWaitSeconds === undefined ? 240 : config.engineSlotWaitSeconds);

export async function acquireEngineSlot(path, seconds = 240, { signal } = {}) {
  if (typeof path !== 'string' || !isAbsolute(path)) throw Error('Operator engine lock must be an absolute path');
  boundedWait(seconds);
  signal?.throwIfAborted();
  const fd = openSync(path, 'a', 0o600);
  try {
    // The inherited descriptor shares the lock with this host after flock exits.
    await new Promise((resolve, reject) => {
      const child = spawn('flock', ['--exclusive', '--wait', String(seconds), '3'], { stdio: ['ignore', 'ignore', 'ignore', fd], signal });
      child.once('error', reject);
      child.once('close', code => code === 0 ? resolve() : reject(Error('Host engine capacity unavailable')));
    });
    signal?.throwIfAborted();
    return fd;
  } catch (error) {
    closeSync(fd);
    if (error.name === 'AbortError') throw error;
    throw Error('Host engine capacity unavailable', { cause: error });
  }
}
