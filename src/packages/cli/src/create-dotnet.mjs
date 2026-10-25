#!/usr/bin/env node
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, rmdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const templateRoot = resolve(packageRoot, 'assets/dotnet-template');
const cliPackage = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
const require = createRequire(import.meta.url);
const sdlcContract = JSON.parse(await readFile(require.resolve('@juangcarmona/lighthouse-sdlc/contract.json'), 'utf8'));
const args = process.argv.slice(2);
const target = args[0] ? resolve(args[0]) : null;
const name = args.includes('--name') ? args[args.indexOf('--name') + 1] : null;

if (!target || !name || !/^[A-Z][A-Za-z0-9]{1,47}$/.test(name) || args.length !== 3 || args[1] !== '--name') {
  process.stderr.write('Usage: lighthouse create-dotnet <empty-target> --name Workshop\nUse a PascalCase product identifier of 2–48 letters/digits.\n');
  process.exit(2);
}

let existing = false;
try {
  const info = await lstat(target);
  if (!info.isDirectory() || info.isSymbolicLink() || (await readdir(target)).length > 0) throw new Error('The target must be a new directory or an empty directory.');
  existing = true;
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const transform = (text) => text
  .replaceAll('JuanGCarmona.Lighthouse.Example', `JuanGCarmona.${name}`)
  .replaceAll('Lighthouse.Example', name)
  .replaceAll('Lighthouse_Example', name)
  .replaceAll('../../../../Lighthouse.Cqrs/', '../../dotnet/Lighthouse.Cqrs/')
  .replaceAll('../../../../Lighthouse.Analyzers/', '../../dotnet/Lighthouse.Analyzers/')
  .replaceAll('../../Lighthouse.Analyzers/', '../../../src/dotnet/Lighthouse.Analyzers/')
  .replaceAll('../../examples/src/root/', '../../../src/root/');

async function copy(from, to) {
  const info = await lstat(from);
  if (info.isDirectory()) {
    await mkdir(to, { recursive: true });
    for (const entry of await readdir(from)) {
      if (['bin', 'obj'].includes(entry)) continue;
      await copy(join(from, entry), join(to, entry.replaceAll('Lighthouse.Example', name)));
    }
    return;
  }
  if (!info.isFile()) throw new Error('Starter sources must be ordinary files and directories.');
  await mkdir(dirname(to), { recursive: true });
  await writeFile(to, transform(await readFile(from, 'utf8')));
}

const stage = await mkdtemp(join(dirname(target), '.lighthouse-create-dotnet-'));
try {
  for (const [from, to] of [
    ['Lighthouse.Analyzers', 'src/dotnet/Lighthouse.Analyzers'],
    ['Lighthouse.Cqrs', 'src/dotnet/Lighthouse.Cqrs'],
    ['examples/src', 'src'],
    ['tests', 'tests/dotnet'],
    ['Directory.Build.props', 'Directory.Build.props'],
    ['Directory.Packages.props', 'Directory.Packages.props'],
    ['global.json', 'global.json'],
    ['Lighthouse.slnx', `${name}.slnx`],
  ]) await copy(resolve(templateRoot, from), resolve(stage, to));

  const solutionFile = resolve(stage, `${name}.slnx`);
  const solutionText = (await readFile(solutionFile, 'utf8'))
    .replaceAll('examples/src/', 'src/')
    .replaceAll('Lighthouse.Analyzers/', 'src/dotnet/Lighthouse.Analyzers/')
    .replaceAll('Lighthouse.Cqrs/', 'src/dotnet/Lighthouse.Cqrs/')
    .replaceAll('tests/', 'tests/dotnet/');
  const projects = [...solutionText.matchAll(/<Project Path="[^"]+"\s*\/>/g)].map((match) => match[0]);
  await writeFile(solutionFile, `<Solution>\n${projects.map((project) => `  ${project}`).join('\n')}\n</Solution>\n`);

  await copy(resolve(packageRoot, 'src/lighthouse.mjs'), resolve(stage, 'scripts/lighthouse.mjs'));
  await copy(resolve(packageRoot, 'src/aliases.mjs'), resolve(stage, 'scripts/aliases.mjs'));
  await copy(resolve(packageRoot, 'src/github-profile.mjs'), resolve(stage, 'scripts/github-profile.mjs'));
  await copy(resolve(packageRoot, 'src/init-plan.mjs'), resolve(stage, 'scripts/init-plan.mjs'));
  await copy(resolve(packageRoot, 'src/guardrails.mjs'), resolve(stage, 'scripts/guardrails.mjs'));
  await copy(resolve(packageRoot, 'src/profiles.mjs'), resolve(stage, 'scripts/profiles.mjs'));
  await copy(resolve(packageRoot, 'src/verify-dotnet.mjs'), resolve(stage, 'scripts/verify-dotnet.mjs'));
  await copy(resolve(packageRoot, 'assets/guardrails'), resolve(stage, 'assets/guardrails'));
  await copy(resolve(packageRoot, 'assets/profiles'), resolve(stage, 'assets/profiles'));
  await copy(resolve(packageRoot, 'assets/schemas'), resolve(stage, 'schemas'));
  await copy(resolve(packageRoot, 'assets/command-aliases.json'), resolve(stage, 'assets/command-aliases.json'));
  await copy(resolve(packageRoot, 'assets/skills/init'), resolve(stage, 'assets/skills/init'));

  await writeFile(resolve(stage, 'lighthouse.json'), `${JSON.stringify({
    $schema: './schemas/lighthouse-manifest.schema.json', schemaVersion: 1, baseline: '0.1.0',
    product: name, application: { shape: 'backend', stacks: ['dotnet'] }, profiles: ['dotnet-backend'],
    integrations: { productShape: null, arcShape: null },
    packages: { sdlc: { name: '@juangcarmona/lighthouse-sdlc', version: sdlcContract.version } },
    managed: ['LIGHTHOUSE.md', 'scripts/lighthouse-guard.mjs', '.husky/commit-msg', '.husky/pre-push', '.github/workflows/lighthouse.yml', '.lighthouse/sdlc.json', '.agents/skills/lighthouse-init/SKILL.md', '.lighthouse/upgrade.json', '.lighthouse/commands.json', 'docs/profiles/dotnet/README.md', 'docs/profiles/dotnet/adoption.md', 'docs/profiles/dotnet/architecture.md', 'docs/profiles/dotnet/guardrails.md', 'docs/profiles/dotnet/practices.md', 'docs/profiles/dotnet/testing-and-development.md', 'docs/profiles/dotnet/use-cases.md', '.agents/skills/lighthouse-dotnet/SKILL.md'],
    repository: {
      layout: ['src', 'docs', 'infra', 'scripts'], publicSite: { enabled: true },
      conventions: { commits: 'conventional', branchPattern: '^(feat|fix|docs|refactor|test|chore|build|ci|perf|revert)/[1-9]\\d*-[a-z0-9]+(?:-[a-z0-9]+)*$' },
    },
  }, null, 2)}\n`);
  await writeFile(resolve(stage, 'package.json'), `${JSON.stringify({
    name: `@juangcarmona/${name.toLowerCase()}`, private: true, type: 'module', engines: { node: '>=22' },
    scripts: { verify: 'node scripts/lighthouse.mjs verify && node scripts/verify-dotnet.mjs' },
  }, null, 2)}\n`);
  await writeFile(resolve(stage, 'README.md'), `# ${name}\n\nBackend seeded from Lighthouse ${cliPackage.version}. Application and tooling sources are product-owned after creation.\n\nRun dotnet restore ${name}.slnx once to create lockfiles, then npm run verify. Commit lockfiles.\n\nStart dotnet run --project src/root/${name}.Api or the optional src/root/${name}.AppHost. Configure authentication using a trusted OIDC provider for manual API access. Test identities exist only in tests.\n\nThe sample catalog uses disposable in-memory storage. Add real persistence, data isolation, telemetry and deployment policy according to product requirements. Keep each command/query's endpoint, DTOs, validation and internal sealed handler together.\n`);
  await writeFile(resolve(stage, 'AGENTS.md'), `# ${name} engineering guidance\n\nUse the Lighthouse .NET profile from the pinned baseline revision. Keep Minimal API commands/queries as complete single-file slices. Handlers remain internal sealed and independent of HTTP. Modules use sibling Contracts assemblies. Run npm run verify.\n\nApplication and tooling source is product-owned. Do not hand-edit LIGHTHOUSE.md. Record narrow, expiring exceptions for suppressed diagnostics.\n`);
  await mkdir(resolve(stage, '.github/workflows'), { recursive: true });
  await writeFile(resolve(stage, '.github/workflows/ci.yml'), `name: Backend verification\non: [push, pull_request]\npermissions:\n  contents: read\njobs:\n  dotnet:\n    runs-on: ubuntu-latest\n    timeout-minutes: 15\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n      - uses: actions/setup-dotnet@v4\n        with:\n          global-json-file: global.json\n      - run: npm run verify\n`);

  const initialized = (await import('node:child_process')).spawnSync(process.execPath, [resolve(stage, 'scripts/lighthouse.mjs'), 'init'], { cwd: stage, encoding: 'utf8' });
  if (initialized.status !== 0) throw new Error(initialized.stderr || 'Projection generation failed.');
  if (existing) await rmdir(target);
  await rename(stage, target);
  process.stdout.write(`Created ${name} in ${target}. Run dotnet restore ${name}.slnx, then npm run verify.\n`);
} catch (error) {
  await rm(stage, { recursive: true, force: true });
  throw error;
}
