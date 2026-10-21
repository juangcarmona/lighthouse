import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
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

  run('npm', ['install', '--ignore-scripts', '--save-dev', tarball], temp);

  const consumerManifest = JSON.parse(await readFile(join(temp, 'package.json'), 'utf8'));
  const product = process.env.LIGHTHOUSE_PRODUCT_NAME ?? consumerManifest.name?.split('/').pop() ?? 'adopter';

  const bin = resolve(temp, 'node_modules/.bin/lighthouse');
  const brownfield = spawnSync(bin, ['init', '--name', product, '--dry-run'], { cwd: temp, encoding: 'utf8' });
  if (brownfield.status !== 0 && !brownfield.stderr.includes('conflict')) {
    console.error('Expected brownfield initialization to report an existing managed path.');
    process.exit(1);
  }
  if (brownfield.status !== 0) {
    for (const path of ['.husky/commit-msg', '.husky/pre-push', '.github/workflows/lighthouse.yml']) {
      await rm(join(temp, path), { force: true });
    }
  }
  run(bin, ['init', '--name', product], temp);
  run(bin, ['verify'], temp);

  await writeFile(join(temp, 'LIGHTHOUSE.md'), 'drift');
  const drift = spawnSync(bin, ['verify'], { cwd: temp, encoding: 'utf8' });
  if (drift.status === 0 || !drift.stderr.includes('has drifted')) {
    console.error('Expected lighthouse verify to reject a drifted LIGHTHOUSE.md.');
    process.exit(1);
  }

  console.log('CLI package installs and verifies against the adopter checkout.');
} finally {
  await rm(temp, { recursive: true, force: true });
}
