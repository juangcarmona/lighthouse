import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const output = join(root, 'dist/public-site');
const required = [
  'index.html',
  'site.css',
  'site.js',
  'assets/lighthouse.css',
  'assets/lighthouse-icon.svg',
  'assets/lighthouse-icon-light.svg',
  'assets/github-banner.svg',
  'assets/github-banner-light.svg',
  'model/index.html',
  'architecture/index.html',
];
const exists = async (path) => stat(path).then(() => true).catch(() => false);

for (const file of required) {
  if (!(await exists(join(output, file)))) throw new Error(`Missing public-site output: ${file}`);
}

const html = await readFile(join(output, 'index.html'), 'utf8');
for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/gu)) {
  const target = match[1];
  if (/^(?:https?:|mailto:|#|data:)/u.test(target)) continue;
  const local = resolve(output, target);
  if (relative(output, local).startsWith('..') || !(await exists(local))) {
    throw new Error(`Missing public-site reference: ${target}`);
  }
}

const [productSnapshot, architectureSnapshot] = await Promise.all([
  readFile(join(output, 'model/index.html'), 'utf8'),
  readFile(join(output, 'architecture/index.html'), 'utf8'),
]);
if (!productSnapshot.includes('<title>Product Snapshot</title>')) {
  throw new Error('Published ProductShape snapshot is missing or stale.');
}
if (!architectureSnapshot.includes('ArcShape') || !architectureSnapshot.includes('Architecture Snapshot')) {
  throw new Error('Published ArcShape snapshot is missing or stale.');
}

const [bundle, tokens, components] = await Promise.all([
  readFile(join(output, 'assets/lighthouse.css'), 'utf8'),
  readFile(join(root, 'src/packages/ui/tokens.css'), 'utf8'),
  readFile(join(root, 'src/packages/ui/components.css'), 'utf8'),
]);
for (const sourceCss of [tokens, components]) {
  if (!bundle.includes(sourceCss.trim())) throw new Error('Published CSS is out of sync with its package source.');
}

const files = [];
async function inventory(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) await inventory(path);
    else files.push(relative(output, path));
  }
}
await inventory(output);
console.log(`Verified Lighthouse public site: ${files.length} files, package CSS is current, local references resolve.`);
