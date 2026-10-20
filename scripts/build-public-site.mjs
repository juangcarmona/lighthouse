import { execFile as execFileCallback } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'src/public-site');
const output = resolve(root, process.argv[2] || 'dist/public-site');
const brandAssets = join(root, 'assets');
const execFile = promisify(execFileCallback);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
await mkdir(join(output, 'assets'), { recursive: true });

for (const asset of [
  'lighthouse-icon.svg',
  'lighthouse-icon-light.svg',
  'github-banner.svg',
  'github-banner-light.svg',
]) {
  await cp(join(brandAssets, asset), join(output, 'assets', asset));
}

const [tokens, components] = await Promise.all([
  readFile(join(root, 'src/packages/ui/tokens.css'), 'utf8'),
  readFile(join(root, 'src/packages/ui/components.css'), 'utf8'),
]);
await writeFile(
  join(output, 'assets/lighthouse.css'),
  `/* Generated from the Lighthouse UI package. */\n${tokens.trim()}\n\n${components.trim()}\n`,
);

await mkdir(join(output, 'model'), { recursive: true });
await mkdir(join(output, 'architecture'), { recursive: true });

await execFile(npx, ['prodshape', 'graph', '--format', 'html'], { cwd: root });
await cp(join(root, '.product/generated/snapshot.html'), join(output, 'model/index.html'));

await execFile(
  npx,
  ['arcshape', 'site', 'build', '--docs', join(root, 'docs/architecture'), '--out', join(output, 'architecture/index.html')],
  { cwd: root, env: { ...process.env, GITHUB_ACTIONS: process.env.GITHUB_ACTIONS ?? 'true' } },
);

console.log(`Built Lighthouse public site at ${output}, including ProductShape and ArcShape snapshots.`);
