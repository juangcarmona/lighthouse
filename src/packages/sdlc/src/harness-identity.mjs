import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function harnessIdentity(root = fileURLToPath(new URL('../', import.meta.url))) {
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  let harnessRevision = null, integrity = null;
  const parts = resolve(root).split(sep), installed = parts.lastIndexOf('node_modules');
  if (installed >= 0) {
    const prefix = parts.slice(0, installed).join(sep) || sep;
    try {
      const lock = JSON.parse(await readFile(resolve(prefix, 'package-lock.json'), 'utf8'));
      const entry = lock.packages?.[relative(prefix, root).split(sep).join('/')];
      if (entry?.version === pkg.version && /^sha512-[A-Za-z0-9+/]+={0,2}$/.test(entry.integrity ?? '')) integrity = entry.integrity;
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  } else {
    try {
      execFileSync('git', ['-C', root, 'ls-files', '--error-unmatch', 'package.json'], { stdio: 'ignore' });
      const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (/^[a-f0-9]{40}$/.test(head)) harnessRevision = head;
    } catch { /* An unpacked package has no source checkout; consumer Git history is not harness provenance. */ }
  }
  return { package: { name: pkg.name, version: pkg.version }, harnessRevision, distribution: { type: installed >= 0 ? 'package' : harnessRevision ? 'source' : 'unpacked', integrity } };
}
