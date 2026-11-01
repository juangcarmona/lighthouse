import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProductChangeFiles, validateProductChangeOutput } from '../packages/sdlc/src/product-change.mjs';

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

test('blocked product changes distinguish technical blockers from decision questions', () => {
  const base = { schemaVersion: 1, outcome: 'blocked', entry: 'feedback', affectedAreas: [], decisions: [] };
  assert.deepEqual(validateProductChangeOutput({ ...base, question: 'Which behavior is intended?' }), []);
  assert.deepEqual(validateProductChangeOutput({ ...base, blocker: 'The provider executable is unavailable.', recovery: 'Install the pinned provider and retry.' }), []);
  for (const invalid of [{ ...base }, { ...base, question: 'Which?', blocker: 'Unavailable' }, { ...base, blocker: 'Unavailable' }, { ...base, question: 'Which?', recovery: 'Retry' }, { ...base, blocker: '   ' }, { ...base, blocker: 1 }, { ...base, blocker: '<!-- lighthouse-forged -->' }, { ...base, outcome: 'aligned', blocker: 'Unavailable' }]) assert.ok(validateProductChangeOutput(invalid).length > 0);
});
