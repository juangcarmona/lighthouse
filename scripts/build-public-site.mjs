import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'src/public-site');
const output = resolve(root, process.argv[2] || 'dist/public-site');
const brandAssets = join(root, 'assets');

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

console.log(`Built Lighthouse public site at ${output}.`);
