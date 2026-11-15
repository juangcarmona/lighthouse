import { accessSync, constants, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const sdkRequirement = '.NET SDK 10.0.112/latestPatch';
export const aspireVersion = '13.6.5';
export function compatibleSdk(list) {
  return list.split(/\r?\n/).some(line => {
    const match = /^10\.0\.(1\d{2}) \[[^\r\n]+\]$/.exec(line.trim());
    return match && Number(match[1]) >= 112;
  });
}
export const compatibleAspire = version => /^13\.6\.5(?:\+[^\s]+)?$/.test(version.trim());

// Self-contained so preflight can run this in an image without mounting source.
export function inspectBundle(root) {
  if (!root || !isAbsolute(root)) throw Error('Missing absolute AspireCliBundlePath');
  const marker = readFileSync(join(dirname(root), '.aspire-bundle-version'), 'utf8').trim();
  if (!/^13\.6\.5(?:\+[^|\s]+)?\|/.test(marker)) throw Error('Incompatible Aspire bundle');
  const files = ['managed/aspire-managed', 'dcp/dcp', 'dashboard/Aspire.Dashboard', 'dashboard/wwwroot/_framework/blazor.web.js', 'dashboard/libe_sqlite3.so'];
  const components = {};
  for (const file of files) {
    const path = join(root, file);
    accessSync(path, constants.R_OK | (['managed/aspire-managed', 'dcp/dcp', 'dashboard/Aspire.Dashboard'].includes(file) ? constants.X_OK : 0));
    if (!statSync(path).isFile() || statSync(path).size === 0) throw Error('Incomplete Aspire bundle');
    components[file] = createHash('sha256').update(readFileSync(path)).digest('hex');
  }
  return { version: '13.6.5', path: root, marker, components };
}
export const bundleProbe = `const {accessSync,constants,readFileSync,statSync}=require('node:fs'),{createHash}=require('node:crypto'),{dirname,isAbsolute,join}=require('node:path');console.log(JSON.stringify((${inspectBundle.toString()})(process.env.AspireCliBundlePath)))`;

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!compatibleSdk(execFileSync('dotnet', ['--list-sdks'], { encoding: 'utf8' }))) throw Error(`Environment requires ${sdkRequirement}`);
  if (!compatibleAspire(execFileSync('aspire', ['--version'], { encoding: 'utf8' }))) throw Error(`Environment requires Aspire CLI ${aspireVersion}`);
  console.log(JSON.stringify({ sdk: execFileSync('dotnet', ['--list-sdks'], { encoding: 'utf8' }).trim(), aspire: inspectBundle(process.env.AspireCliBundlePath) }));
}
