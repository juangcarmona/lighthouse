import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../packages/sdlc/src/', import.meta.url);
const source = name => readFile(new URL(name, root), 'utf8');
const imports = text => [...text.matchAll(/(?:from\s+|import\s*\()(['"])([^'"]+)\1/g)].map(match => match[2]);

test('delivery modules do not depend on the executable issue adapter', async () => {
  for (const name of await readdir(root)) {
    if (!name.endsWith('.mjs') || name === 'issue-actions.mjs') continue;
    assert.ok(!imports(await source(name)).includes('./issue-actions.mjs'), `${name} imports the issue executable`);
  }
});

test('validation and receipt readers do not load publication or PR-state controllers', async () => {
  assert.ok(!imports(await source('host-contract.mjs')).includes('./proposal.mjs'));
  for (const name of ['implementation-evidence.mjs', 'delivery-request.mjs', 'integration-request.mjs']) {
    assert.ok(!imports(await source(name)).includes('./pr-state.mjs'), `${name} loads PR-state orchestration`);
  }
});
