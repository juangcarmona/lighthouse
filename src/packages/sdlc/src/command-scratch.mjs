import { mkdtempSync, rmSync, statfsSync } from 'node:fs';

const filesystem = { mkdtempSync, rmSync, statfsSync };
export const scratchErrorCode = error => ['ENOSPC', 'EDQUOT', 'EACCES', 'EPERM', 'EROFS', 'ENOTDIR'].includes(error?.code) ? error.code : null;

export function scratchCapacity(io = filesystem) {
  try {
    const { blocks, bavail, bsize } = io.statfsSync('/tmp');
    return { capacityBytes: blocks * bsize, availableBytes: bavail * bsize };
  } catch { return null; }
}

// The runtime opts in only inside its private /tmp. Never clean a configured cache path.
export function commandScratch(environment, io = filesystem) {
  if (environment.LIGHTHOUSE_COMMAND_NPM_CACHE !== '1') return null;
  const path = io.mkdtempSync('/tmp/lighthouse-npm-');
  const receipt = { npmCache: 'active', beforeCommand: scratchCapacity(io) };
  return {
    environment: { ...environment, NPM_CONFIG_CACHE: path, npm_config_cache: path },
    receipt,
    release() {
      if (receipt.npmCache !== 'active') return receipt.npmCache === 'released';
      receipt.beforeCleanup = scratchCapacity(io);
      try { io.rmSync(path, { recursive: true, force: true }); receipt.npmCache = 'released'; }
      catch (error) { receipt.npmCache = 'cleanup-failed'; receipt.errorCode = scratchErrorCode(error); }
      receipt.afterCleanup = scratchCapacity(io);
      return receipt.npmCache === 'released';
    },
  };
}

export function scratchDiagnostic(receipt) {
  const capacity = receipt.afterCleanup ?? receipt.beforeCommand;
  return `Private scratch: ${capacity ? `${capacity.availableBytes} of ${capacity.capacityBytes} bytes available` : 'capacity unavailable'}; npm cache ${receipt.npmCache}${receipt.errorCode ? ` (${receipt.errorCode})` : ''}. ENOSPC indicates exhausted scratch; NU1301 alone does not establish capacity exhaustion.`;
}
