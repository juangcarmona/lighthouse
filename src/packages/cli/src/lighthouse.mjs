#!/usr/bin/env node
import { access, chmod, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { constants, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { basename, dirname, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { evaluateGuardrails, readGuardrailCatalog } from './guardrails.mjs';
import { composeProfiles, normalizeApplication, profileCompositionResult, readProfileCatalog } from './profiles.mjs';
let sdlcCapabilities;
let sdlcReconcile;
let sdlcGithub;
try {
  [sdlcCapabilities, sdlcReconcile, sdlcGithub] = await Promise.all([
    import('@juangcarmona/lighthouse-sdlc/capabilities'),
    import('@juangcarmona/lighthouse-sdlc/reconcile'),
    import('@juangcarmona/lighthouse-sdlc/github'),
  ]);
} catch { /* Standalone generated starters can run without the optional SDLC package. */ }

const root = process.cwd();
const packageRequire = createRequire(import.meta.url);
const cliPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
function installedPackageVersion(name, entry) {
  try {
    const entryPath = packageRequire.resolve(`${name}/${entry}`);
    return JSON.parse(readFileSync(resolve(dirname(entryPath), 'package.json'), 'utf8')).version;
  } catch { return null; }
}
const manifestPath = resolve(root, 'lighthouse.json');
const projection = 'LIGHTHOUSE.md';
const upgradeStateRelative = '.lighthouse/upgrade.json';
const upgradeStatePath = resolve(root, upgradeStateRelative);
const layout = ['src', 'docs', 'infra', 'scripts'];
const sdlcPackage = { name: '@juangcarmona/lighthouse-sdlc', version: installedPackageVersion('@juangcarmona/lighthouse-sdlc', 'contract.json') ?? '0.1.0' };
const uiPackage = { name: '@juangcarmona/lighthouse-ui', version: installedPackageVersion('@juangcarmona/lighthouse-ui', 'DESIGN.md') ?? '0.1.0' };
const managedPaths = [
  projection,
  'scripts/lighthouse-guard.mjs',
  '.husky/commit-msg',
  '.husky/pre-push',
  '.github/workflows/lighthouse.yml',
  '.lighthouse/sdlc.json',
  upgradeStateRelative,
];
const profileManagedPaths = Object.freeze({
  'visual-theme': ['docs/design/DESIGN.md', '.agents/skills/lighthouse-ui/SKILL.md'],
  'dotnet-backend': ['docs/profiles/dotnet/README.md', 'docs/profiles/dotnet/adoption.md', 'docs/profiles/dotnet/architecture.md', 'docs/profiles/dotnet/guardrails.md', 'docs/profiles/dotnet/practices.md', 'docs/profiles/dotnet/testing-and-development.md', 'docs/profiles/dotnet/use-cases.md', '.agents/skills/lighthouse-dotnet/SKILL.md'],
  'react-web-platform': ['docs/profiles/react-web-platform/README.md', 'docs/profiles/react-web-platform/adoption.md', 'docs/profiles/react-web-platform/structure.md', 'docs/profiles/react-web-platform/guardrails.md', 'docs/profiles/react-web-platform/testing.md', '.agents/skills/lighthouse-react-web/SKILL.md'],
  'web-bff': ['docs/profiles/web-bff/README.md', 'docs/profiles/web-bff/adoption.md', 'docs/profiles/web-bff/security.md', 'docs/profiles/web-bff/testing.md', '.agents/skills/lighthouse-web-bff/SKILL.md'],
  'pwa-capability': ['docs/profiles/pwa-capability/README.md', 'docs/profiles/pwa-capability/adoption.md', 'docs/profiles/pwa-capability/guardrails.md', 'docs/profiles/pwa-capability/offline.md', 'docs/profiles/pwa-capability/testing.md', '.agents/skills/lighthouse-pwa/SKILL.md'],
});
const previousManagedPaths = managedPaths.slice(0, -1);
const legacyManagedPaths = [projection];
const supportedProfiles = readProfileCatalog().profiles.map(({ id }) => id);
const branchPattern = '^(feat|fix|docs|refactor|test|chore|build|ci|perf|revert)/[1-9]\\d*-[a-z0-9]+(?:-[a-z0-9]+)*$';
const authorityVersions = { productShape: '0.22.0', arcShape: '0.1.3' };
const upgradeSchema = './node_modules/@juangcarmona/lighthouse/assets/schemas/lighthouse-upgrade.schema.json';
const usage = 'Usage: lighthouse <init|create-dotnet|profiles|authorities|reconcile|upgrade|capabilities|verify> [--name <product>] [--profile <profile>] [--scope <harness|sdlc|all>] [--format <text|json>] [--dry-run] [--apply]';

const defaultRepository = () => ({
  layout: [...layout],
  publicSite: { enabled: true },
  conventions: { commits: 'conventional', branchPattern },
});

function managedPathsFor(manifest) {
  const profiles = manifest?.profiles ?? [];
  return [...managedPaths, ...profiles.flatMap((profile) => profileManagedPaths[profile] ?? [])];
}

function upgradeScopesFor(manifest) {
  return {
    harness: [projection, 'scripts/lighthouse-guard.mjs', '.husky/commit-msg', '.husky/pre-push', '.github/workflows/lighthouse.yml', ...((manifest?.profiles ?? []).flatMap((profile) => profileManagedPaths[profile] ?? []))],
    sdlc: ['.lighthouse/sdlc.json'],
  };
}

function packageAsset(packageName, entry) {
  const path = packageRequire.resolve(`${packageName}/${entry}`);
  return readFileSync(path, 'utf8');
}

function profileAssets(manifest) {
  const assets = {};
  if ((manifest?.profiles ?? []).includes('visual-theme')) {
    try {
      assets['docs/design/DESIGN.md'] = packageAsset('@juangcarmona/lighthouse-ui', 'DESIGN.md');
      assets['.agents/skills/lighthouse-ui/SKILL.md'] = packageAsset('@juangcarmona/lighthouse-ui', 'skills/ui-design/SKILL.md');
    } catch (error) {
      throw new Error(`Cannot read the installed Lighthouse UI profile: ${error.message}`);
    }
  }
  if ((manifest?.profiles ?? []).includes('dotnet-backend')) {
    const files = ['README.md', 'adoption.md', 'architecture.md', 'guardrails.md', 'practices.md', 'testing-and-development.md', 'use-cases.md', 'SKILL.md'];
    for (const file of files) {
      const target = file === 'SKILL.md' ? '.agents/skills/lighthouse-dotnet/SKILL.md' : `docs/profiles/dotnet/${file}`;
      try { assets[target] = readFileSync(new URL(`../assets/profiles/dotnet/${file}`, import.meta.url), 'utf8'); }
      catch (error) { throw new Error(`Cannot read the installed Lighthouse .NET profile: ${error.message}`); }
    }
  }
  if ((manifest?.profiles ?? []).includes('react-web-platform')) {
    const files = ['README.md', 'adoption.md', 'structure.md', 'guardrails.md', 'testing.md', 'SKILL.md'];
    for (const file of files) {
      const target = file === 'SKILL.md' ? '.agents/skills/lighthouse-react-web/SKILL.md' : `docs/profiles/react-web-platform/${file}`;
      try { assets[target] = readFileSync(new URL(`../assets/profiles/react-web-platform/${file}`, import.meta.url), 'utf8'); }
      catch (error) { throw new Error(`Cannot read the installed Lighthouse React web profile: ${error.message}`); }
    }
  }
  if ((manifest?.profiles ?? []).includes('web-bff')) {
    const files = ['README.md', 'adoption.md', 'security.md', 'testing.md', 'SKILL.md'];
    for (const file of files) {
      const target = file === 'SKILL.md' ? '.agents/skills/lighthouse-web-bff/SKILL.md' : `docs/profiles/web-bff/${file}`;
      try { assets[target] = readFileSync(new URL(`../assets/profiles/web-bff/${file}`, import.meta.url), 'utf8'); }
      catch (error) { throw new Error(`Cannot read the installed Lighthouse web BFF profile: ${error.message}`); }
    }
  }
  if ((manifest?.profiles ?? []).includes('pwa-capability')) {
    const files = ['README.md', 'adoption.md', 'guardrails.md', 'offline.md', 'testing.md', 'SKILL.md'];
    for (const file of files) {
      const target = file === 'SKILL.md' ? '.agents/skills/lighthouse-pwa/SKILL.md' : `docs/profiles/pwa-capability/${file}`;
      try { assets[target] = readFileSync(new URL(`../assets/profiles/pwa-capability/${file}`, import.meta.url), 'utf8'); }
      catch (error) { throw new Error(`Cannot read the installed Lighthouse PWA capability: ${error.message}`); }
    }
  }
  return assets;
}

function profileArguments(args) {
  const selected = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== '--profile' && !args[index].startsWith('--profile=')) continue;
    const value = args[index] === '--profile' ? args[++index] : args[index].slice('--profile='.length);
    if (!value || !supportedProfiles.includes(value)) throw new Error(`Unknown profile ${value ?? ''}; use ${supportedProfiles.join(', ')}.`);
    if (!selected.includes(value)) selected.push(value);
  }
  return selected;
}

function defaultManifest(product, profiles = []) {
  const draft = { profiles: [...profiles] };
  const packages = { sdlc: { ...sdlcPackage } };
  if (profiles.includes('visual-theme')) packages.ui = { ...uiPackage };
  return {
    $schema: './node_modules/@juangcarmona/lighthouse/assets/schemas/lighthouse-manifest.schema.json',
    schemaVersion: 1,
    baseline: '0.1.0',
    product,
    application: { shape: 'unknown', stacks: [] },
    profiles: [...profiles],
    integrations: { productShape: null, arcShape: null },
    packages,
    managed: managedPathsFor(draft),
    repository: defaultRepository(),
  };
}

function normalizeRepository(repository) {
  const value = repository && typeof repository === 'object' && !Array.isArray(repository) ? repository : {};
  return {
    layout: Array.isArray(value.layout) ? value.layout : [...layout],
    publicSite: value.publicSite && typeof value.publicSite === 'object'
      ? { enabled: value.publicSite.enabled !== false }
      : { enabled: true },
    conventions: value.conventions && typeof value.conventions === 'object'
      ? {
        commits: value.conventions.commits ?? 'conventional',
        branchPattern: value.conventions.branchPattern ?? branchPattern,
      }
      : { commits: 'conventional', branchPattern },
  };
}

function normalizeSdlcPackage(manifest) {
  const value = manifest?.packages?.sdlc;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return { name: value.name, version: value.version };
}

function sdlcContract() {
  try {
    const path = packageRequire.resolve('@juangcarmona/lighthouse-sdlc/contract.json');
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {
      routes: ['supervised', 'plan-only', 'unattended', 'hotfix', 'stacked'],
      gates: ['triaged', 'ready', 'planned', 'done'],
    };
  }
}

function sdlcCapabilityCatalog() {
  if (!sdlcCapabilities) return null;
  try {
    const path = packageRequire.resolve('@juangcarmona/lighthouse-sdlc/capabilities.json');
    const catalog = JSON.parse(readFileSync(path, 'utf8'));
    const errors = sdlcCapabilities.validateCapabilityCatalog(catalog);
    if (errors.length) throw new Error(errors.map((error) => error.message).join('; '));
    return catalog;
  } catch (error) {
    throw new Error(`Cannot read the installed SDLC capability catalog: ${error.message}`);
  }
}

function capabilityAdoption(previous = null) {
  const catalog = sdlcCapabilityCatalog();
  if (!catalog) return {};
  return Object.fromEntries(catalog.capabilities.map((capability) => {
    const current = previous?.adoption?.[capability.id];
    const status = current?.catalogVersion === catalog.package.version
      ? current.status
      : sdlcCapabilities.initialAdoptionStatus?.(capability) ?? 'pending-adoption';
    const nextAction = status === 'available'
      ? `lighthouse capabilities select --id ${capability.id} --provider ${capability.provider}`
      : ['adopted', 'declined'].includes(status)
        ? null
        : `lighthouse capabilities plan --id ${capability.id} --provider ${capability.provider} --repo <owner/repo> --plan-file .lighthouse/reconciliation/${capability.id}.plan.json`;
    return [capability.id, {
      id: capability.id,
      status,
      selection: capability.selection,
      provider: capability.provider,
      version: capability.version,
      catalogVersion: catalog.package.version,
      nextAction,
      ...(current?.recordPath ? { recordPath: current.recordPath } : {}),
    }];
  }));
}

function sdlcControlPlane(manifest) {
  const selected = normalizeSdlcPackage(manifest);
  if (!selected) return null;
  const contract = sdlcContract();
  return `${JSON.stringify({
    $schema: './node_modules/@juangcarmona/lighthouse-sdlc/schemas/control-plane.schema.json',
    schemaVersion: 1,
    package: selected,
    routes: contract.routes,
    gates: contract.gates,
    state: { provider: 'agent-host' },
    memory: { provider: 'agent-host', scopes: ['run', 'project'] },
    roles: {},
    adapters: {},
  }, null, 2)}\n`;
}

function render(manifest) {
  const repository = normalizeRepository(manifest.repository);
  const publicSite = repository.publicSite.enabled ? 'enabled' : 'disabled';
  const selectedSdlc = normalizeSdlcPackage(manifest);
  const sdlcLine = selectedSdlc ? `- SDLC package: \`${selectedSdlc.name}@${selectedSdlc.version}\`\n` : '';
  const selectedUi = manifest.packages?.ui;
  const uiLine = selectedUi ? `- UI package: \`${selectedUi.name}@${selectedUi.version}\`\n` : '';
  return `<!-- Generated by Lighthouse. Edit lighthouse.json and regenerate this file. -->\n\n# ${manifest.product} repository baseline\n\n- Baseline: \`${manifest.baseline}\`\n- Product: \`${manifest.product}\`\n- Profiles: ${manifest.profiles.length ? manifest.profiles.map((x) => `\`${x}\``).join(', ') : 'none'}\n${sdlcLine}${uiLine}- ProductShape: ${manifest.integrations.productShape ?? 'not adopted'}\n- ArcShape: ${manifest.integrations.arcShape ?? 'not adopted'}\n- Public site: \`${publicSite}\`\n- Repository roots: ${repository.layout.map((x) => `\`${x}/\``).join(', ')}\n- Commit convention: \`${repository.conventions.commits}\`\n\n## Delivery contract\n\nProductShape remains the source of product intent and Product Changes. ArcShape remains the source of architecture documentation and decisions. Lighthouse installs the repository baseline and verifies the selected integrations without replacing either authority.\n\nThe repository keeps source code in \`src/\`, documentation in \`docs/\`, infrastructure in \`infra/\` and repository automation in \`scripts/\`. A project may record a narrow, owned exception, but an initializer never overwrites an existing project file.\n\nThe selected SDLC package owns lifecycle skills, commands, meta-commands, routes and gates. The \`.lighthouse/\` control plane records the selected package and host adapters without storing agent runtime data.\n\nWhen the public site is enabled, its publication is allowed only after ProductShape and ArcShape validate successfully. A missing or invalid authority stops the build before deployment and reports the command that can repair the missing input.\n\nThis file is managed. Put repository-specific policy in its own documentation and keep this projection generated from \`lighthouse.json\`.\n`;
}

function guardrailScript(manifest) {
  const pattern = JSON.stringify(normalizeRepository(manifest.repository).conventions.branchPattern);
  return `#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const mode = process.argv[2];
const branchPattern = new RegExp(${pattern}, 'u');
function fail(message) { console.error(message); process.exit(1); }
function branch() {
  try { return execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(); }
  catch { return ''; }
}
if (mode === 'commit-msg') {
  const file = process.argv[3];
  if (!file) fail('Usage: lighthouse-guard commit-msg <message-file>');
  const message = readFileSync(file, 'utf8').split('\\n').find((line) => line.trim() && !line.startsWith('#'))?.trim() ?? '';
  if (!/^(?:feat|fix|docs|refactor|test|chore|build|ci|perf|revert)(?:\\([^)]+\\))?!?: .+/u.test(message)) fail('Commit message must follow Conventional Commits.');
} else if (mode === 'branch' || mode === 'verify') {
  const current = branch();
  if (current && !['main', 'master'].includes(current) && !branchPattern.test(current)) fail('Branch ' + current + ' does not match ' + branchPattern.source + '.');
} else fail('Usage: lighthouse-guard <commit-msg|branch|verify>');
`;
}

function commitHook() {
  return '#!/usr/bin/env sh\nset -eu\nnode scripts/lighthouse-guard.mjs commit-msg "$1"\n';
}

function prePushHook() {
  return '#!/usr/bin/env sh\nset -eu\nnode scripts/lighthouse-guard.mjs branch\n';
}

function workflow() {
  return `name: Lighthouse repository guardrails

on:
  pull_request:
    paths:
      - "lighthouse.json"
      - "LIGHTHOUSE.md"
      - "src/**"
      - "docs/**"
      - "infra/**"
      - "scripts/**"
      - ".husky/**"
      - ".github/workflows/lighthouse.yml"
  push:
    branches: [main]
    paths:
      - "lighthouse.json"
      - "LIGHTHOUSE.md"
      - "src/**"
      - "docs/**"
      - "infra/**"
      - "scripts/**"
      - ".husky/**"
      - ".github/workflows/lighthouse.yml"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  verify:
    name: Verify Lighthouse foundation
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci --ignore-scripts
      - run: |
          if [ -f scripts/lighthouse.mjs ]; then node scripts/lighthouse.mjs verify; else npx --no-install lighthouse verify; fi
      - run: node scripts/lighthouse-guard.mjs verify
`;
}

function managedFiles(manifest) {
  const files = {
    [projection]: render(manifest),
    'scripts/lighthouse-guard.mjs': guardrailScript(manifest),
    '.husky/commit-msg': commitHook(),
    '.husky/pre-push': prePushHook(),
    '.github/workflows/lighthouse.yml': workflow(),
  };
  Object.assign(files, profileAssets(manifest));
  const controlPlane = sdlcControlPlane(manifest);
  if (controlPlane) files['.lighthouse/sdlc.json'] = controlPlane;
  return files;
}

function contentHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

function upgradeState(manifest, files = managedFiles(manifest), previous = null) {
  const scopes = upgradeScopesFor(manifest);
  const entries = Object.fromEntries(Object.entries(files).map(([path, content]) => [path, {
    hash: contentHash(content),
    scope: Object.entries(scopes).find(([, paths]) => paths.includes(path))?.[0] ?? 'harness',
  }]));
  return {
    $schema: upgradeSchema,
    schemaVersion: 1,
    package: { name: cliPackage.name, version: cliPackage.version },
    baseline: manifest.baseline,
    capabilities: { harness: '1', sdlc: files['.lighthouse/sdlc.json'] ? '1' : null },
    adoption: capabilityAdoption(previous),
    projections: { harness: '1', sdlc: files['.lighthouse/sdlc.json'] ? '1' : null },
    lastAppliedMigration: previous?.lastAppliedMigration ?? 'foundation-init-1',
    files: entries,
  };
}

async function readUpgradeState() {
  try { return JSON.parse(await readFile(upgradeStatePath, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`Cannot read ${upgradeStateRelative}: ${error.message}`);
  }
}

async function writeUpgradeState(manifest, previous = null, files = managedFiles(manifest)) {
  const state = upgradeState(manifest, files, previous);
  await mkdir(dirname(upgradeStatePath), { recursive: true });
  await writeFile(upgradeStatePath, `${JSON.stringify(state, null, 2)}\n`, { flag: 'w' });
}

function stateProblems(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return [`${upgradeStateRelative} is missing; run lighthouse reconcile --apply to establish ownership evidence.`];
  const problems = [];
  if (state.schemaVersion !== 1) problems.push(`${upgradeStateRelative} has unsupported schemaVersion ${state.schemaVersion}.`);
  if (!state.package || state.package.name !== cliPackage.name || typeof state.package.version !== 'string') problems.push(`${upgradeStateRelative} does not identify the installed Lighthouse package.`);
  if (!state.files || typeof state.files !== 'object' || Array.isArray(state.files)) problems.push(`${upgradeStateRelative} does not contain file ownership evidence.`);
  return problems;
}

function scopesFromArgs(args, manifest) {
  const upgradeScopes = upgradeScopesFor(manifest);
  const selected = new Set();
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== '--scope' && !args[index].startsWith('--scope=')) continue;
    const value = args[index] === '--scope' ? args[index + 1] : args[index].slice('--scope='.length);
    if (args[index] === '--scope') index += 1;
    if (!value) throw new Error('--scope requires harness, sdlc or all');
    for (const scope of value.split(',')) {
      if (scope === 'all') { selected.add('harness'); selected.add('sdlc'); }
      else if (scope === 'harness' || scope === 'sdlc') selected.add(scope);
      else throw new Error(`Unknown upgrade scope ${scope}; use harness, sdlc or all.`);
    }
  }
  return selected.size ? selected : new Set(Object.keys(upgradeScopes));
}

function selectedPaths(scopes, manifest) {
  const upgradeScopes = upgradeScopesFor(manifest);
  return new Set([...scopes].flatMap((scope) => upgradeScopes[scope]));
}

function classifyUpgradeFile(path, current, expected, recordedHash) {
  if (current === null) return { classification: 'additive', action: 'add' };
  const currentHash = contentHash(current);
  if (current === expected && currentHash === recordedHash) return { classification: 'unchanged', action: 'keep' };
  if (current === expected && currentHash !== recordedHash) return { classification: 'adoptable', action: 'record' };
  if (recordedHash && currentHash === recordedHash) return { classification: 'adoptable', action: 'update' };
  if (recordedHash) return { classification: 'customized', action: 'preserve', reason: 'current content differs from the recorded projection' };
  return { classification: 'conflicting', action: 'review', reason: 'ownership is not recorded for this path' };
}

async function planUpgrade(manifest, scopes) {
  const state = await readUpgradeState();
  const problems = stateProblems(state);
  const files = managedFiles(manifest);
  const paths = selectedPaths(scopes, manifest);
  const upgradeScopes = upgradeScopesFor(manifest);
  const changes = [];
  for (const path of Object.keys(files).filter((candidate) => paths.has(candidate))) {
    const target = resolve(root, path);
    const current = await exists(target) ? await readFile(target, 'utf8') : null;
    const expected = files[path];
    const recordedHash = state?.files?.[path]?.hash;
    const result = classifyUpgradeFile(path, current, expected, recordedHash);
    changes.push({ path, scope: Object.entries(upgradeScopes).find(([, values]) => values.includes(path))?.[0], ...result });
  }
  if (state?.baseline && state.baseline !== manifest.baseline) {
    changes.unshift({ path: 'baseline', scope: 'harness', classification: 'breaking', action: 'review', reason: `baseline ${state.baseline} is not compatible with ${manifest.baseline}` });
  }
  return {
    source: {
      package: state?.package ?? null,
      baseline: state?.baseline ?? null,
      capabilities: state?.capabilities ?? null,
      adoption: state?.adoption ?? null,
      projections: state?.projections ?? null,
      lastAppliedMigration: state?.lastAppliedMigration ?? null,
    },
    target: {
      package: { name: cliPackage.name, version: cliPackage.version },
      baseline: manifest.baseline,
      capabilities: { harness: '1', sdlc: files['.lighthouse/sdlc.json'] ? '1' : null },
      adoption: capabilityAdoption(state),
      projections: { harness: '1', sdlc: files['.lighthouse/sdlc.json'] ? '1' : null },
    },
    scopes: [...scopes],
    prerequisites: problems.length ? [{ status: 'failed', message: problems.join(' ') }] : [{ status: 'passed', message: 'Ownership metadata is readable.' }],
    changes,
    verification: ['lighthouse verify'],
    recovery: 'Restore the pre-update commit or rerun lighthouse upgrade after resolving the reported ownership conflict.',
    adoption: {
      status: Object.values(capabilityAdoption(state)).some((item) => !['adopted', 'declined', 'available'].includes(item.status)) ? 'pending' : 'complete',
      capabilities: capabilityAdoption(state),
      externalWrites: 'none',
    },
    problems,
  };
}

function printUpgradePlan(plan) {
  console.log('Lighthouse upgrade plan:');
  console.log(`  package ${plan.source.package?.version ?? 'unknown'} -> ${plan.target.package.version}`);
  console.log(`  baseline ${plan.source.baseline ?? 'unknown'} -> ${plan.target.baseline}`);
  console.log(`  scopes ${plan.scopes.join(', ')}`);
  for (const prerequisite of plan.prerequisites) console.log(`  prerequisite ${prerequisite.status}: ${prerequisite.message}`);
  for (const change of plan.changes) console.log(`  ${change.classification} ${change.action} ${change.path}${change.reason ? ` (${change.reason})` : ''}`);
  if (plan.adoption) {
    console.log(`  capability adoption ${plan.adoption.status} (external writes: ${plan.adoption.externalWrites})`);
    for (const capability of Object.values(plan.adoption.capabilities)) {
      console.log(`  capability ${capability.id ?? capability.provider} ${capability.status}${capability.nextAction ? `; next: ${capability.nextAction}` : ''}`);
    }
  }
  if (plan.problems.length) for (const problem of plan.problems) console.error(`  adoption gap ${problem}`);
  console.log(`  verify ${plan.verification[0]}`);
  console.log(`  recovery ${plan.recovery}`);
}

function validate(manifest) {
  const problems = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return ['manifest must be an object'];
  const allowed = ['$schema', 'schemaVersion', 'baseline', 'product', 'application', 'profiles', 'integrations', 'packages', 'managed', 'repository'];
  for (const key of Object.keys(manifest)) if (!allowed.includes(key)) problems.push(`unknown field ${key}`);
  for (const key of ['schemaVersion', 'baseline', 'product', 'profiles', 'integrations', 'managed']) {
    if (!(key in manifest)) problems.push(`missing ${key}`);
  }
  if (manifest.schemaVersion !== 1) problems.push('schemaVersion must be 1');
  if (manifest.baseline !== '0.1.0') problems.push('this verifier supports baseline 0.1.0');
  if ('$schema' in manifest && typeof manifest.$schema !== 'string') problems.push('$schema must be a string');
  if (typeof manifest.product !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/.test(manifest.product)) {
    problems.push('product must be a readable name of 1–64 characters');
  }
  if ('application' in manifest) {
    const application = manifest.application;
    if (!application || typeof application !== 'object' || Array.isArray(application)
        || !['unknown', 'frontend', 'backend', 'full-stack', 'service', 'library', 'tooling', 'cli', 'worker', 'mobile'].includes(application.shape)
        || !Array.isArray(application.stacks) || application.stacks.some((stack) => typeof stack !== 'string' || !stack)
        || new Set(application.stacks).size !== application.stacks.length) {
      problems.push('application must declare a supported shape and unique stack names');
    }
  }
  const profiles = supportedProfiles;
  if (!Array.isArray(manifest.profiles) || manifest.profiles.some((p) => !profiles.includes(p))
      || new Set(manifest.profiles).size !== manifest.profiles.length) {
    problems.push('profiles must be unique supported profile names');
  }
  const integrations = manifest.integrations;
  const keys = ['productShape', 'arcShape'];
  const pin = /^(?:\d+\.\d+\.\d+|[a-f0-9]{40})$/;
  if (!integrations || typeof integrations !== 'object' || Array.isArray(integrations)
      || Object.keys(integrations).length !== keys.length
      || keys.some((key) => !(key in integrations)
        || (integrations[key] !== null && (typeof integrations[key] !== 'string' || !pin.test(integrations[key]))))) {
    problems.push('integrations must declare productShape and arcShape as exact versions, commit hashes or null');
  }
  if ('packages' in manifest) {
    const packages = manifest.packages;
    const selected = packages?.sdlc;
    const selectedUi = packages?.ui;
    const hasVisualProfile = manifest.profiles?.includes('visual-theme');
    if (!packages || typeof packages !== 'object' || Array.isArray(packages)
        || !Object.keys(packages).every((key) => ['sdlc', 'ui'].includes(key))
        || Object.keys(packages).length < 1 || Object.keys(packages).length > 2
        || !selected || typeof selected !== 'object' || Array.isArray(selected)
        || Object.keys(selected).length !== 2
        || selected.name !== sdlcPackage.name
        || typeof selected.version !== 'string' || !pin.test(selected.version)) {
      problems.push(`packages.sdlc must declare ${sdlcPackage.name} and an exact version or commit hash`);
    }
    if (hasVisualProfile && (!selectedUi || typeof selectedUi !== 'object' || Array.isArray(selectedUi)
        || Object.keys(selectedUi).length !== 2
        || selectedUi.name !== uiPackage.name
        || typeof selectedUi.version !== 'string' || !pin.test(selectedUi.version))) {
      problems.push(`packages.ui must declare ${uiPackage.name} and an exact version or commit hash when visual-theme is selected`);
    }
    if (!hasVisualProfile && selectedUi) problems.push('packages.ui requires the visual-theme profile');
  } else if (manifest.profiles?.includes('visual-theme')) {
    problems.push(`packages must declare ${sdlcPackage.name} and ${uiPackage.name} when visual-theme is selected`);
  }
  const legacyManaged = Array.isArray(manifest.managed)
    && manifest.managed.length === legacyManagedPaths.length
    && manifest.managed.every((entry, index) => entry === legacyManagedPaths[index]);
  const expectedManagedPaths = managedPathsFor(manifest);
  const completeManaged = Array.isArray(manifest.managed)
    && manifest.managed.length === expectedManagedPaths.length
    && manifest.managed.every((entry, index) => entry === expectedManagedPaths[index]);
  const profilelessManaged = Array.isArray(manifest.managed)
    && manifest.managed.length === managedPaths.length
    && manifest.managed.every((entry, index) => entry === managedPaths[index]);
  const previousCompleteManaged = Array.isArray(manifest.managed)
    && manifest.managed.length === previousManagedPaths.length
    && manifest.managed.every((entry, index) => entry === previousManagedPaths[index]);
  if (!legacyManaged && !profilelessManaged && !previousCompleteManaged && !completeManaged) {
    problems.push(`managed must be ${legacyManagedPaths.join(', ')}, the previous Lighthouse guardrail set or the selected profile set`);
  }
  if ('repository' in manifest) {
    const repository = manifest.repository;
    if (!repository || typeof repository !== 'object' || Array.isArray(repository)) {
      problems.push('repository must be an object');
    } else {
      if (!Array.isArray(repository.layout) || repository.layout.length !== layout.length
          || repository.layout.some((entry, index) => entry !== layout[index])) {
        problems.push(`repository.layout must be ${layout.map((entry) => `'${entry}'`).join(', ')}`);
      }
      if (!repository.publicSite || typeof repository.publicSite.enabled !== 'boolean') {
        problems.push('repository.publicSite.enabled must be a boolean');
      }
      if (!repository.conventions || repository.conventions.commits !== 'conventional'
          || typeof repository.conventions.branchPattern !== 'string') {
        problems.push('repository.conventions must declare conventional commits and a branchPattern');
      } else {
        try { new RegExp(repository.conventions.branchPattern, 'u'); }
        catch { problems.push('repository.conventions.branchPattern must be a valid regular expression'); }
      }
    }
  }
  return problems;
}

async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

async function isDirectory(path) {
  try { return (await stat(path)).isDirectory(); } catch { return false; }
}

async function readManifest() {
  try { return JSON.parse(await readFile(manifestPath, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw new Error(`Cannot read lighthouse.json: ${error.message}`);
  }
}

function productNameFromArgs(args) {
  const index = args.indexOf('--name');
  const value = index === -1 ? args.find((arg) => arg.startsWith('--name='))?.slice('--name='.length) : args[index + 1];
  if (index === -1 && !value) return basename(root).replace(/[^A-Za-z0-9 ._-]/gu, '').slice(0, 64) || 'adopter';
  if (!value) throw new Error('--name requires a product name');
  return value;
}

async function planInitialization(manifest, manifestMissing) {
  const operations = [];
  const conflicts = [];
  if (manifestMissing) operations.push({ path: 'lighthouse.json', action: 'create' });
  const files = managedFiles(manifest);
  const directories = new Set(normalizeRepository(manifest.repository).layout);
  for (const file of Object.keys(files)) {
    let directory = dirname(file);
    while (directory !== '.') {
      directories.add(directory);
      directory = dirname(directory);
    }
  }
  for (const directory of [...directories].sort((left, right) => left.split('/').length - right.split('/').length)) {
    const path = resolve(root, directory);
    if (!(await exists(path))) operations.push({ path: `${directory}/`, action: 'create' });
    else if (!(await isDirectory(path))) conflicts.push(`${directory} exists but is not a directory`);
  }
  for (const file of Object.keys(files)) {
    if (await exists(resolve(root, file))) conflicts.push(`${file} already exists; refusing to overwrite it`);
    else operations.push({ path: file, action: 'create' });
  }
  if (await exists(upgradeStatePath)) conflicts.push(`${upgradeStateRelative} already exists; refusing to overwrite it`);
  else operations.push({ path: upgradeStateRelative, action: 'create' });
  return { operations, conflicts };
}

async function planReconciliation(manifest) {
  const operations = [];
  const conflicts = [];
  for (const [path, expected] of Object.entries(managedFiles(manifest))) {
    const target = resolve(root, path);
    if (!(await exists(target))) {
      operations.push({ path, action: 'create', content: expected });
      continue;
    }
    try {
      const current = await readFile(target, 'utf8');
      if (current === expected) operations.push({ path, action: 'unchanged' });
      else conflicts.push(`${path} exists with different content; refusing to overwrite it`);
    } catch {
      conflicts.push(`${path} exists but is not a readable file; refusing to overwrite it`);
    }
  }
  if (!(await exists(upgradeStatePath))) {
    operations.push({ path: upgradeStateRelative, action: 'create', content: `${JSON.stringify(upgradeState(manifest), null, 2)}\n` });
  }
  return { operations, conflicts };
}

function printReconciliationPlan(plan) {
  console.log('Lighthouse reconciliation plan:');
  for (const operation of plan.operations) console.log(`  ${operation.action} ${operation.path}`);
  for (const conflict of plan.conflicts) console.error(`  conflict ${conflict}`);
}

async function initialize(args) {
  let manifest = await readManifest();
  const manifestMissing = !manifest;
  const selectedProfiles = profileArguments(args);
  if (!manifest) manifest = defaultManifest(productNameFromArgs(args), selectedProfiles);
  else if (selectedProfiles.some((profile) => !(manifest.profiles ?? []).includes(profile))) {
    const missing = selectedProfiles.filter((profile) => !(manifest.profiles ?? []).includes(profile));
    throw new Error(`The existing lighthouse.json does not select ${missing.join(', ')}; edit its profiles and rerun lighthouse init.`);
  }
  const problems = validate(manifest);
  if (problems.length) throw new Error(problems.map((problem) => `Invalid lighthouse.json: ${problem}`).join('\n'));
  const plan = await planInitialization(manifest, manifestMissing);
  console.log('Lighthouse initialization plan:');
  for (const operation of plan.operations) console.log(`  ${operation.action} ${operation.path}`);
  for (const conflict of plan.conflicts) console.error(`  conflict ${conflict}`);
  if (normalizeRepository(manifest.repository).publicSite.enabled) {
    if (manifest.integrations.productShape === null) console.log('  adoption gap ProductShape: review lighthouse authorities --dry-run, then run lighthouse authorities --apply');
    if (manifest.integrations.arcShape === null) console.log('  adoption gap ArcShape: review lighthouse authorities --dry-run, then run lighthouse authorities --apply');
  }
  if (args.includes('--dry-run')) {
    if (plan.conflicts.length) process.exitCode = 1;
    return;
  }
  if (plan.conflicts.length) throw new Error('Initialization stopped; resolve the reported conflicts and run lighthouse init again.');
  if (manifestMissing) await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  for (const operation of plan.operations.filter((item) => item.path.endsWith('/'))) {
    await mkdir(resolve(root, operation.path), { recursive: true });
  }
  const files = managedFiles(manifest);
  for (const [file, content] of Object.entries(files)) {
    await writeFile(resolve(root, file), content, { flag: 'wx', mode: file.startsWith('.husky/') ? 0o755 : 0o644 });
    if (file.startsWith('.husky/')) await chmod(resolve(root, file), 0o755);
  }
  await writeUpgradeState(manifest, null, files);
  try {
    const configured = execFileSync('git', ['config', '--get', 'core.hooksPath'], { cwd: root, encoding: 'utf8' }).trim();
    if (!configured) execFileSync('git', ['config', 'core.hooksPath', '.husky'], { cwd: root, stdio: 'ignore' });
  } catch { /* A non-git target can adopt the hooks when it creates its repository. */ }
  console.log(`Initialized ${manifest.product}. Review lighthouse.json and the managed guardrails, then run lighthouse verify.`);
}

async function reconcile(args) {
  const manifest = await readManifest();
  if (!manifest) throw new Error('Cannot read lighthouse.json: file does not exist; run lighthouse init --name <product>.');
  const problems = validate(manifest);
  if (problems.length) throw new Error(problems.map((problem) => `Invalid lighthouse.json: ${problem}`).join('\n'));
  const plan = await planReconciliation(manifest);
  printReconciliationPlan(plan);
  const apply = args.includes('--apply');
  const dryRun = args.includes('--dry-run') || !apply;
  if (args.includes('--apply') && args.includes('--dry-run')) throw new Error('--apply and --dry-run cannot be used together.');
  if (plan.conflicts.length) {
    if (dryRun) process.exitCode = 1;
    else throw new Error('Reconciliation stopped; resolve the reported conflicts and run lighthouse reconcile again.');
    return;
  }
  if (dryRun) {
    console.log('Dry run: nothing was changed. Re-run with --apply to create missing managed paths.');
    return;
  }
  for (const operation of plan.operations.filter((item) => item.action === 'create')) {
    await mkdir(dirname(resolve(root, operation.path)), { recursive: true });
    try {
      await writeFile(resolve(root, operation.path), operation.content, { flag: 'wx', mode: operation.path.startsWith('.husky/') ? 0o755 : 0o644 });
      if (operation.path.startsWith('.husky/')) await chmod(resolve(root, operation.path), 0o755);
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error(`Reconciliation stopped; ${operation.path} appeared during the plan.`);
      throw error;
    }
  }
  console.log('Reconciled missing Lighthouse-managed paths. Run lighthouse verify to check the complete projection.');
}

async function writeTextAtomically(path, content) {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, content, { flag: 'wx' });
  await rename(temporary, path);
}

async function applyUpgrade(manifest, plan) {
  if (plan.problems.length) throw new Error(`Upgrade stopped; ${plan.problems.join(' ')}`);
  const blocked = plan.changes.filter((change) => ['conflicting', 'breaking'].includes(change.classification));
  if (blocked.length) throw new Error(`Upgrade stopped; resolve ownership conflicts for: ${blocked.map((change) => change.path).join(', ')}.`);
  const files = managedFiles(manifest);
  const previous = await readUpgradeState();
  const snapshots = new Map();
  const updates = plan.changes.filter((change) => ['add', 'update', 'record'].includes(change.action));
  for (const change of updates) {
    const target = resolve(root, change.path);
    snapshots.set(change.path, await exists(target) ? await readFile(target, 'utf8') : null);
  }
  const stateSnapshot = await readFile(upgradeStatePath, 'utf8');
  try {
    for (const change of updates) {
      const target = resolve(root, change.path);
      await mkdir(dirname(target), { recursive: true });
      await writeTextAtomically(target, files[change.path]);
    }
    const next = upgradeState(manifest, files, { ...previous, lastAppliedMigration: `upgrade-${cliPackage.version}` });
    for (const path of Object.keys(next.files)) {
      const selected = plan.changes.find((change) => change.path === path);
      if (!selected || selected.action === 'preserve' || selected.action === 'review') {
        if (previous.files?.[path]) next.files[path] = previous.files[path];
        else delete next.files[path];
      }
    }
    next.lastAppliedMigration = `upgrade-${cliPackage.version}`;
    await writeTextAtomically(upgradeStatePath, `${JSON.stringify(next, null, 2)}\n`);
  } catch (error) {
    for (const [path, content] of snapshots) {
      const target = resolve(root, path);
      if (content === null) await rm(target, { force: true });
      else await writeFile(target, content);
    }
    await writeFile(upgradeStatePath, stateSnapshot);
    throw new Error(`Upgrade rolled back: ${error.message}`);
  }
  const preserved = plan.changes.filter((change) => change.classification === 'customized').map((change) => change.path);
  console.log(`Applied Lighthouse upgrade ${cliPackage.version}. Run lighthouse verify to check the result.`);
  if (preserved.length) console.log(`Preserved customized paths for review: ${preserved.join(', ')}`);
}

async function upgrade(args) {
  const manifest = await readManifest();
  if (!manifest) throw new Error('Cannot read lighthouse.json: file does not exist; run lighthouse init --name <product>.');
  const problems = validate(manifest);
  if (problems.length) throw new Error(problems.map((problem) => `Invalid lighthouse.json: ${problem}`).join('\n'));
  const plan = await planUpgrade(manifest, scopesFromArgs(args, manifest));
  const format = formatFromArgs(args);
  const apply = args.includes('--apply');
  const dryRun = args.includes('--dry-run') || !apply;
  if (args.includes('--apply') && args.includes('--dry-run')) throw new Error('--apply and --dry-run cannot be used together.');
  if (format === 'json' && apply) throw new Error('--format json is available for dry-run upgrade plans; use text when applying.');
  if (format === 'json') console.log(JSON.stringify(plan, null, 2));
  else printUpgradePlan(plan);
  if (dryRun) {
    if (format !== 'json') console.log('Dry run: nothing was changed. Re-run with --apply after reviewing the plan.');
    if (plan.problems.length) process.exitCode = 1;
    return;
  }
  await applyUpgrade(manifest, plan);
}

const authorityCommands = [
  {
    label: 'ProductShape',
    packageName: '@prodshape/cli',
    command: 'prodshape',
    initArgs: ['init', '--full', '--sdd', 'none', '--gitignore'],
    repair: 'prodshape init --full --sdd none --gitignore',
  },
  {
    label: 'ArcShape',
    packageName: '@arcshape/cli',
    command: 'arcshape',
    initArgs: ['init', '--no-agents'],
    applyArgs: ['init', '--no-agents', '--yes'],
    repair: 'arcshape init --no-agents --yes',
  },
];

function providerExecutable(authority) {
  const packageJson = packageRequire.resolve(`${authority.packageName}/package.json`);
  const metadata = JSON.parse(readFileSync(packageJson, 'utf8'));
  const binary = typeof metadata.bin === 'string' ? metadata.bin : metadata.bin?.[authority.command];
  if (!binary) throw new Error(`${authority.packageName} does not declare a ${authority.command} executable`);
  return resolve(dirname(packageJson), binary);
}

function providerHasConflict(output) {
  return output.split('\n').some((line) => /^\s*conflict\b/i.test(line))
    || /Conflicts\s*\(\s*[1-9]\d*\s*\)/i.test(output);
}

function runAuthorityCommand(authority, dryRun) {
  const initArgs = dryRun ? authority.initArgs : (authority.applyArgs ?? authority.initArgs);
  const args = [providerExecutable(authority), ...initArgs];
  if (dryRun) args.push('--dry-run');
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  console.log(`\n${authority.label} ${dryRun ? 'preflight' : 'apply'}:`);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return {
    ok: result.status === 0 && !providerHasConflict(output),
    output,
    status: result.status,
  };
}

async function writeManifestAtomically(manifest) {
  const temporary = `${manifestPath}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  await rename(temporary, manifestPath);
}

async function ensureProjectionReady(manifest) {
  const target = resolve(root, projection);
  try {
    const current = await readFile(target, 'utf8');
    if (current !== render(manifest)) {
      throw new Error(`${projection} has drifted; regenerate it from lighthouse.json before running lighthouse authorities --apply.`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function writeProjection(manifest) {
  const target = resolve(root, projection);
  await writeFile(target, render(manifest), { flag: 'w' });
}

async function authorities(args) {
  const manifest = await readManifest();
  if (!manifest) throw new Error('Cannot read lighthouse.json: file does not exist; run lighthouse init --name <product>.');
  const problems = validate(manifest);
  if (problems.length) throw new Error(problems.map((problem) => `Invalid lighthouse.json: ${problem}`).join('\n'));
  const apply = args.includes('--apply');
  const dryRun = args.includes('--dry-run') || !apply;
  if (args.includes('--apply') && args.includes('--dry-run')) throw new Error('--apply and --dry-run cannot be used together.');
  console.log('Lighthouse authority plan:');
  console.log('  ProductShape: initialize the full ProductShape layout without an SDD integration');
  console.log('  ArcShape: initialize arc42 documentation without installing agent capabilities');
  console.log('  Provider-owned files remain under provider control; Lighthouse records only exact versions.');
  const preflights = authorityCommands.map((authority) => ({ authority, result: runAuthorityCommand(authority, true) }));
  const failed = preflights.filter(({ result }) => !result.ok);
  if (failed.length) {
    throw new Error(failed.map(({ authority }) => `${authority.label} preflight failed; repair with: ${authority.repair}`).join('\n'));
  }
  if (dryRun) {
    console.log('Dry run: nothing was changed. Re-run with --apply to apply both provider plans.');
    return;
  }
  await ensureProjectionReady(manifest);
  for (const authority of authorityCommands) {
    const result = runAuthorityCommand(authority, false);
    if (!result.ok) throw new Error(`${authority.label} apply failed; repair with: ${authority.repair}`);
  }
  const updated = {
    ...manifest,
    integrations: { ...manifest.integrations, ...authorityVersions },
  };
  await writeManifestAtomically(updated);
  await writeProjection(updated);
  console.log(`Recorded ProductShape ${authorityVersions.productShape} and ArcShape ${authorityVersions.arcShape} in lighthouse.json.`);
}

function gitBranch() {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  }
  catch { return ''; }
}

function validateGitConventions(repository) {
  const problems = [];
  const branch = gitBranch();
  if (branch && !['main', 'master'].includes(branch) && !new RegExp(repository.conventions.branchPattern, 'u').test(branch)) {
    problems.push(`branch ${branch} does not match ${repository.conventions.branchPattern}`);
  }
  const message = process.env.LIGHTHOUSE_COMMIT_MESSAGE;
  if (message && repository.conventions.commits === 'conventional'
      && !/^(?:feat|fix|docs|refactor|test|chore|build|ci|perf|revert)(?:\([^)]+\))?!?: .+/u.test(message.trim())) {
    problems.push('commit message does not follow Conventional Commits');
  }
  return problems;
}

async function verify(manifest, format = 'text') {
  const manifestProblems = validate(manifest);
  const validManifest = manifestProblems.length === 0;
  const repository = normalizeRepository(manifest?.repository);
  const managed = validManifest ? managedFiles(manifest) : {};
  const report = await evaluateGuardrails({
    catalog: readGuardrailCatalog(),
    manifest,
    manifestProblems,
    repository,
    managedFiles: managed,
    resolve: (path) => resolve(root, path),
    exists,
    isDirectory,
    readFile,
    validateGitConventions,
    branch: gitBranch(),
    uiTokens: manifest?.profiles?.includes('visual-theme') ? packageAsset('@juangcarmona/lighthouse-ui', 'tokens.css') : null,
  });
  const profileComposition = composeProfiles(readProfileCatalog(), manifest);
  report.profiles = profileComposition;
  const profileResult = profileCompositionResult(profileComposition);
  report.results.push(profileResult);
  report.summary[profileResult.status] = (report.summary[profileResult.status] ?? 0) + 1;
  const adoption = Object.values(capabilityAdoption(await readUpgradeState()));
  for (const item of adoption) {
    if (item.status !== 'adopted' || !item.recordPath || await exists(resolve(root, item.recordPath))) continue;
    item.status = 'failed';
    item.nextAction = `lighthouse capabilities plan --id ${item.id} --provider ${item.provider} --repo <owner/repo> --plan-file .lighthouse/reconciliation/${item.id}.plan.json`;
  }
  if (adoption.length) {
    const pending = adoption.filter((item) => !['adopted', 'declined', 'available'].includes(item.status));
    const available = adoption.some((item) => item.status === 'available');
    const declined = adoption.some((item) => item.status === 'declined');
    report.results.push({
      id: 'foundation.capability-adoption',
      owner: '@juangcarmona/lighthouse-sdlc',
      level: 'recommended',
      kind: 'hard',
      verification: 'deterministic',
      status: pending.length ? 'unconfigured' : available || declined ? 'not-applicable' : 'passed',
      adoptionStatus: pending.length ? pending[0].status : available ? 'available' : declined ? 'declined' : 'adopted',
      evidence: adoption.map((item) => ({ capability: item.id, catalogVersion: item.catalogVersion })),
      problems: pending.map((item) => `${item.id} is ${item.status}; run ${item.nextAction}`),
      nextAction: pending[0]?.nextAction ?? null,
    });
    report.summary.unconfigured = (report.summary.unconfigured ?? 0) + (pending.length ? 1 : 0);
  }
  if (format === 'json') {
    console.log(JSON.stringify(report, null, 2));
    if (report.problems.length) process.exitCode = 1;
    return;
  }
  if (report.problems.length) throw new Error(report.problems.join('\n'));
  console.log('Lighthouse manifest, repository boundaries and managed projection are valid.');
}

async function profiles(manifest, format = 'text') {
  const composition = composeProfiles(readProfileCatalog(), manifest);
  if (format === 'json') {
    console.log(JSON.stringify(composition, null, 2));
    if (composition.status === 'failed') process.exitCode = 1;
    return;
  }
  console.log(`Lighthouse profile composition: ${composition.status}`);
  console.log(`  application ${composition.application.shape}${composition.application.stacks.length ? ` (${composition.application.stacks.join(', ')})` : ''}`);
  for (const profile of composition.selected) console.log(`  ${profile.id}: ${profile.status}${profile.nextAction ? `; next: ${profile.nextAction}` : ''}`);
  if (!composition.selected.length) console.log('  no profiles selected');
  if (composition.status === 'failed') process.exitCode = 1;
}

function planHash(plan) {
  const { authorization, ...payload } = plan;
  return contentHash(JSON.stringify(payload));
}

function capabilityPlanText(plan) {
  const lines = [
    `Capability adoption: ${plan.status}`,
    `Capability: ${plan.capability.id}@${plan.capability.version} (${plan.capability.provider})`,
    `Repository: ${plan.repository.repo}`,
    `Remote writes: none`,
    `Authorization: ${plan.authorization.planHash}`,
  ];
  for (const change of plan.reconciliation.changes) lines.push(`  ${change.status} ${change.name}`);
  if (plan.nextAction) lines.push(`Next: ${plan.nextAction}`);
  return `${lines.join('\n')}\n`;
}

async function writeCapabilityPlan(path, plan) {
  const target = resolve(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeTextAtomically(target, `${JSON.stringify(plan, null, 2)}\n`);
}

async function writeCapabilityEvidence(plan, status, extra = {}) {
  const path = resolve(root, '.lighthouse/reconciliation', `${plan.capability.id}.json`);
  await mkdir(dirname(path), { recursive: true });
  const evidence = {
    schemaVersion: 1,
    capability: plan.capability,
    catalogVersion: plan.catalogVersion,
    provider: plan.repository,
    desiredHash: plan.reconciliation.desiredHash,
    observedHash: extra.observedHash ?? plan.reconciliation.observedHash,
    targetHash: extra.targetHash ?? plan.reconciliation.targetHash,
    operations: extra.operations ?? plan.reconciliation.operations,
    operationPolicy: plan.reconciliation.operationPolicy ?? plan.operationPolicy ?? null,
    blockedOperations: extra.blockedOperations ?? plan.reconciliation.blockedOperations ?? [],
    conflicts: extra.conflicts ?? plan.reconciliation.changes.filter((change) => change.status === 'conflict'),
    status,
    verified: status === 'adopted',
  };
  await writeTextAtomically(path, `${JSON.stringify(evidence, null, 2)}\n`);
  return path;
}

async function capabilities(args) {
  const action = args[0];
  const id = args.includes('--id') ? args[args.indexOf('--id') + 1] : args.find((arg) => arg.startsWith('--id='))?.slice(5) ?? 'labels';
  const provider = args.includes('--provider') ? args[args.indexOf('--provider') + 1] : args.find((arg) => arg.startsWith('--provider='))?.slice(11) ?? 'github';
  const repo = args.includes('--repo') ? args[args.indexOf('--repo') + 1] : args.find((arg) => arg.startsWith('--repo='))?.slice(7);
  const inputPath = args.includes('--input') ? args[args.indexOf('--input') + 1] : args.find((arg) => arg.startsWith('--input='))?.slice(8);
  const format = formatFromArgs(args);
  const planFile = args.includes('--plan-file') ? args[args.indexOf('--plan-file') + 1] : args.find((arg) => arg.startsWith('--plan-file='))?.slice(12);
  if (['select', 'decline'].includes(action)) {
    const catalog = sdlcCapabilityCatalog();
    if (!catalog) throw new Error('The installed SDLC package does not publish the capability adoption contract; upgrade it before selecting capabilities.');
    const capability = catalog.capabilities.find((item) => item.id === id && item.provider === provider);
    if (!capability) throw new Error(`Capability ${id} for provider ${provider} is not declared by the installed SDLC package.`);
    const state = await readUpgradeState();
    if (!state) throw new Error('Cannot select a capability before Lighthouse ownership evidence exists; run lighthouse init or reconcile --apply.');
    state.adoption = state.adoption ?? {};
    const status = action === 'decline' ? 'declined' : 'pending-adoption';
    state.adoption[id] = {
      id,
      status,
      selection: capability.selection,
      provider: capability.provider,
      version: capability.version,
      catalogVersion: catalog.package.version,
      nextAction: status === 'declined' ? null : `lighthouse capabilities plan --id ${id} --provider ${provider} --repo <owner/repo> --plan-file .lighthouse/reconciliation/${id}.plan.json`,
    };
    await writeTextAtomically(upgradeStatePath, `${JSON.stringify(state, null, 2)}\n`);
    const result = { schemaVersion: 1, capability: id, provider, status, applied: true };
    if (format === 'json') console.log(JSON.stringify(result, null, 2)); else console.log(`Capability ${id}: ${status}.`);
    return;
  }
  if (action === 'plan') {
    if (!repo || !planFile) throw new Error('Usage: lighthouse capabilities plan --id <capability> --provider github --repo <owner/repo> --plan-file <path> [--input <capabilities.json>] [--format <text|json>]');
    const catalog = sdlcCapabilityCatalog();
    if (!catalog || !sdlcCapabilities || !sdlcReconcile || !sdlcGithub) throw new Error('The installed SDLC package does not publish the capability adoption contract; upgrade it before planning adoption.');
    const capability = catalog.capabilities.find((item) => item.id === id && item.provider === provider);
    if (!capability) throw new Error(`Capability ${id} for provider ${provider} is not declared by the installed SDLC package.`);
    const declaration = inputPath ? JSON.parse(await readFile(resolve(root, inputPath), 'utf8')) : sdlcCapabilities.declarationFromCatalog(catalog, id);
    const labels = await sdlcGithub.readGithubLabels(repo);
    const reconciliation = sdlcReconcile.buildLabelReconciliationPlan(declaration, labels, await (async () => {
      const path = resolve(root, '.lighthouse/reconciliation', `${id}.json`);
      try { return JSON.parse(await readFile(path, 'utf8')); } catch { return null; }
    })());
    const plan = {
      schemaVersion: 1,
      status: reconciliation.status,
      capability: { id: capability.id, provider: capability.provider, selection: capability.selection, version: capability.version },
      catalogVersion: catalog.package.version,
      operationPolicy: capability.operations,
      repository: { provider, repo },
      declaration,
      reconciliation,
      authorization: { required: true, planHash: '' },
      nextAction: reconciliation.canApply ? `lighthouse capabilities apply --plan-file ${planFile} --authorize <plan-hash>` : 'Resolve the reported conflicts before authorizing this plan.',
    };
    plan.authorization.planHash = planHash(plan);
    await writeCapabilityPlan(planFile, plan);
    if (format === 'json') console.log(JSON.stringify(plan, null, 2)); else process.stdout.write(capabilityPlanText(plan));
    if (!reconciliation.valid || !reconciliation.canApply) process.exitCode = 1;
    return;
  }
  if (action === 'apply') {
    const authorization = args.includes('--authorize') ? args[args.indexOf('--authorize') + 1] : args.find((arg) => arg.startsWith('--authorize='))?.slice(12);
    if (!planFile || !authorization) throw new Error('Usage: lighthouse capabilities apply --plan-file <path> --authorize <plan-hash> [--format <text|json>]');
    const plan = JSON.parse(await readFile(resolve(root, planFile), 'utf8'));
    if (authorization !== plan.authorization?.planHash || planHash(plan) !== authorization) throw new Error('Capability plan authorization does not match the plan file; generate a new plan.');
    if (!plan.reconciliation?.canApply) throw new Error('Capability plan is blocked; resolve its conflicts and generate a new plan.');
    if (!sdlcReconcile || !sdlcGithub) throw new Error('The installed SDLC package does not publish the capability adoption contract; upgrade it before applying adoption.');
    const current = await sdlcGithub.readGithubLabels(plan.repository.repo);
    let reconciliation = sdlcReconcile.buildLabelReconciliationPlan(plan.declaration, current, plan.reconciliation.record);
    const originalOperations = new Set(plan.reconciliation.operations.map((operation) => operation.name));
    const plannedTarget = new Map((plan.reconciliation.target ?? []).map((label) => [label.name, JSON.stringify(label)]));
    const outsidePlanDrift = current.some((label) => !plannedTarget.has(label.name) || (plannedTarget.has(label.name) && !originalOperations.has(label.name) && JSON.stringify(label) !== plannedTarget.get(label.name)));
    if (reconciliation.observedHash !== plan.reconciliation.observedHash && (outsidePlanDrift || reconciliation.operations.some((operation) => !originalOperations.has(operation.name)))) {
      throw new Error('GitHub labels changed outside this plan; refusing to apply. Generate a new plan.');
    }
    const completed = [];
    try {
      for (const operation of reconciliation.operations) {
        await sdlcGithub.createGithubLabel(plan.repository.repo, operation, { dryRun: false });
        completed.push(operation);
      }
    } catch (error) {
      await writeCapabilityEvidence(plan, 'failed', { operations: completed, observedHash: reconciliation.observedHash });
      throw new Error(`Capability adoption stopped after ${completed.length} operation(s): ${error.message}`);
    }
    const finalLabels = await sdlcGithub.readGithubLabels(plan.repository.repo);
    const final = sdlcReconcile.buildLabelReconciliationPlan(plan.declaration, finalLabels, plan.reconciliation.record);
    if (!final.valid || final.operations.length || final.changes.some((change) => change.status === 'conflict')) {
      await writeCapabilityEvidence(plan, 'blocked', { operations: completed, observedHash: final.observedHash, targetHash: final.targetHash, conflicts: final.changes.filter((change) => change.status === 'conflict') });
      throw new Error('Capability adoption did not reach the declared state; inspect the evidence and generate a new plan.');
    }
    const evidencePath = await writeCapabilityEvidence(plan, 'adopted', { operations: completed, observedHash: final.observedHash, targetHash: final.targetHash });
    const state = await readUpgradeState();
    if (state) {
      state.adoption = state.adoption ?? {};
      state.adoption[id] = { id, status: 'adopted', selection: plan.capability.selection, provider: plan.capability.provider, version: plan.capability.version, catalogVersion: plan.catalogVersion, nextAction: null, recordPath: '.lighthouse/reconciliation/labels.json' };
      await writeTextAtomically(upgradeStatePath, `${JSON.stringify(state, null, 2)}\n`);
    }
    const result = { ...plan, status: 'adopted', evidencePath, reconciliation: final, applied: true };
    if (format === 'json') console.log(JSON.stringify(result, null, 2)); else process.stdout.write(capabilityPlanText(result));
    return;
  }
  throw new Error('Usage: lighthouse capabilities <select|decline|plan|apply> ...');
}

function formatFromArgs(args) {
  const index = args.indexOf('--format');
  if (index !== -1) return args[index + 1];
  return args.find((arg) => arg.startsWith('--format='))?.slice('--format='.length) ?? 'text';
}

const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);
if (command === 'create-dotnet') {
  process.argv.splice(2, 1);
  await import('./create-dotnet.mjs');
  process.exit(0);
}
let invalidArgument = false;
for (let index = 0; index < commandArgs.length; index += 1) {
  const arg = commandArgs[index];
  if (command === 'capabilities' && index === 0 && ['select', 'decline', 'plan', 'apply'].includes(arg)) continue;
  if (arg === '--dry-run') continue;
  if (arg === '--apply') { if (!['authorities', 'reconcile', 'upgrade'].includes(command)) invalidArgument = true; continue; }
  if (arg === '--name') { if (!commandArgs[index + 1]) invalidArgument = true; else index += 1; continue; }
  if (arg.startsWith('--name=') && arg.length > '--name='.length) continue;
  if (arg === '--profile') {
    if (command !== 'init' || !commandArgs[index + 1]) invalidArgument = true;
    else index += 1;
    continue;
  }
  if (arg.startsWith('--profile=') && arg.length > '--profile='.length) {
    if (command !== 'init') invalidArgument = true;
    continue;
  }
  if (arg === '--format') {
    if (!['profiles', 'verify', 'upgrade', 'capabilities'].includes(command) || !['text', 'json'].includes(commandArgs[index + 1])) invalidArgument = true;
    else index += 1;
    continue;
  }
  if (arg.startsWith('--format=') && ['text', 'json'].includes(arg.slice('--format='.length))) {
    if (!['profiles', 'verify', 'upgrade', 'capabilities'].includes(command)) invalidArgument = true;
    continue;
  }
  if (arg === '--scope') {
    if (command !== 'upgrade' || !commandArgs[index + 1]) invalidArgument = true;
    else index += 1;
    continue;
  }
  if (arg.startsWith('--scope=') && arg.length > '--scope='.length) {
    if (command !== 'upgrade') invalidArgument = true;
    continue;
  }
  if (['--id', '--provider', '--repo', '--input', '--plan-file', '--authorize'].includes(arg)) {
    if (!commandArgs[index + 1]) invalidArgument = true;
    else index += 1;
    continue;
  }
  if (['--id=', '--provider=', '--repo=', '--input=', '--plan-file=', '--authorize='].some((prefix) => arg.startsWith(prefix) && arg.length > prefix.length)) continue;
  invalidArgument = true;
}
if (!['init', 'profiles', 'authorities', 'reconcile', 'upgrade', 'capabilities', 'verify'].includes(command) || invalidArgument) {
  console.error(usage);
  process.exit(2);
}
try {
  if (command === 'init') await initialize(args.slice(1));
  else if (command === 'authorities') await authorities(args.slice(1));
  else if (command === 'reconcile') await reconcile(args.slice(1));
  else if (command === 'upgrade') await upgrade(args.slice(1));
  else if (command === 'capabilities') await capabilities(args.slice(1));
  else if (command === 'profiles') {
    const manifest = await readManifest();
    if (!manifest) throw new Error('Cannot read lighthouse.json: file does not exist; run lighthouse init --name <product>.');
    await profiles(manifest, formatFromArgs(commandArgs));
  }
  else {
    const manifest = await readManifest();
    if (!manifest) throw new Error('Cannot read lighthouse.json: file does not exist; run lighthouse init --name <product>.');
    await verify(manifest, formatFromArgs(commandArgs));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
