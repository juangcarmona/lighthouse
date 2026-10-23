import { access, chmod, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const consumer = process.env.LIGHTHOUSE_CONSUMER_ROOT;
if (!consumer) {
  console.error('LIGHTHOUSE_CONSUMER_ROOT is required. Point it at a real adopter checkout.');
  process.exit(2);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

function consumerRun(command, args, cwd, env) {
  return spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
}

async function readCalls(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return []; }
}

const temp = await mkdtemp(join(tmpdir(), 'lighthouse-package-consumer-'));
try {
  await cp(resolve(consumer), temp, {
    recursive: true,
    filter: (source) => !source.includes('/.git/') && !source.endsWith('/.git') && !source.includes('/node_modules/'),
  });

  const packageOutput = run('npm', [
    'pack', '--workspace', '@juangcarmona/lighthouse', '--pack-destination', temp, '--json'
  ], root);
  const [{ filename }] = JSON.parse(packageOutput);
  const tarball = resolve(temp, filename);
  const sdlcOutput = run('npm', [
    'pack', '--workspace', '@juangcarmona/lighthouse-sdlc', '--pack-destination', temp, '--json'
  ], root);
  const [{ filename: sdlcFilename }] = JSON.parse(sdlcOutput);
  const sdlcTarball = resolve(temp, sdlcFilename);
  const uiOutput = run('npm', [
    'pack', '--workspace', '@juangcarmona/lighthouse-ui', '--pack-destination', temp, '--json'
  ], root);
  const [{ filename: uiFilename }] = JSON.parse(uiOutput);
  const uiTarball = resolve(temp, uiFilename);

  run('npm', ['install', '--ignore-scripts', '--save-dev', tarball, sdlcTarball, uiTarball], temp);

  const consumerManifest = JSON.parse(await readFile(join(temp, 'package.json'), 'utf8'));
  const product = process.env.LIGHTHOUSE_PRODUCT_NAME ?? consumerManifest.name?.split('/').pop() ?? 'adopter';

  const bin = resolve(temp, 'node_modules/.bin/lighthouse');
  const brownfield = spawnSync(bin, ['init', '--name', product, '--dry-run'], { cwd: temp, encoding: 'utf8' });
  if (brownfield.status !== 0 && !brownfield.stderr.includes('conflict')) {
    console.error('Expected brownfield initialization to report an existing managed path.');
    process.exit(1);
  }
  if (brownfield.status !== 0) {
    const conflicts = [...`${brownfield.stdout}\n${brownfield.stderr}`.matchAll(/^\s*conflict (.+?) already exists; refusing to overwrite it$/gmu)].map((match) => match[1]);
    for (const path of conflicts) {
      await rm(join(temp, path), { force: true });
    }
  }
  run(bin, ['init', '--name', product], temp);

  const visualFixture = join(temp, '.fixture/visual-profile');
  await mkdir(visualFixture, { recursive: true });
  const visualInit = spawnSync(bin, ['init', '--name', 'Visual', '--profile', 'visual-theme'], { cwd: visualFixture, encoding: 'utf8' });
  if (visualInit.status !== 0) {
    process.stderr.write(visualInit.stdout);
    process.stderr.write(visualInit.stderr);
    process.exit(visualInit.status ?? 1);
  }
  const visualVerify = spawnSync(bin, ['verify', '--format', 'json'], { cwd: visualFixture, encoding: 'utf8' });
  if (visualVerify.status !== 0 || !JSON.parse(visualVerify.stdout).results.some((item) => item.id === 'visual.design-contract' && item.status === 'passed')) {
    process.stderr.write(visualVerify.stdout);
    process.stderr.write(visualVerify.stderr);
    console.error('Expected the packed visual-theme profile to initialize and verify.');
    process.exit(visualVerify.status ?? 1);
  }

  const dotnetFixture = join(temp, '.fixture/dotnet-profile');
  const dotnetCreate = spawnSync(bin, ['create-dotnet', dotnetFixture, '--name', 'Workshop'], { cwd: temp, encoding: 'utf8' });
  if (dotnetCreate.status !== 0 || !(await readFile(join(dotnetFixture, 'docs/profiles/dotnet/README.md'), 'utf8')).includes('Minimal APIs')) {
    process.stderr.write(dotnetCreate.stdout);
    process.stderr.write(dotnetCreate.stderr);
    console.error('Expected the packed .NET profile creator to seed guidance and the verifier.');
    process.exit(dotnetCreate.status ?? 1);
  }

  const labelsPath = join(temp, '.fixture/github-labels.json');
  const callsPath = join(temp, '.fixture/github-calls.json');
  const ghDirectory = join(temp, '.fixture/bin');
  const gh = join(ghDirectory, 'gh');
  await mkdir(ghDirectory, { recursive: true });
  await writeFile(labelsPath, JSON.stringify([{ name: 'triage', color: 'FF0000', description: 'consumer-owned wording' }]));
  await writeFile(gh, `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
const labelsFile = process.env.LIGHTHOUSE_TEST_LABELS;
const callsFile = process.env.LIGHTHOUSE_TEST_CALLS;
const args = process.argv.slice(2);
const calls = JSON.parse(readFileSync(callsFile, 'utf8'));
calls.push(args);
writeFileSync(callsFile, JSON.stringify(calls));
let labels = JSON.parse(readFileSync(labelsFile, 'utf8'));
if (args[0] !== 'api') process.exit(2);
if (args[1] === '--method' && args[2] === 'POST') {
  const attempts = calls.filter((call) => call[1] === '--method' && call[2] === 'POST').length;
  const failAfter = Number(process.env.LIGHTHOUSE_TEST_FAIL_AFTER ?? 0);
  if (failAfter && attempts > failAfter) {
    console.error('fixture provider failure');
    process.exit(17);
  }
  const name = args.find((item) => item.startsWith('name='))?.slice(5);
  const color = args.find((item) => item.startsWith('color='))?.slice(6);
  const description = args.find((item) => item.startsWith('description='))?.slice(12) ?? '';
  if (!labels.some((label) => label.name === name)) labels.push({ name, color, description });
  writeFileSync(labelsFile, JSON.stringify(labels));
  console.log(JSON.stringify({ name, color, description }));
} else {
  console.log(JSON.stringify(labels));
}
`);
  await chmod(gh, 0o755);
  await writeFile(callsPath, '[]');
  const providerEnv = {
    PATH: `${ghDirectory}:${process.env.PATH}`,
    LIGHTHOUSE_TEST_LABELS: labelsPath,
    LIGHTHOUSE_TEST_CALLS: callsPath,
  };

  const upgrade = consumerRun(bin, ['upgrade', '--format', 'json'], temp, providerEnv);
  if (upgrade.status !== 0) {
    process.stderr.write(upgrade.stdout);
    process.stderr.write(upgrade.stderr);
    process.exit(upgrade.status ?? 1);
  }
  const upgradePlan = JSON.parse(upgrade.stdout);
  if (upgradePlan.adoption?.capabilities?.labels?.status !== 'pending-adoption') {
    console.error('Expected the packaged upgrade plan to discover pending label adoption.');
    process.exit(1);
  }
  if ((await readCalls(callsPath)).length !== 0) {
    console.error('Upgrade discovery must not call the provider.');
    process.exit(1);
  }

  const planArgs = ['capabilities', 'plan', '--id', 'labels', '--provider', 'github', '--repo', 'fixture/project', '--plan-file', '.lighthouse/reconciliation/labels.plan.json', '--format', 'json'];
  await writeFile(labelsPath, JSON.stringify([
    { name: 'triage', color: 'FF0000', description: 'consumer-owned wording' },
    { name: 'size_m', color: '80C2FF', description: 'ambiguous existing label' },
  ]));
  await writeFile(callsPath, '[]');
  const conflict = consumerRun(bin, planArgs, temp, providerEnv);
  if (conflict.status === 0) {
    console.error('Expected an equivalent existing label to block the adoption plan.');
    process.exit(1);
  }
  const conflictPlan = JSON.parse(await readFile(join(temp, '.lighthouse/reconciliation/labels.plan.json'), 'utf8'));
  if (conflictPlan.status !== 'blocked' || !conflictPlan.reconciliation.changes.some((change) => change.status === 'conflict')) {
    console.error('Expected the packaged plan to record the label conflict.');
    process.exit(1);
  }
  if ((await readCalls(callsPath)).some((call) => call[1] === '--method' && call[2] === 'POST')) {
    console.error('A blocked dry run must not write to the provider.');
    process.exit(1);
  }

  await writeFile(labelsPath, JSON.stringify([{ name: 'triage', color: 'FF0000', description: 'consumer-owned wording' }]));
  await writeFile(callsPath, '[]');
  const planned = consumerRun(bin, planArgs, temp, providerEnv);
  if (planned.status !== 0) {
    process.stderr.write(planned.stdout);
    process.stderr.write(planned.stderr);
    process.exit(planned.status ?? 1);
  }
  const plan = JSON.parse(planned.stdout);
  if (plan.status !== 'ready' || plan.reconciliation.operations.length === 0) {
    console.error('Expected a ready plan with missing label operations.');
    process.exit(1);
  }
  if ((await readCalls(callsPath)).some((call) => call[1] === '--method' && call[2] === 'POST')) {
    console.error('A dry-run plan must not write to the provider.');
    process.exit(1);
  }

  await writeFile(labelsPath, JSON.stringify([
    { name: 'triage', color: 'FF0000', description: 'consumer-owned wording' },
    { name: 'external-change', color: 'CF222E', description: 'outside the plan' },
  ]));
  const stale = consumerRun(bin, ['capabilities', 'apply', '--plan-file', '.lighthouse/reconciliation/labels.plan.json', '--authorize', plan.authorization.planHash], temp, providerEnv);
  if (stale.status === 0 || !stale.stderr.includes('outside this plan')) {
    console.error('Expected an apply to stop when the provider changed outside the plan.');
    process.exit(1);
  }

  await writeFile(labelsPath, JSON.stringify([{ name: 'triage', color: 'FF0000', description: 'consumer-owned wording' }]));
  await writeFile(callsPath, '[]');
  const failed = consumerRun(bin, ['capabilities', 'apply', '--plan-file', '.lighthouse/reconciliation/labels.plan.json', '--authorize', plan.authorization.planHash], temp, { ...providerEnv, LIGHTHOUSE_TEST_FAIL_AFTER: '3' });
  if (failed.status === 0) {
    console.error('Expected the fixture provider to fail part-way through apply.');
    process.exit(1);
  }
  const failedEvidence = JSON.parse(await readFile(join(temp, '.lighthouse/reconciliation/labels.json'), 'utf8'));
  if (failedEvidence.status !== 'failed' || failedEvidence.operations.length !== 3) {
    console.error('Expected failed adoption evidence with the completed operations.');
    process.exit(1);
  }

  const resumed = consumerRun(bin, ['capabilities', 'apply', '--plan-file', '.lighthouse/reconciliation/labels.plan.json', '--authorize', plan.authorization.planHash, '--format', 'json'], temp, providerEnv);
  if (resumed.status !== 0 || JSON.parse(resumed.stdout).status !== 'adopted') {
    process.stderr.write(resumed.stdout);
    process.stderr.write(resumed.stderr);
    process.exit(resumed.status ?? 1);
  }
  const verified = consumerRun(bin, ['verify', '--format', 'json'], temp, providerEnv);
  if (verified.status !== 0 || JSON.parse(verified.stdout).results.find((item) => item.id === 'foundation.capability-adoption')?.status !== 'passed') {
    process.stderr.write(verified.stdout);
    process.stderr.write(verified.stderr);
    process.exit(verified.status ?? 1);
  }
  const repeated = consumerRun(bin, ['capabilities', 'apply', '--plan-file', '.lighthouse/reconciliation/labels.plan.json', '--authorize', plan.authorization.planHash, '--format', 'json'], temp, providerEnv);
  if (repeated.status !== 0 || JSON.parse(repeated.stdout).reconciliation.operations.length !== 0) {
    console.error('Expected a resumed adoption to be idempotent.');
    process.exit(repeated.status ?? 1);
  }
  await writeFile(labelsPath, JSON.stringify([
    ...JSON.parse(await readFile(labelsPath, 'utf8')),
    { name: 'post-adoption-drift', color: 'CF222E', description: 'introduced after adoption' },
  ]));
  const drift = consumerRun(bin, planArgs, temp, providerEnv);
  if (drift.status !== 0 || JSON.parse(drift.stdout).reconciliation.drift.status !== 'drift') {
    process.stderr.write(drift.stdout);
    process.stderr.write(drift.stderr);
    console.error('Expected a future plan to expose provider drift from adoption evidence.');
    process.exit(drift.status ?? 1);
  }
  if (process.env.LIGHTHOUSE_AUTHORITIES_APPLY === 'true') {
    run(bin, ['authorities', '--apply'], temp);
    for (const path of ['docs/product/README.md', 'docs/architecture/README.md']) {
      await access(join(temp, path));
    }
    const adopted = JSON.parse(await readFile(join(temp, 'lighthouse.json'), 'utf8'));
    if (adopted.integrations.productShape !== '0.22.0' || adopted.integrations.arcShape !== '0.1.4') {
      console.error('Expected the authority versions to be recorded after application.');
      process.exit(1);
    }
  } else if (process.env.LIGHTHOUSE_AUTHORITIES_DRY_RUN === 'true') {
    run(bin, ['authorities', '--dry-run'], temp);
  }
  run(bin, ['verify'], temp);

  await writeFile(join(temp, 'LIGHTHOUSE.md'), 'drift');
  const projectionDrift = spawnSync(bin, ['verify'], { cwd: temp, encoding: 'utf8' });
  if (projectionDrift.status === 0 || !projectionDrift.stderr.includes('has drifted')) {
    console.error('Expected lighthouse verify to reject a drifted LIGHTHOUSE.md.');
    process.exit(1);
  }

  console.log('CLI package installs and verifies against the adopter checkout.');
} finally {
  await rm(temp, { recursive: true, force: true });
}
