import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

test('every installable worker links its source from the shared accessible route map', async () => {
  const root = new URL('../packages/sdlc/workflows/', import.meta.url);
  const catalogue = await readFile(new URL('../../docs/architecture/06-runtime-view/worker-catalogue.md', import.meta.url), 'utf8');
  const installer = await readFile(new URL('../packages/sdlc/src/install-workflows.mjs', import.meta.url), 'utf8');
  for (const file of (await readdir(root)).filter(x => /^lighthouse-sdlc-.*\.md$/.test(x) && installer.includes(x))) {
    const name = file.slice('lighthouse-sdlc-'.length, -3);
    assert.ok(catalogue.includes(`## ${name}\n`), `catalogue omits ${name}`);
    assert.ok(catalogue.includes(`/workflows/${file})`), `source link missing for ${name}`);
  }
  assert.match(catalogue, /accTitle: Worker routes/);
  assert.ok(catalogue.includes('/src/packages/sdlc/README.md)'));
  for (const diagram of catalogue.matchAll(/```mermaid\n([\s\S]*?)```/g)) {
    assert.match(diagram[1], /accTitle:/); assert.match(diagram[1], /accDescr:/);
  }
});
