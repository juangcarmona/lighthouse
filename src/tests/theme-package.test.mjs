import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('the UI artifact contains the complete visual contract', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const packages = [
    ['@juangcarmona/lighthouse', ['README.md', 'assets/guardrails/catalog.json', 'assets/profiles/catalog.json', 'assets/schemas/guardrails.schema.json', 'assets/schemas/lighthouse-manifest.schema.json', 'assets/schemas/lighthouse-upgrade.schema.json', 'assets/schemas/profile-catalog.schema.json', 'package.json', 'src/guardrails.mjs', 'src/lighthouse.mjs', 'src/profiles.mjs', 'upgrades/0.3.0.md', 'upgrades/0.4.0.md']],
    ['@juangcarmona/lighthouse-ui', ['DESIGN.md', 'README.md', 'components.css', 'index.css', 'package.json', 'skills/ui-design/SKILL.md', 'tokens.css']]
  ];
  for (const [name, files] of packages) {
    const packed = spawnSync('npm', ['pack', '--workspace', name, '--dry-run', '--json'], { cwd: root, encoding: 'utf8' });
    assert.equal(packed.status, 0, packed.stderr);
    const [artifact] = JSON.parse(packed.stdout);
    assert.equal(artifact.name, name);
    assert.deepEqual(artifact.files.map((file) => file.path).sort(), files);
  }
});
