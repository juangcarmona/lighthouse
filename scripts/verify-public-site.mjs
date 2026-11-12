import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const output = join(root, 'dist/public-site');
let manifest = null;
try { manifest = JSON.parse(await readFile(join(root, 'lighthouse.json'), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const publicSiteEnabled = manifest?.repository?.publicSite?.enabled !== false;
const required = [
  'index.html',
  'site.css',
  'site.js',
  'assets/lighthouse.css',
  'assets/lighthouse-icon.svg',
  'assets/lighthouse-icon-light.svg',
  'assets/github-banner.svg',
  'assets/lighthouse-beam.svg',
];
if (publicSiteEnabled) required.push('model/index.html', 'architecture/index.html');
const exists = async (path) => stat(path).then(() => true).catch(() => false);

async function verifyReferences(html, file) {
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gu)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|#|data:|\/\/)/u.test(target)) continue;
    const local = resolve(dirname(join(output, file)), target.split(/[?#]/u, 1)[0]);
    if (relative(output, local).startsWith('..') || !(await exists(local))) {
      throw new Error(`Missing public-site reference in ${file}: ${target}`);
    }
  }
}

for (const file of required) {
  if (!(await exists(join(output, file)))) throw new Error(`Missing public-site output: ${file}`);
}

const html = await readFile(join(output, 'index.html'), 'utf8');
const cliPackage = JSON.parse(await readFile(join(root, 'src/packages/cli/package.json'), 'utf8'));
if (!html.includes(`v${cliPackage.version}`) || html.includes('__LIGHTHOUSE_VERSION__')) {
  throw new Error('Published Lighthouse version does not match the CLI package.');
}
await verifyReferences(html, 'index.html');

if (publicSiteEnabled) {
  for (const slug of ['triage', 'refine', 'propose', 'implement', 'apply-review', 'integrate', 'review', 'product-change', 'apply-product-change', 'maintenance', 'unattended', 'product-definition-as-code']) {
    if (!html.includes(`architecture/index.html#/section/06/${slug}`)) {
      throw new Error(`Public site is missing the ${slug} flow route.`);
    }
  }
  if (html.includes('FLOW_DIAGRAMS') || (html.match(/class="diagram-card"/g) ?? []).length !== 13 || !html.includes('Worker reports')) {
    throw new Error('Public-site flow gallery is incomplete.');
  }
  const [productExplorer, architectureSnapshot] = await Promise.all([
    readFile(join(output, 'model/index.html'), 'utf8'),
    readFile(join(output, 'architecture/index.html'), 'utf8'),
  ]);
  if (!productExplorer.includes('<title>Lighthouse’s Product Explorer</title>')) {
    throw new Error('Published ProductShape Explorer is missing or stale.');
  }
  await verifyReferences(productExplorer, 'model/index.html');
  if (!architectureSnapshot.includes('ArcShape') || !architectureSnapshot.includes('Architecture Snapshot')) {
    throw new Error('Published ArcShape snapshot is missing or stale.');
  }
  if (!/<a\b[^>]*\bhref="https:\/\/github\.com\/juangcarmona\/lighthouse\/blob\/[a-f0-9]{40}\/src\/packages\/sdlc\/README\.md"/.test(architectureSnapshot)) {
    throw new Error('Published architecture is missing commit-pinned executable source links.');
  }
  const diagramRoot = join(output, 'architecture/diagrams');
  const diagrams = await readdir(diagramRoot, { withFileTypes: true });
  if (!diagrams.some(entry => entry.isDirectory())) throw new Error('Published architecture has no interactive diagrams.');
  for (const entry of diagrams.filter(entry => entry.isDirectory())) {
    for (const file of ['index.html', 'diagram.svg', 'source.json', 'provenance.json']) {
      if (!(await exists(join(diagramRoot, entry.name, file)))) {
        throw new Error(`Missing interactive diagram asset: ${entry.name}/${file}`);
      }
    }
  }
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
