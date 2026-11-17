import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runOwnedDocker } from './execution-cleanup.mjs';

// Proposed designs receive no repository, engine credentials, network or JavaScript.
export async function renderVisualProposal(item, { config, directory, deadline }) {
  const timeout = Math.min(30000, deadline - Date.now());
  if (timeout <= 0) throw Error('Execution deadline reached before visual rendering');
  const root = await mkdtemp(join(directory, 'visual-proposal-'));
  const name = `${config.resourceOwner.prefix}-visual-${item.id}`;
  try {
    await chmod(root, 0o777);
    const csp = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'";
    await writeFile(join(root, 'design.html'), `<!doctype html><meta http-equiv="Content-Security-Policy" content="${csp}"><meta charset="utf-8">${item.html}`, { mode: 0o444 });
    runOwnedDocker(config, ['run', '--rm', '--init', '--name', name, '--network', 'none', '--user', `${config.uid}:${config.uid}`, '--cpus', '2', '--memory', '1g', '--pids-limit', '128', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only', '--tmpfs', '/tmp:rw,size=256m,mode=1777', '--env', 'HOME=/tmp', '--mount', `type=bind,src=${root},dst=/render`, '--entrypoint', '/usr/bin/chromium', config.image, '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-javascript', '--hide-scrollbars', '--no-first-run', '--user-data-dir=/tmp/profile', `--window-size=${item.viewport.width},${item.viewport.height}`, '--screenshot=/render/design.png', 'file:///render/design.html'], { timeout, stdio: 'ignore' });
    return await readFile(join(root, 'design.png'));
  } finally {
    runOwnedDocker(config, ['rm', '-f', name], { timeout: 30000, stdio: 'ignore' });
    await rm(root, { recursive: true, force: true });
  }
}
