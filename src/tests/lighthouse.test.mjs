import test from 'node:test';
import assert from 'node:assert/strict';
import { access, chmod, cp, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { initialReviewStatus, readGuardrailCatalog } from '../packages/cli/src/guardrails.mjs';
import { composeProfiles, readProfileCatalog } from '../packages/cli/src/profiles.mjs';

const tool = new URL('../packages/cli/src/lighthouse.mjs', import.meta.url).pathname;
const sdlcPackage = JSON.parse(await readFile(new URL('../packages/sdlc/package.json', import.meta.url), 'utf8'));
const uiPackage = JSON.parse(await readFile(new URL('../packages/ui/package.json', import.meta.url), 'utf8'));
const manifest = {
  schemaVersion: 1,
  baseline: '0.1.0',
  product: 'fixture',
  profiles: [],
  integrations: { productShape: null, arcShape: null },
  managed: ['LIGHTHOUSE.md'],
  repository: {
    layout: ['src', 'docs', 'infra', 'scripts'],
    publicSite: { enabled: false },
    conventions: {
      commits: 'conventional',
      branchPattern: '^(feat|fix|docs|refactor|test|chore|build|ci|perf|revert)/[1-9]\\d*-[a-z0-9]+(?:-[a-z0-9]+)*$'
    }
  }
};
async function fixture() { const dir = await mkdtemp(join(tmpdir(), 'lighthouse-test-')); await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(manifest)); return dir; }
function run(dir, command, args = [], options = {}) { return spawnSync(process.execPath, [tool, command, ...args], { cwd: dir, encoding: 'utf8', ...options, env: { ...process.env, ...options.env } }); }

test('init creates a projection and refuses to overwrite product work', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    assert.equal(run(dir, 'verify').status, 0);
    assert.match(await readFile(join(dir, 'LIGHTHOUSE.md'), 'utf8'), /# fixture repository baseline/);
    for (const file of ['scripts/lighthouse-guard.mjs', '.husky/commit-msg', '.husky/pre-push', '.github/workflows/lighthouse.yml']) {
      await access(join(dir, file));
    }
    const guard = join(dir, 'scripts/lighthouse-guard.mjs');
    assert.equal(spawnSync(process.execPath, [guard, 'verify'], { cwd: dir }).status, 0);
    const message = join(dir, 'message.txt');
    await writeFile(message, 'feat: add a fixture\n');
    assert.equal(spawnSync(process.execPath, [guard, 'commit-msg', message], { cwd: dir }).status, 0);
    await writeFile(message, 'not conventional\n');
    assert.notEqual(spawnSync(process.execPath, [guard, 'commit-msg', message], { cwd: dir }).status, 0);
    const again = run(dir, 'init');
    assert.equal(again.status, 1);
    assert.match(again.stderr, /refusing to overwrite/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('verify reports projection drift and invalid manifests', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    await writeFile(join(dir, 'LIGHTHOUSE.md'), 'product edit');
    assert.match(run(dir, 'verify').stderr, /drifted/);
    await writeFile(join(dir, 'lighthouse.json'), '{"schemaVersion":2}');
    assert.match(run(dir, 'verify').stderr, /Invalid lighthouse.json/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('manifest cannot advertise unsupported checks or unverified managed files', async () => {
  const dir = await fixture();
  try {
    for (const changed of [
      { ...manifest, profiles: ['imaginary-profile'] },
      { ...manifest, managed: ['LIGHTHOUSE.md', 'unverified.md'] },
      { ...manifest, baseline: '99.0.0' },
      { ...manifest, integrations: { ...manifest.integrations, arcShape: 'latest' } },
      { ...manifest, integrations: { ...manifest.integrations, agenticSdlc: null } },
      { ...manifest, unexpected: true }
    ]) {
      await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(changed));
      const result = run(dir, 'verify');
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Invalid lighthouse.json/);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('greenfield init creates the repository boundaries and a default manifest', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-greenfield-'));
  try {
    const result = spawnSync(process.execPath, [tool, 'init', '--name', 'Greenfield'], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    for (const directory of ['src', 'docs', 'infra', 'scripts']) assert.equal((await stat(join(dir, directory))).isDirectory(), true);
    const generated = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    assert.equal(generated.repository.publicSite.enabled, true);
    assert.deepEqual(generated.application, { shape: 'unknown', stacks: [] });
    assert.deepEqual(generated.packages.sdlc, { name: sdlcPackage.name, version: sdlcPackage.version });
    assert.match(await readFile(join(dir, '.lighthouse/sdlc.json'), 'utf8'), /"provider": "agent-host"/);
    assert.match(await readFile(join(dir, 'LIGHTHOUSE.md'), 'utf8'), /Repository roots/);
    assert.equal(spawnSync(process.execPath, [tool, 'verify'], { cwd: dir }).status, 0);
    assert.match(await readFile(join(dir, '.github/workflows/lighthouse.yml'), 'utf8'), /npx --no-install lighthouse verify/);
    const aliases = JSON.parse(await readFile(join(dir, '.lighthouse/commands.json'), 'utf8'));
    assert.equal(aliases.aliases.find((item) => item.alias === '/lh:init').canonical, '/lighthouse:init');
    assert.equal(aliases.aliases.find((item) => item.alias === '/lh:control').canonical, '/lighthouse:control-plane');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('aliases reports the harness and SDLC command contracts without duplicating implementations', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-aliases-'));
  try {
    const result = run(dir, 'aliases', ['--format', 'json']);
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 'valid');
    assert.deepEqual(report.aliases.find((item) => item.alias === '/lh:init'), {
      alias: '/lh:init',
      canonical: '/lighthouse:init',
      asset: 'skills/init/SKILL.md',
      owner: '@juangcarmona/lighthouse',
      packageVersion: JSON.parse(await readFile(new URL('../packages/cli/package.json', import.meta.url), 'utf8')).version,
    });
    assert.equal(report.aliases.find((item) => item.alias === '/lh:impl').canonical, '/lighthouse:implement');
    assert.equal(report.aliases.filter((item) => item.alias === '/lh:impl').length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('semantic init previews without a reference and applies only after explicit authorization', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-semantic-init-'));
  try {
    const planPath = join(dir, 'init-plan.json');
    await writeFile(planPath, JSON.stringify({
      schemaVersion: 1,
      product: 'Semantic Web',
      intent: 'A small authenticated web application for managing work.',
      application: { shape: 'frontend', stacks: ['react'] },
      profiles: ['visual-theme', 'react-web-platform'],
      openQuestions: [],
    }));
    const preview = run(dir, 'init', ['--plan-file', planPath, '--format', 'json']);
    assert.equal(preview.status, 0, preview.stderr);
    const report = JSON.parse(preview.stdout);
    assert.equal(report.reference, null);
    assert.deepEqual(report.application, { shape: 'frontend', stacks: ['react'] });
    assert.ok(report.operations.some((operation) => operation.path === 'lighthouse.json'));
    assert.equal(await access(join(dir, 'lighthouse.json')).then(() => true).catch(() => false), false);
    const applied = run(dir, 'init', ['--plan-file', planPath, '--apply']);
    assert.equal(applied.status, 0, applied.stderr);
    const manifest = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    assert.deepEqual(manifest.application, { shape: 'frontend', stacks: ['react'] });
    assert.deepEqual(manifest.profiles, ['visual-theme', 'react-web-platform']);
    await access(join(dir, '.agents/skills/lighthouse-init/SKILL.md'));
    assert.equal(run(dir, 'verify').status, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('semantic init stops on unresolved questions before writing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-semantic-questions-'));
  try {
    const planPath = join(dir, 'init-plan.json');
    await writeFile(planPath, JSON.stringify({
      schemaVersion: 1,
      product: 'Needs Answers',
      intent: 'A project whose deployment target is not known yet.',
      application: { shape: 'unknown', stacks: [] },
      profiles: [],
      reference: { kind: 'none' },
      openQuestions: ['Which deployment target should the project support?'],
    }));
    const preview = run(dir, 'init', ['--plan-file', planPath, '--format', 'json']);
    assert.equal(preview.status, 1);
    assert.match(preview.stdout, /Which deployment target/);
    assert.equal(await access(join(dir, 'lighthouse.json')).then(() => true).catch(() => false), false);
    const applied = run(dir, 'init', ['--plan-file', planPath, '--apply']);
    assert.equal(applied.status, 1);
    assert.match(applied.stderr, /answer the open questions/);
    assert.equal(await access(join(dir, 'lighthouse.json')).then(() => true).catch(() => false), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('semantic init does not require a declared reference to exist', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-semantic-reference-'));
  try {
    const planPath = join(dir, 'init-plan.json');
    await writeFile(planPath, JSON.stringify({
      schemaVersion: 1,
      product: 'Reference Optional',
      intent: 'A command-line tool with a declared but unavailable reference.',
      application: { shape: 'cli', stacks: ['node'] },
      profiles: [],
      reference: { kind: 'local', location: '/tmp/reference-that-does-not-exist', purpose: 'Compare naming only when available.' },
      openQuestions: [],
    }));
    const applied = run(dir, 'init', ['--plan-file', planPath, '--apply']);
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8')).product, 'Reference Optional');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('existing-authority adoption is dry-run by default and does not initialize missing providers', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-authority-adoption-absent-'));
  try {
    assert.equal(run(dir, 'init', ['--name', 'Existing']).status, 0);
    const before = await readFile(join(dir, 'lighthouse.json'), 'utf8');
    const plan = run(dir, 'authorities', ['--adopt-existing', '--format', 'json']);
    assert.equal(plan.status, 1);
    const report = JSON.parse(plan.stdout);
    assert.equal(report.status, 'blocked');
    assert.deepEqual(report.authorities.map((authority) => authority.status), ['absent', 'absent']);
    assert.equal(await readFile(join(dir, 'lighthouse.json'), 'utf8'), before);
    const applied = run(dir, 'authorities', ['--adopt-existing', '--apply']);
    assert.equal(applied.status, 1);
    assert.equal(await readFile(join(dir, 'lighthouse.json'), 'utf8'), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('existing-authority adoption validates providers, records only Lighthouse files and is idempotent', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-authority-adoption-valid-'));
  try {
    await mkdir(join(dir, 'docs'), { recursive: true });
    await cp(join(process.cwd(), 'docs/product'), join(dir, 'docs/product'), { recursive: true });
    await cp(join(process.cwd(), 'docs/architecture'), join(dir, 'docs/architecture'), { recursive: true });
    await cp(join(process.cwd(), 'docs/releasing.md'), join(dir, 'docs/releasing.md'));
    await cp(join(process.cwd(), '.product'), join(dir, '.product'), { recursive: true });
    await mkdir(join(dir, 'src/packages/cli'), { recursive: true });
    await mkdir(join(dir, 'src/packages/ui'), { recursive: true });
    await cp(join(process.cwd(), 'src/packages/cli/README.md'), join(dir, 'src/packages/cli/README.md'));
    await cp(join(process.cwd(), 'src/packages/ui/README.md'), join(dir, 'src/packages/ui/README.md'));
    await cp(join(process.cwd(), 'src/packages/ui/DESIGN.md'), join(dir, 'src/packages/ui/DESIGN.md'));
    await symlink(join(process.cwd(), 'node_modules'), join(dir, 'node_modules'), 'dir');
    assert.equal(run(dir, 'init', ['--name', 'Existing']).status, 0);
    const providerFiles = [
      'docs/product/model/requirements/functional/fr-verify-foundation.md',
      'docs/architecture/README.md',
    ];
    const before = await Promise.all(providerFiles.map(async (path) => [path, await readFile(join(dir, path), 'utf8')]));
    const preview = run(dir, 'authorities', ['--adopt-existing', '--format', 'json']);
    assert.equal(preview.status, 0, `${preview.stdout}\n${preview.stderr}`);
    const plan = JSON.parse(preview.stdout);
    assert.equal(plan.status, 'ready');
    assert.deepEqual(plan.authorities.map((authority) => authority.status), ['ready', 'ready']);
    const manifestBeforeApply = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    assert.deepEqual(manifestBeforeApply.integrations, { productShape: null, arcShape: null });
    assert.equal(run(dir, 'authorities', ['--adopt-existing', '--apply']).status, 0);
    const manifest = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    assert.deepEqual(manifest.integrations, { productShape: '0.22.0', arcShape: '0.1.4' });
    for (const [path, content] of before) assert.equal(await readFile(join(dir, path), 'utf8'), content);
    const verified = run(dir, 'verify', ['--format', 'json']);
    assert.equal(verified.status, 0, `${verified.stdout}\n${verified.stderr}`);
    assert.equal(JSON.parse(verified.stdout).results.find((result) => result.id === 'foundation.authorities').status, 'passed');
    const repeated = run(dir, 'authorities', ['--adopt-existing', '--apply']);
    assert.equal(repeated.status, 0, `${repeated.stdout}\n${repeated.stderr}`);
    assert.match(repeated.stdout, /Recorded and verified/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('profiles exposes applicability and verification layers without making them all mandatory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-profiles-'));
  try {
    const initialized = run(dir, 'init', ['--name', 'FullStack', '--profile', 'dotnet-backend']);
    assert.equal(initialized.status, 0, initialized.stderr);
    let composition = JSON.parse(run(dir, 'profiles', ['--format', 'json']).stdout);
    assert.equal(composition.status, 'unconfigured');
    assert.equal(composition.selected[0].status, 'unconfigured');
    assert.deepEqual(composition.selected[0].verification.layers.map((layer) => layer.id), ['static', 'unit', 'architecture', 'integration', 'functional']);
    const selectedManifest = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    selectedManifest.application = { shape: 'full-stack', stacks: ['dotnet'] };
    await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(selectedManifest));
    composition = JSON.parse(run(dir, 'profiles', ['--format', 'json']).stdout);
    assert.equal(composition.status, 'passed');
    const report = JSON.parse(run(dir, 'verify', ['--format', 'json']).stdout);
    assert.equal(report.profiles.status, 'passed');
    assert.equal(report.results.find((item) => item.id === 'foundation.profile-composition').status, 'passed');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('profile catalog exposes adoptable metadata and rejects missing or incompatible composition', () => {
  const catalog = readProfileCatalog();
  for (const profile of catalog.profiles) {
    assert.ok(Array.isArray(profile.prerequisites));
    assert.ok(Array.isArray(profile.dependencies));
    assert.ok(Array.isArray(profile.incompatibleWith));
    assert.ok(Array.isArray(profile.commands));
    assert.ok(profile.guardrails.length > 0);
    assert.equal(typeof profile.consumerFixture, 'string');
    assert.equal(typeof profile.upgradeStrategy, 'string');
  }

  const custom = {
    schemaVersion: 1,
    profiles: [
      { ...catalog.profiles[0], id: 'web', dependencies: ['api'], incompatibleWith: ['mobile'] },
      { ...catalog.profiles[0], id: 'mobile', dependencies: [], incompatibleWith: [] },
    ],
  };
  const composition = composeProfiles(custom, { application: { shape: 'tooling', stacks: ['node'] }, profiles: ['web', 'mobile'] });
  assert.equal(composition.status, 'failed');
  assert.match(composition.selected[0].problems.join(' '), /requires the api profile/);
  assert.match(composition.selected[0].problems.join(' '), /incompatible with the mobile profile/);
  assert.match(composition.selected[0].nextAction, /required profiles/);
});

test('visual-theme init projects the UI guide and skill and verifies the token contract', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-ui-profile-'));
  try {
    const initialized = run(dir, 'init', ['--name', 'Visual', '--profile', 'visual-theme']);
    assert.equal(initialized.status, 0, initialized.stderr);
    const generated = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    assert.deepEqual(generated.profiles, ['visual-theme']);
    assert.deepEqual(generated.packages.ui, { name: '@juangcarmona/lighthouse-ui', version: uiPackage.version });
    assert.ok(generated.managed.includes('docs/design/DESIGN.md'));
    assert.ok(generated.managed.includes('.agents/skills/lighthouse-ui/SKILL.md'));
    assert.match(await readFile(join(dir, 'docs/design/DESIGN.md'), 'utf8'), /--lh-action/);
    assert.match(await readFile(join(dir, '.agents/skills/lighthouse-ui/SKILL.md'), 'utf8'), /semantic `--lh-\*` roles/);
    const report = JSON.parse(run(dir, 'verify', ['--format', 'json']).stdout);
    assert.equal(report.results.find((item) => item.id === 'visual.design-contract').status, 'passed');
    const skill = await readFile(join(dir, '.agents/skills/lighthouse-ui/SKILL.md'), 'utf8');
    await rm(join(dir, '.agents/skills/lighthouse-ui/SKILL.md'));
    const missing = JSON.parse(run(dir, 'verify', ['--format', 'json']).stdout);
    assert.equal(missing.results.find((item) => item.id === 'visual.design-contract').status, 'failed');
    await writeFile(join(dir, '.agents/skills/lighthouse-ui/SKILL.md'), skill);
    await writeFile(join(dir, 'docs/design/DESIGN.md'), 'project-owned visual guide');
    const drift = JSON.parse(run(dir, 'verify', ['--format', 'json']).stdout);
    assert.equal(drift.results.find((item) => item.id === 'visual.design-contract').status, 'drift');
    assert.equal(run(dir, 'verify', ['--format', 'json']).status, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('react web profile projects its guidance and requires the visual contract', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-react-web-profile-'));
  try {
    const initialized = run(dir, 'init', ['--name', 'Web', '--profile', 'visual-theme', '--profile', 'react-web-platform']);
    assert.equal(initialized.status, 0, initialized.stderr);
    for (const file of [
      'docs/profiles/react-web-platform/README.md',
      'docs/profiles/react-web-platform/adoption.md',
      'docs/profiles/react-web-platform/structure.md',
      'docs/profiles/react-web-platform/guardrails.md',
      'docs/profiles/react-web-platform/testing.md',
      '.agents/skills/lighthouse-react-web/SKILL.md'
    ]) await access(join(dir, file));
    const selectedManifest = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    selectedManifest.application = { shape: 'frontend', stacks: ['react'] };
    await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(selectedManifest));
    const composition = JSON.parse(run(dir, 'profiles', ['--format', 'json']).stdout);
    assert.equal(composition.status, 'passed');
    assert.equal(composition.selected.find((profile) => profile.id === 'react-web-platform').dependencies[0], 'visual-theme');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('web BFF profile projects its security contract and requires the private web composition', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-web-bff-profile-'));
  try {
    const initialized = run(dir, 'init', ['--name', 'PrivateWeb', '--profile', 'visual-theme', '--profile', 'react-web-platform', '--profile', 'dotnet-backend', '--profile', 'web-bff']);
    assert.equal(initialized.status, 0, initialized.stderr);
    for (const file of [
      'docs/profiles/web-bff/README.md',
      'docs/profiles/web-bff/adoption.md',
      'docs/profiles/web-bff/security.md',
      'docs/profiles/web-bff/testing.md',
      '.agents/skills/lighthouse-web-bff/SKILL.md'
    ]) await access(join(dir, file));
    const selectedManifest = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    selectedManifest.application = { shape: 'full-stack', stacks: ['react', 'dotnet'] };
    await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(selectedManifest));
    const composition = JSON.parse(run(dir, 'profiles', ['--format', 'json']).stdout);
    assert.equal(composition.status, 'passed');
    assert.deepEqual(composition.selected.find((profile) => profile.id === 'web-bff').dependencies, ['react-web-platform', 'dotnet-backend']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('PWA capability projects its offline contract as an optional React extension', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-pwa-profile-'));
  try {
    const initialized = run(dir, 'init', ['--name', 'Pwa', '--profile', 'visual-theme', '--profile', 'react-web-platform', '--profile', 'pwa-capability']);
    assert.equal(initialized.status, 0, initialized.stderr);
    for (const file of [
      'docs/profiles/pwa-capability/README.md',
      'docs/profiles/pwa-capability/adoption.md',
      'docs/profiles/pwa-capability/guardrails.md',
      'docs/profiles/pwa-capability/offline.md',
      'docs/profiles/pwa-capability/testing.md',
      '.agents/skills/lighthouse-pwa/SKILL.md'
    ]) await access(join(dir, file));
    const selectedManifest = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    selectedManifest.application = { shape: 'frontend', stacks: ['react'] };
    await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(selectedManifest));
    const composition = JSON.parse(run(dir, 'profiles', ['--format', 'json']).stdout);
    assert.equal(composition.status, 'passed');
    assert.deepEqual(composition.selected.find((profile) => profile.id === 'pwa-capability').dependencies, ['react-web-platform']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Expo mobile profile projects native guidance without selecting the React web profile', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-expo-profile-'));
  try {
    const initialized = run(dir, 'init', ['--name', 'Mobile', '--profile', 'mobile-expo', '--profile', 'dotnet-backend']);
    assert.equal(initialized.status, 0, initialized.stderr);
    for (const file of [
      'docs/profiles/mobile-expo/README.md',
      'docs/profiles/mobile-expo/adoption.md',
      'docs/profiles/mobile-expo/guardrails.md',
      'docs/profiles/mobile-expo/testing.md',
      '.agents/skills/lighthouse-mobile-expo/SKILL.md'
    ]) await access(join(dir, file));
    const selectedManifest = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    selectedManifest.application = { shape: 'full-stack', stacks: ['expo', 'dotnet'] };
    await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(selectedManifest));
    const composition = JSON.parse(run(dir, 'profiles', ['--format', 'json']).stdout);
    assert.equal(composition.status, 'passed');
    assert.equal(composition.selected.some((profile) => profile.id === 'react-web-platform'), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('MAUI mobile profile projects native guidance and rejects the Expo combination', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-maui-profile-'));
  try {
    const initialized = run(dir, 'init', ['--name', 'Maui', '--profile', 'mobile-maui', '--profile', 'dotnet-backend']);
    assert.equal(initialized.status, 0, initialized.stderr);
    for (const file of [
      'docs/profiles/mobile-maui/README.md',
      'docs/profiles/mobile-maui/adoption.md',
      'docs/profiles/mobile-maui/guardrails.md',
      'docs/profiles/mobile-maui/testing.md',
      '.agents/skills/lighthouse-mobile-maui/SKILL.md'
    ]) await access(join(dir, file));
    const selectedManifest = JSON.parse(await readFile(join(dir, 'lighthouse.json'), 'utf8'));
    selectedManifest.application = { shape: 'full-stack', stacks: ['maui', 'dotnet'] };
    await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(selectedManifest));
    let composition = JSON.parse(run(dir, 'profiles', ['--format', 'json']).stdout);
    assert.equal(composition.status, 'passed');
    selectedManifest.profiles.push('mobile-expo');
    await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(selectedManifest));
    composition = JSON.parse(run(dir, 'profiles', ['--format', 'json']).stdout);
    assert.equal(composition.status, 'failed');
    assert.match(composition.selected.find((profile) => profile.id === 'mobile-maui').problems.join(' '), /incompatible with the mobile-expo profile/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('visual-theme init reports a brownfield design conflict without overwriting it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-ui-brownfield-'));
  try {
    await mkdir(join(dir, 'docs/design'), { recursive: true });
    await writeFile(join(dir, 'docs/design/DESIGN.md'), 'project-owned design');
    const preview = run(dir, 'init', ['--name', 'Visual', '--profile', 'visual-theme', '--dry-run']);
    assert.equal(preview.status, 1);
    assert.match(preview.stderr, /docs\/design\/DESIGN\.md already exists/);
    assert.equal(await readFile(join(dir, 'docs/design/DESIGN.md'), 'utf8'), 'project-owned design');
    assert.equal(await access(join(dir, 'lighthouse.json')).then(() => true).catch(() => false), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('visual-theme validation requires its pinned UI package', async () => {
  const dir = await fixture();
  try {
    const selected = { ...manifest, profiles: ['visual-theme'] };
    await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(selected));
    const missing = run(dir, 'verify', ['--format', 'json']);
    assert.equal(missing.status, 1);
    assert.match(missing.stdout, /packages must declare/);
    selected.packages = { sdlc: { name: sdlcPackage.name, version: sdlcPackage.version }, ui: { name: '@wrong/ui', version: '0.1.0' } };
    await writeFile(join(dir, 'lighthouse.json'), JSON.stringify(selected));
    const invalid = run(dir, 'verify', ['--format', 'json']);
    assert.equal(invalid.status, 1);
    assert.match(invalid.stdout, /packages\.ui must declare/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init dry-run reports brownfield conflicts without writing', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-brownfield-'));
  try {
    await writeFile(join(dir, 'src'), 'project-owned file');
    const result = spawnSync(process.execPath, [tool, 'init', '--name', 'Brownfield', '--dry-run'], { cwd: dir, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /src exists but is not a directory/);
    assert.equal(await readFile(join(dir, 'src'), 'utf8'), 'project-owned file');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('reconcile previews and applies missing managed paths without overwriting drift', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    const missing = join(dir, '.github/workflows/lighthouse.yml');
    await rm(missing);
    const preview = run(dir, 'reconcile');
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /create \.github\/workflows\/lighthouse\.yml/);
    assert.equal(await access(missing).then(() => true).catch(() => false), false);
    const applied = spawnSync(process.execPath, [tool, 'reconcile', '--apply'], { cwd: dir, encoding: 'utf8' });
    assert.equal(applied.status, 0, applied.stderr);
    assert.match(applied.stdout, /Reconciled missing/);
    const drifted = join(dir, 'LIGHTHOUSE.md');
    await writeFile(drifted, 'project-owned content');
    const conflict = run(dir, 'reconcile');
    assert.equal(conflict.status, 1);
    assert.match(conflict.stderr, /LIGHTHOUSE\.md exists with different content/);
    assert.equal(await readFile(drifted, 'utf8'), 'project-owned content');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('upgrade previews and applies a missing owned projection', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    const missing = join(dir, '.github/workflows/lighthouse.yml');
    await rm(missing);
    const preview = run(dir, 'upgrade', ['--scope', 'harness']);
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /additive add \.github\/workflows\/lighthouse\.yml/);
    const machine = run(dir, 'upgrade', ['--scope', 'harness', '--format', 'json']);
    assert.equal(machine.status, 0, machine.stderr);
    assert.equal(JSON.parse(machine.stdout).changes.find((change) => change.path === '.github/workflows/lighthouse.yml').classification, 'additive');
    assert.equal(await access(missing).then(() => true).catch(() => false), false);
    const applied = run(dir, 'upgrade', ['--scope', 'harness', '--apply']);
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(await access(missing).then(() => true).catch(() => false), true);
    const state = JSON.parse(await readFile(join(dir, '.lighthouse/upgrade.json'), 'utf8'));
    assert.equal(state.files['.github/workflows/lighthouse.yml'].scope, 'harness');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('upgrade projects the alias map as an SDLC-owned projection', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    const aliasesPath = join(dir, '.lighthouse/commands.json');
    await rm(aliasesPath);
    const preview = run(dir, 'upgrade', ['--scope', 'sdlc', '--format', 'json']);
    assert.equal(preview.status, 0, preview.stderr);
    const plan = JSON.parse(preview.stdout);
    assert.equal(plan.changes.find((change) => change.path === '.lighthouse/commands.json').classification, 'additive');
    assert.equal(run(dir, 'upgrade', ['--scope', 'sdlc', '--apply']).status, 0);
    const aliases = JSON.parse(await readFile(aliasesPath, 'utf8'));
    assert.equal(aliases.aliases.find((item) => item.alias === '/lh:impl').canonical, '/lighthouse:implement');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('upgrade discovers pending SDLC capability adoption without writing remote or reconciliation state', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    const statePath = join(dir, '.lighthouse/upgrade.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    delete state.adoption;
    await writeFile(statePath, JSON.stringify(state));
    const preview = run(dir, 'upgrade', ['--format', 'json']);
    assert.equal(preview.status, 0, preview.stderr);
    const plan = JSON.parse(preview.stdout);
    assert.equal(plan.adoption.status, 'pending');
    assert.equal(plan.adoption.capabilities.labels.status, 'pending-adoption');
    assert.match(plan.adoption.capabilities.labels.nextAction, /lighthouse capabilities plan/);
    assert.equal(await access(join(dir, '.lighthouse/reconciliation/labels.plan.json')).then(() => true).catch(() => false), false);
    assert.equal(run(dir, 'upgrade', ['--apply']).status, 0);
    const applied = JSON.parse(await readFile(statePath, 'utf8'));
    assert.equal(applied.adoption.labels.status, 'pending-adoption');
    assert.equal(await access(join(dir, '.lighthouse/reconciliation/labels.json')).then(() => true).catch(() => false), false);
    const verified = JSON.parse(run(dir, 'verify', ['--format', 'json']).stdout);
    const adoption = verified.results.find((item) => item.id === 'foundation.capability-adoption');
    assert.equal(adoption.status, 'unconfigured');
    assert.equal(adoption.adoptionStatus, 'pending-adoption');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('capability adoption requires the plan hash, creates only missing labels and is idempotent', async () => {
  const dir = await fixture();
  const labelsPath = join(dir, 'github-labels.json');
  const ghDirectory = join(dir, 'bin');
  const gh = join(ghDirectory, 'gh');
  try {
    await mkdir(ghDirectory);
    await writeFile(labelsPath, JSON.stringify([{ name: 'triage', color: '8B949E', description: 'project-owned' }]));
    await writeFile(gh, `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
const file = process.env.LIGHTHOUSE_TEST_LABELS;
const args = process.argv.slice(2);
let labels = JSON.parse(readFileSync(file, 'utf8'));
if (args[0] !== 'api') process.exit(2);
if (args[1] === '--method' && args[2] === 'POST') {
  const name = args.find((item) => item.startsWith('name='))?.slice(5);
  const color = args.find((item) => item.startsWith('color='))?.slice(6);
  const description = args.find((item) => item.startsWith('description='))?.slice(12) ?? '';
  if (!labels.some((label) => label.name === name)) labels.push({ name, color, description });
  writeFileSync(file, JSON.stringify(labels));
  console.log(JSON.stringify({ name, color, description }));
} else {
  console.log(JSON.stringify(labels));
}
`);
    await chmod(gh, 0o755);
    assert.equal(run(dir, 'init').status, 0);
    const environment = { PATH: `${ghDirectory}:${process.env.PATH}`, LIGHTHOUSE_TEST_LABELS: labelsPath };
    const planned = run(dir, 'capabilities', ['plan', '--id', 'labels', '--provider', 'github', '--repo', 'juan/demo', '--plan-file', '.lighthouse/reconciliation/labels.plan.json', '--format', 'json'], { env: environment });
    assert.equal(planned.status, 0, planned.stderr);
    const plan = JSON.parse(planned.stdout);
    assert.equal(plan.reconciliation.operations.length, 20);
    assert.equal(run(dir, 'capabilities', ['apply', '--plan-file', '.lighthouse/reconciliation/labels.plan.json', '--authorize', 'wrong'], { env: environment }).status, 1);
    const applied = run(dir, 'capabilities', ['apply', '--plan-file', '.lighthouse/reconciliation/labels.plan.json', '--authorize', plan.authorization.planHash, '--format', 'json'], { env: environment });
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(JSON.parse(applied.stdout).status, 'adopted');
    assert.equal(JSON.parse(await readFile(join(dir, '.lighthouse/upgrade.json'), 'utf8')).adoption.labels.status, 'adopted');
    assert.equal(JSON.parse(await readFile(join(dir, '.lighthouse/reconciliation/labels.json'), 'utf8')).verified, true);
    const second = run(dir, 'capabilities', ['apply', '--plan-file', '.lighthouse/reconciliation/labels.plan.json', '--authorize', plan.authorization.planHash, '--format', 'json'], { env: environment });
    assert.equal(second.status, 0, second.stderr);
    assert.equal(JSON.parse(second.stdout).reconciliation.operations.length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('capability selection and decline are explicit local decisions', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    const declined = run(dir, 'capabilities', ['decline', '--id', 'labels', '--provider', 'github', '--format', 'json']);
    assert.equal(declined.status, 0, declined.stderr);
    assert.equal(JSON.parse(declined.stdout).status, 'declined');
    const verified = JSON.parse(run(dir, 'verify', ['--format', 'json']).stdout);
    const adoption = verified.results.find((item) => item.id === 'foundation.capability-adoption');
    assert.equal(adoption.status, 'not-applicable');
    assert.equal(adoption.adoptionStatus, 'declined');
    assert.equal(run(dir, 'capabilities', ['select', '--id', 'labels', '--provider', 'github']).status, 0);
    const selected = JSON.parse(run(dir, 'verify', ['--format', 'json']).stdout).results.find((item) => item.id === 'foundation.capability-adoption');
    assert.equal(selected.adoptionStatus, 'pending-adoption');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('upgrade preserves customized projections and reports missing ownership evidence', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    const projection = join(dir, 'LIGHTHOUSE.md');
    await writeFile(projection, 'project-owned content');
    const preview = run(dir, 'upgrade', ['--scope=harness']);
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /customized preserve LIGHTHOUSE\.md/);
    assert.equal(run(dir, 'upgrade', ['--scope', 'harness', '--apply']).status, 0);
    assert.equal(await readFile(projection, 'utf8'), 'project-owned content');
    await rm(join(dir, '.lighthouse/upgrade.json'));
    const missing = run(dir, 'upgrade');
    assert.equal(missing.status, 1);
    assert.match(`${missing.stdout}${missing.stderr}`, /adoption gap/);
    assert.match(`${missing.stdout}${missing.stderr}`, /reconcile --apply/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('upgrade stops a baseline mismatch for human review', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    const statePath = join(dir, '.lighthouse/upgrade.json');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    state.baseline = '0.0.0';
    await writeFile(statePath, JSON.stringify(state));
    const preview = run(dir, 'upgrade');
    assert.equal(preview.status, 0, preview.stderr);
    assert.match(preview.stdout, /breaking review baseline/);
    const applied = run(dir, 'upgrade', ['--apply']);
    assert.equal(applied.status, 1);
    assert.match(applied.stderr, /Upgrade stopped/);
    assert.equal(JSON.parse(await readFile(statePath, 'utf8')).baseline, '0.0.0');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('verify keeps the human output and exposes the existing catalog as JSON', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    const text = run(dir, 'verify');
    assert.equal(text.status, 0, text.stderr);
    assert.equal(text.stdout.trim(), 'Lighthouse manifest, repository boundaries and managed projection are valid.');
    const json = run(dir, 'verify', ['--format', 'json']);
    assert.equal(json.status, 0, json.stderr);
    const report = JSON.parse(json.stdout);
    assert.equal(report.summary.failed, 0);
    assert.equal(report.summary.drift, 0);
    assert.ok(report.results.some((item) => item.id === 'foundation.manifest' && item.status === 'passed'));
    assert.ok(report.results.some((item) => item.id === 'repository.managed-projection' && item.status === 'passed'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('verify JSON distinguishes managed projection drift', async () => {
  const dir = await fixture();
  try {
    assert.equal(run(dir, 'init').status, 0);
    await writeFile(join(dir, 'LIGHTHOUSE.md'), 'project-owned content');
    const result = run(dir, 'verify', ['--format=json']);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    const managed = report.results.find((item) => item.id === 'repository.managed-projection');
    assert.equal(managed.status, 'drift');
    assert.match(managed.problems.join('\n'), /LIGHTHOUSE\.md has drifted/);
    assert.deepEqual(report.blocking, ['repository.managed-projection']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('catalog keeps level and kind independent and records pending human review', () => {
  const catalog = readGuardrailCatalog();
  const layout = catalog.guardrails.find((item) => item.id === 'repository.layout');
  assert.equal(layout.level, 'required');
  assert.equal(layout.kind, 'hard');
  assert.equal(initialReviewStatus({ level: 'required', kind: 'soft', verification: 'human' }), 'pending-review');
  assert.equal(initialReviewStatus({ level: 'required', kind: 'hard', verification: 'semantic' }), 'pending-review');
  assert.equal(initialReviewStatus({ level: 'recommended', kind: 'soft', verification: 'deterministic' }), 'unavailable');
});
