import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProductChangeFiles } from '../packages/sdlc/src/product-change.mjs';

test('accepts the required schema pin while rejecting hidden and escaping paths', () => {
  const root = 'openspec/changes/example';
  const files = [
    { path: `${root}/.openspec.yaml`, content: 'schema: product-change\n' },
    { path: `${root}/product-change/change.md`, content: '---\nid: CHG-EXAMPLE\nstatus: draft\n---\n' },
    { path: `${root}/product-change/proposed/requirement.md`, content: 'Requirement' },
  ];
  assert.equal(validateProductChangeFiles(files, { changeName: 'example' }).changeId, 'CHG-EXAMPLE');
  for (const path of [`${root}/product-change/proposed/.hidden.md`, `${root}/product-change/proposed/.hidden/file.md`, `${root}/../escape.md`, `${root}/.other.yaml`]) {
    assert.throws(() => validateProductChangeFiles([...files, { path, content: 'x' }], { changeName: 'example' }));
  }
});
