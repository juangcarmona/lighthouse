import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const root = process.cwd();

test('the SDLC artifact contains its contract and lifecycle assets', () => {
  const packed = spawnSync('npm', ['pack', '--workspace', '@juangcarmona/lighthouse-sdlc', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' });
  assert.equal(packed.status, 0, packed.stderr);
  const [artifact] = JSON.parse(packed.stdout);
  assert.equal(artifact.name, '@juangcarmona/lighthouse-sdlc');
  const files = artifact.files.map((file) => file.path);
  for (const path of [
    'README.md',
    'commands/status.md',
    'commands/triage.md',
    'skills/triage/SKILL.md',
    'skills/refine/SKILL.md',
    'skills/propose/SKILL.md',
    'skills/implement/SKILL.md',
    'skills/integrate/SKILL.md',
    'skills/review/SKILL.md',
    'meta-commands/ff.md',
    'meta-commands/hotfix.md',
    'meta-commands/decompose.md',
    'meta-commands/stacked.md',
    'contract.json',
    'routes.json',
    'gates.json',
    'schemas/control-plane.schema.json',
    'src/sdlc.mjs',
    'package.json'
  ]) assert.ok(files.includes(path), `missing ${path}`);
  const verified = spawnSync(process.execPath, ['src/packages/sdlc/src/sdlc.mjs', 'verify'], { cwd: root, encoding: 'utf8' });
  assert.equal(verified.status, 0, verified.stderr);
});
