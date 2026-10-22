import { readdir, readFile, writeFile, mkdir, mkdtemp, lstat, rmdir, rename, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const source = fileURLToPath(new URL('../../../../', import.meta.url));
const args = process.argv.slice(2);
const target = args[0] ? resolve(args[0]) : null;
const name = args.includes('--name') ? args[args.indexOf('--name') + 1] : null;
if (!target || !name || !/^[A-Z][A-Za-z0-9]{1,47}$/.test(name) || args.length !== 3 || args[1] !== '--name') {
  process.stderr.write('Usage: npm run create:dotnet -- <empty-target> --name Workshop\nUse a PascalCase product identifier of 2–48 letters/digits.\n');
  process.exit(2);
}
let existing = false;
try {
  const info = await lstat(target);
  if (!info.isDirectory() || info.isSymbolicLink() || (await readdir(target)).length > 0)
    throw new Error('The target must be a new directory or an empty directory.');
  existing = true;
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(dirname(target), { recursive: true });
const stage = await mkdtemp(join(dirname(target), '.lighthouse-create-'));
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
      if (['bin', 'obj', 'packages.lock.json'].includes(entry)) continue;
      await copy(join(from, entry), join(to, entry.replaceAll('Lighthouse.Example', name)));
    }
  } else if (info.isFile()) {
    await mkdir(dirname(to), { recursive: true });
    await writeFile(to, transform(await readFile(from, 'utf8')));
  } else throw new Error('Starter sources must be ordinary files and directories.');
}
try {
  for (const [from, to] of [
    ['src/dotnet/Lighthouse.Analyzers', 'src/dotnet/Lighthouse.Analyzers'],
    ['src/dotnet/Lighthouse.Cqrs', 'src/dotnet/Lighthouse.Cqrs'],
    ['src/dotnet/examples/src', 'src'], ['src/dotnet/tests', 'tests/dotnet'],
    ['src/packages/cli/internal/verify-dotnet.mjs', 'scripts/verify-dotnet.mjs'],
    ['src/packages/cli/src/lighthouse.mjs', 'scripts/lighthouse.mjs'],
    ['src/packages/cli/src/guardrails.mjs', 'scripts/guardrails.mjs'],
    ['src/packages/cli/src/profiles.mjs', 'scripts/profiles.mjs'],
    ['src/packages/cli/assets/guardrails', 'assets/guardrails'],
    ['src/packages/cli/assets/schemas', 'schemas'], ['src/dotnet/Directory.Build.props', 'Directory.Build.props'],
    ['src/dotnet/Directory.Packages.props', 'Directory.Packages.props'], ['src/dotnet/global.json', 'global.json'],
    ['.gitignore', '.gitignore'], ['.editorconfig', '.editorconfig'], ['src/dotnet/Lighthouse.slnx', `${name}.slnx`]
  ]) await copy(resolve(source, from), resolve(stage, to));
  const solutionFile = resolve(stage, `${name}.slnx`);
  const solutionText = (await readFile(solutionFile, 'utf8'))
    .replaceAll('examples/src/', 'src/')
    .replaceAll('Lighthouse.Analyzers/', 'src/dotnet/Lighthouse.Analyzers/')
    .replaceAll('Lighthouse.Cqrs/', 'src/dotnet/Lighthouse.Cqrs/')
    .replaceAll('tests/', 'tests/dotnet/');
  const projects = [...solutionText.matchAll(/<Project Path="[^"]+"\s*\/>/g)].map((match) => match[0]);
  await writeFile(solutionFile, `<Solution>\n${projects.map((project) => `  ${project}`).join('\n')}\n</Solution>\n`);
  await writeFile(resolve(stage, 'lighthouse.json'), JSON.stringify({
    $schema: './schemas/lighthouse-manifest.schema.json', schemaVersion: 1, baseline: '0.1.0',
    product: name, application: { shape: 'backend', stacks: ['dotnet'] }, profiles: ['dotnet-backend'],
    integrations: { productShape: null, arcShape: null },
    packages: { sdlc: { name: '@juangcarmona/lighthouse-sdlc', version: '0.1.0' } },
    managed: ['LIGHTHOUSE.md', 'scripts/lighthouse-guard.mjs', '.husky/commit-msg', '.husky/pre-push', '.github/workflows/lighthouse.yml', '.lighthouse/sdlc.json'],
    repository: {
      layout: ['src', 'docs', 'infra', 'scripts'],
      publicSite: { enabled: true },
      conventions: {
        commits: 'conventional',
        branchPattern: '^(feat|fix|docs|refactor|test|chore|build|ci|perf|revert)/[1-9]\\d*-[a-z0-9]+(?:-[a-z0-9]+)*$'
      }
    }
  }, null, 2) + '\n');
  await writeFile(resolve(stage, 'package.json'), JSON.stringify({
    name: `@juangcarmona/${name.toLowerCase()}`, private: true, type: 'module', engines: { node: '>=22' },
    scripts: { verify: 'node scripts/lighthouse.mjs verify && node scripts/verify-dotnet.mjs' }
  }, null, 2) + '\n');
  await writeFile(resolve(stage, 'README.md'), `# ${name}\n\nBackend seeded from Lighthouse 0.1.0. Application and tooling sources are product-owned after creation.\n\nRun \`dotnet restore ${name}.slnx\` once to create lockfiles, then \`npm run verify\`. Commit lockfiles.\n\nStart \`dotnet run --project src/root/${name}.Api\` or the optional \`src/root/${name}.AppHost\`. Configure Authentication__Authority and Authentication__Audience using a trusted OIDC provider for manual API access. Test identities exist only in tests.\n\nThe sample catalog uses disposable in-memory storage. Add real persistence, data isolation, telemetry and deployment policy according to product requirements. Keep each command/query's endpoint, DTOs, validation and internal sealed handler together.\n\nManage integration versions in lighthouse.json. LIGHTHOUSE.md is the only generated projection. Review Lighthouse source upgrades manually; the creator does not synchronize product files.\n`);
  await writeFile(resolve(stage, 'AGENTS.md'), `# ${name} engineering guidance\n\nUse the Lighthouse .NET profile from the pinned baseline revision. Keep Minimal API commands/queries as complete single-file slices. Handlers remain internal sealed and independent of HTTP. Modules use sibling Contracts assemblies. Run npm run verify.\n\nApplication and tooling source is product-owned. Do not hand-edit LIGHTHOUSE.md. Record narrow, expiring exceptions for suppressed diagnostics; CI status is required only when the repository's hosting rules say so.\n`);
  await mkdir(resolve(stage, '.github/workflows'), { recursive: true });
  await writeFile(resolve(stage, '.github/workflows/ci.yml'), `name: Backend verification\non: [push, pull_request]\npermissions:\n  contents: read\njobs:\n  dotnet:\n    runs-on: ubuntu-latest\n    timeout-minutes: 15\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n      - uses: actions/setup-dotnet@v4\n        with:\n          global-json-file: global.json\n      - run: npm run verify\n`);
  const initialized = spawnSync(process.execPath, [resolve(stage, 'scripts/lighthouse.mjs'), 'init'], { cwd: stage, encoding: 'utf8' });
  if (initialized.status !== 0) throw new Error(initialized.stderr || 'Projection generation failed.');
  if (existing) await rmdir(target);
  await rename(stage, target);
  process.stdout.write(`Created ${name} in ${target}. Run dotnet restore ${name}.slnx, then npm run verify.\n`);
} catch (error) { await rm(stage, { recursive: true, force: true }); throw error; }
