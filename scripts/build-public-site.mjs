import { execFile as execFileCallback } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'src/public-site');
const output = resolve(root, process.argv[2] || 'dist/public-site');
const brandAssets = join(root, 'assets');
const execFile = promisify(execFileCallback);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const flowPages = [
  ['triage', 'Triage'], ['refine', 'Refine'], ['propose', 'Propose'],
  ['implement', 'Implement'], ['apply-review', 'Apply review'],
  ['integrate', 'Integrate'], ['review', 'Review'],
  ['product-change', 'Product Change'], ['apply-product-change', 'Apply Product Change'],
  ['maintenance', 'Maintenance and recovery'], ['worker-reports', 'Worker reports', 'maintenance', 2],
  ['unattended', 'Fast-forward and hotfix'],
  ['product-definition-as-code', 'Product Definition as Code'],
];

async function flowDiagrams(architectureRoot) {
  const diagrams = new Map();
  for (const entry of await readdir(join(architectureRoot, 'diagrams'), { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-f0-9]+$/.test(entry.name)) continue;
    const provenance = JSON.parse(await readFile(join(architectureRoot, 'diagrams', entry.name, 'provenance.json'), 'utf8'));
    diagrams.set(`${provenance.document}#${provenance.fence}`, entry.name);
  }
  return flowPages.map(([slug, title, document = slug, fence = 1]) => {
    const id = diagrams.get(`06-runtime-view/${document}.md#${fence}`);
    if (!id) throw new Error(`Published architecture is missing the ${slug} flow diagram.`);
    return `<details class="diagram-card"${slug === 'triage' ? ' open' : ''}><summary>${title}<span>View diagram</span></summary><p class="diagram-hint">Scroll to inspect the diagram.</p><div class="diagram-scroll" role="region" aria-label="${title} diagram, scroll to explore" tabindex="0"><img src="architecture/diagrams/${id}/diagram.svg" alt="${title} workflow diagram" loading="${slug === 'triage' ? 'eager' : 'lazy'}"></div><a href="architecture/index.html#/section/06/${document}">Open interactive diagram ↗</a></details>`;
  }).join('\n');
}

async function readManifest() {
  try { return JSON.parse(await readFile(join(root, 'lighthouse.json'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

function authorityHint(kind) {
  return kind === 'ProductShape'
    ? 'Initialize or repair ProductShape, then rerun: npx --no-install prodshape init && npx --no-install prodshape validate'
    : 'Initialize or repair ArcShape, then rerun: npx --no-install arcshape init && npx --no-install arcshape validate --docs docs/architecture --links --citations';
}

async function runAuthority(kind, args) {
  try { await execFile(npx, args, { cwd: root }); }
  catch (error) {
    const outputText = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    throw new Error(`${kind} validation failed before public-site publication. ${authorityHint(kind)}${outputText ? `\n${outputText}` : ''}`);
  }
}

const manifest = await readManifest();
const publicSiteEnabled = manifest?.repository?.publicSite?.enabled !== false;
const parent = dirname(output);
await mkdir(parent, { recursive: true });
const stage = await mkdtemp(join(parent, '.public-site-'));

try {
  await cp(source, stage, { recursive: true });
  await mkdir(join(stage, 'assets'), { recursive: true });
  const cliPackage = JSON.parse(await readFile(join(root, 'src/packages/cli/package.json'), 'utf8'));
  let page = (await readFile(join(stage, 'index.html'), 'utf8')).replace('__LIGHTHOUSE_VERSION__', cliPackage.version);

  for (const asset of ['lighthouse-icon.svg', 'lighthouse-icon-light.svg', 'github-banner.svg', 'lighthouse-beam.svg']) {
    await cp(join(brandAssets, asset), join(stage, 'assets', asset));
  }

  const [tokens, components] = await Promise.all([
    readFile(join(root, 'src/packages/ui/tokens.css'), 'utf8'),
    readFile(join(root, 'src/packages/ui/components.css'), 'utf8'),
  ]);
  await writeFile(
    join(stage, 'assets/lighthouse.css'),
    `/* Generated from the Lighthouse UI package. */\n${tokens.trim()}\n\n${components.trim()}\n`,
  );

  if (publicSiteEnabled) {
    await runAuthority('ProductShape', ['prodshape', 'validate']);
    await runAuthority('ProductShape', ['prodshape', 'change', 'validate']);
    await runAuthority('ArcShape', ['arcshape', 'validate', '--docs', join(root, 'docs/architecture'), '--links', '--citations']);

    await mkdir(join(stage, 'model'), { recursive: true });
    await mkdir(join(stage, 'architecture'), { recursive: true });
    try {
      await execFile(npx, ['prodshape', 'graph', '--format', 'html'], { cwd: root });
      await cp(join(root, '.product/generated/snapshot.html'), join(stage, 'model/index.html'));
    } catch (error) {
      throw new Error(`ProductShape snapshot generation failed before public-site publication. ${authorityHint('ProductShape')}\n${error.stderr ?? error.message}`);
    }

    const architectureArgs = [
      'arcshape', 'site', 'build', '--docs', join(root, 'docs/architecture'),
      '--format', 'interactive', '--out', join(stage, 'architecture'), '--title', 'Lighthouse',
    ];
    const sourceRef = (await execFile('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim();
    architectureArgs.push('--source-ref', sourceRef);
    // Renderer source links must not depend on a cloud checkout's private or missing origin.
    const sourceConfig = join(stage, '.source-gitconfig');
    await writeFile(sourceConfig, `[remote "origin"]\nurl = https://github.com/juangcarmona/lighthouse.git\n[safe]\ndirectory = ${JSON.stringify(root)}\n`);
    try {
      await execFile(npx, architectureArgs, {
        cwd: root,
        env: { ...process.env, GITHUB_ACTIONS: process.env.GITHUB_ACTIONS ?? 'true', GIT_CONFIG_GLOBAL: sourceConfig },
      });
    } catch (error) {
      throw new Error(`ArcShape snapshot generation failed before public-site publication. ${authorityHint('ArcShape')}\n${error.stderr ?? error.message}`);
    } finally { await rm(sourceConfig, { force: true }); }
    page = page.replace('<!-- FLOW_DIAGRAMS -->', await flowDiagrams(join(stage, 'architecture')));
  }

  await writeFile(join(stage, 'index.html'), page.replace('<!-- FLOW_DIAGRAMS -->', ''));

  await rm(output, { recursive: true, force: true });
  await rename(stage, output);
  console.log(`Built Lighthouse public site at ${output}${publicSiteEnabled ? ', including ProductShape and ArcShape snapshots.' : '.'}`);
} catch (error) {
  await rm(stage, { recursive: true, force: true });
  throw error;
}
