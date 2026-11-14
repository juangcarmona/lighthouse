import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

test('public-site verification accepts the Explorer and checks its published references', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-public-site-'));
  const explorer = '<title>Lighthouse’s Product Explorer</title><a href="#/artifacts/ACT-USER">User</a>';
  const flows = ['triage', 'refine', 'propose', 'implement', 'apply-review', 'integrate', 'review', 'product-change', 'apply-product-change', 'maintenance', 'unattended', 'product-definition-as-code', 'worker-reports'];
  const files = {
    'src/packages/cli/package.json': '{"version":"1.0.0"}',
    'src/packages/ui/tokens.css': '/* tokens */',
    'src/packages/ui/components.css': '/* components */',
    'dist/public-site/index.html': `v1.0.0 Worker reports ${flows.map(slug => `<a class="diagram-card" href="architecture/index.html#/section/06/${slug}">${slug}</a>`).join('')}`,
    'dist/public-site/site.css': '',
    'dist/public-site/site.js': '',
    'dist/public-site/assets/lighthouse.css': '/* tokens */\n/* components */',
    'dist/public-site/assets/lighthouse-icon.svg': '',
    'dist/public-site/assets/lighthouse-icon-light.svg': '',
    'dist/public-site/assets/github-banner.svg': '',
    'dist/public-site/assets/lighthouse-beam.svg': '',
    'dist/public-site/model/index.html': explorer,
    'dist/public-site/architecture/index.html': `ArcShape Architecture Snapshot <a href="https://github.com/juangcarmona/lighthouse/blob/${'a'.repeat(40)}/src/packages/sdlc/README.md">Source</a>`,
  };
  for (const file of ['index.html', 'diagram.svg', 'source.json', 'provenance.json']) {
    files[`dist/public-site/architecture/diagrams/abc/${file}`] = '';
  }
  try {
    for (const [path, content] of Object.entries(files)) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), content);
    }
    await mkdir(join(root, 'scripts'));
    await copyFile(new URL('../../scripts/verify-public-site.mjs', import.meta.url), join(root, 'scripts/verify-public-site.mjs'));
    const verify = () => spawnSync(process.execPath, ['scripts/verify-public-site.mjs'], { cwd: root, encoding: 'utf8' });
    let result = verify();
    assert.equal(result.status, 0, result.stderr);

    const model = join(root, 'dist/public-site/model/index.html');
    await writeFile(model, '<title>Product Snapshot</title>');
    result = verify();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /ProductShape Explorer is missing or stale/);

    await writeFile(model, `${explorer}<link href='../assets/lighthouse.css?version=1#tokens'><script src="../site.js?v=1"></script>`);
    result = verify();
    assert.equal(result.status, 0, result.stderr);

    await writeFile(model, `${explorer}<script src="site.js"></script>`);
    result = verify();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing public-site reference in model\/index.html: site.js/);

    await writeFile(model, `${explorer}<a href="../../../package.json">Outside publication</a>`);
    result = verify();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing public-site reference in model\/index.html/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
