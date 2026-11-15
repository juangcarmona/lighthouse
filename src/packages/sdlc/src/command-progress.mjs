import { openSync, closeSync, fstatSync, readSync, readdirSync, constants } from 'node:fs';
import { StringDecoder } from 'node:string_decoder';
import { boundedEventLines, progressText } from './opencode-progress.mjs';

// Anchor each untrusted directory and reject links, devices and oversized receipts.
function directory(root) {
  let fd = openSync(root, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try {
    for (const name of ['evidence', 'commands']) {
      const next = openSync(`/proc/self/fd/${fd}/${name}`, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      closeSync(fd); fd = next;
    }
    return fd;
  } catch (error) { closeSync(fd); throw error; }
}

function regular(dir, name, read) {
  const fd = openSync(`/proc/self/fd/${dir}/${name}`, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try { const stat = fstatSync(fd); if (!stat.isFile()) return; return read(fd, stat); }
  finally { closeSync(fd); }
}

export function commandProgress(root, report) {
  const commands = new Map();
  let last = null, bytes = 0, unavailable = false, truncated = false;
  return {
    get last() { return last; },
    poll(now = Date.now()) {
      let dir;
      try {
        dir = directory(root);
        const names = readdirSync(`/proc/self/fd/${dir}`);
        if (names.length > 1024) throw Error('Command progress inventory exceeds its bound');
        for (const name of names.filter(n => /^[a-z0-9][a-z0-9-]{0,63}\.json$/.test(n))) {
          try {
            const receipt = regular(dir, name, (fd, stat) => {
              if (stat.size > 16384) return;
              const buffer = Buffer.alloc(stat.size); readSync(fd, buffer, 0, buffer.length, 0);
              return JSON.parse(buffer.toString('utf8'));
            });
            if (!receipt || !['running', 'completed', 'cancelled'].includes(receipt.state) || !Number.isSafeInteger(receipt.startedAt) || receipt.startedAt < 0 || receipt.startedAt > now) continue;
            const id = name.slice(0, -5);
            let command = commands.get(id);
            if (!command) {
              if (commands.size >= 256) throw Error('Command progress exceeds its bound');
              command = { offset: 0, decoder: new StringDecoder('utf8'), state: null, startedAt: receipt.startedAt };
              command.lines = boundedEventLines(line => report(progressText(`Command ${id}`, line)), () => report(progressText(`Command ${id}`, 'Oversized output line omitted. Full logs remain in the evidence artifact.')), 8192);
              commands.set(id, command);
              report(progressText('Command', `${id} started`));
            }
            if (!last || receipt.startedAt >= last.startedAt) last = { id, state: receipt.state, startedAt: receipt.startedAt, exitCode: Number.isInteger(receipt.exitCode) ? receipt.exitCode : null };
            if (bytes < 512 * 1024) regular(dir, `${id}.log`, (fd, stat) => {
              const buffer = Buffer.alloc(Math.min(16384, Math.max(0, stat.size - command.offset), 512 * 1024 - bytes));
              const length = readSync(fd, buffer, 0, buffer.length, command.offset);
              command.offset += length; bytes += length;
              command.lines.write(command.decoder.write(buffer.subarray(0, length)));
              if (receipt.state !== 'running' && command.offset === stat.size && !command.drained) { command.lines.write(command.decoder.end()); command.lines.end(); command.drained = true; }
            });
            if (bytes >= 512 * 1024 && !truncated) { truncated = true; report(progressText('Command', 'Live output limit reached. Full command logs remain in the evidence artifact.')); }
            if (command.state !== receipt.state && receipt.state !== 'running') report(progressText('Command', `${id} ${receipt.state}; exit ${Number.isInteger(receipt.exitCode) ? receipt.exitCode : 'unavailable'}; ${Math.floor((now - receipt.startedAt) / 1000)}s elapsed`));
            command.state = receipt.state;
          } catch (error) { if (!['ENOENT', 'ELOOP'].includes(error.code) && !unavailable) { report(progressText('Command', 'Some command progress is unavailable; inspect retained receipts and logs.')); unavailable = true; } }
        }
      } catch (error) {
        if (error.code !== 'ENOENT' && !unavailable) { report(progressText('Command', 'Command progress is unavailable; inspect retained receipts and logs.')); unavailable = true; }
      } finally { if (dir !== undefined) closeSync(dir); }
    },
  };
}
