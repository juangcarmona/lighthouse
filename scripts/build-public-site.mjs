import { execFile as execFileCallback } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'src/public-site');
const output = resolve(root, process.argv[2] || 'dist/public-site');
const brandAssets = join(root, 'assets');
const execFile = promisify(execFileCallback);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

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
  const page = await readFile(join(stage, 'index.html'), 'utf8');
  await writeFile(join(stage, 'index.html'), page.replace('__LIGHTHOUSE_VERSION__', cliPackage.version));

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
      '--out', join(stage, 'architecture/index.html'), '--title', 'Lighthouse',
    ];
    const sourceRef = process.env.GITHUB_SHA || process.env.GITHUB_REF_NAME;
    if (sourceRef) architectureArgs.push('--source-ref', sourceRef);
    try {
      await execFile(npx, architectureArgs, {
        cwd: root,
        env: { ...process.env, GITHUB_ACTIONS: process.env.GITHUB_ACTIONS ?? 'true' },
      });
    } catch (error) {
      throw new Error(`ArcShape snapshot generation failed before public-site publication. ${authorityHint('ArcShape')}\n${error.stderr ?? error.message}`);
    }
  }

  await rm(output, { recursive: true, force: true });
  await rename(stage, output);
  console.log(`Built Lighthouse public site at ${output}${publicSiteEnabled ? ', including ProductShape and ArcShape snapshots.' : '.'}`);
} catch (error) {
  await rm(stage, { recursive: true, force: true });
  throw error;
}
