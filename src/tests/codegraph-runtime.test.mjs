import test from 'node:test';
import assert from 'node:assert/strict';
import { codegraphSelection, configureCodegraphWorker } from '../packages/sdlc/src/codegraph-runtime.mjs';
import { codegraphCall } from '../packages/sdlc/src/codegraph-mcp.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('CodeGraph is optional and never used for editable implementation', () => {
  assert.deepEqual(codegraphSelection({}, false), { status: 'disabled' });
  assert.deepEqual(codegraphSelection({ codegraph: { enabled: false } }, false), { status: 'disabled' });
  assert.deepEqual(codegraphSelection({ codegraph: { enabled: true, binary: '/operator/codegraph' } }, true), { status: 'unavailable', reason: 'editable implementation snapshot' });
  assert.deepEqual(codegraphSelection({ codegraph: { enabled: true, binary: 'relative' } }, false), { status: 'unavailable', reason: 'operator binary is not configured' });
  assert.deepEqual(codegraphSelection({ codegraph: { enabled: true, binary: '/operator/codegraph' } }, false), { status: 'pending' });
});

test('OpenCode admits only the two read-only CodeGraph tools to the model', () => {
  const config = configureCodegraphWorker({ policies: [{ action: 'integration.use', resource: '*', effect: 'deny' }], permissions: [{ action: '*', resource: '*', effect: 'deny' }] });
  assert.deepEqual(Object.keys(config.mcp.servers), ['codegraph']);
  for (const tool of ['codegraph_symbol_search', 'codegraph_get_ai_context']) {
    assert.deepEqual(config.permissions.findLast(rule => rule.action === `codegraph_${tool}`), { action: `codegraph_${tool}`, resource: '*', effect: 'allow' });
    assert.deepEqual(config.policies.findLast(rule => rule.resource === `codegraph_${tool}:*`), { action: 'tool.use', resource: `codegraph_${tool}:*`, effect: 'allow' });
  }
  assert.equal(config.permissions.length, 3);
  assert.throws(() => configureCodegraphWorker({ policies: [], permissions: null }), /permissions/);
});

test('CodeGraph transport admits bounded reads for this workspace only', () => {
  const call = codegraphCall({ name: 'codegraph_symbol_search', arguments: { query: 'invoice', limit: 100 } });
  assert.equal(call.arguments.limit, 10);
  assert.equal(call.arguments.compact, true);
  for (const name of ['codegraph_index_directory', 'codegraph_reindex_workspace', 'codegraph_memory_store']) {
    assert.throws(() => codegraphCall({ name, arguments: { path: '/other/repo' } }), /denied/);
  }
  assert.throws(() => codegraphCall({ name: 'codegraph_symbol_search', arguments: { query: 'x'.repeat(201) } }), /Invalid query/);
  const root = mkdtempSync(join(tmpdir(), 'lh271-scope-'));
  try {
    const own = join(root, 'own'), other = join(root, 'other');
    mkdirSync(own); mkdirSync(other);
    writeFileSync(join(own, 'source.py'), 'def own(): pass\n');
    writeFileSync(join(other, 'source.py'), 'def other(): pass\n');
    symlinkSync(join(other, 'source.py'), join(own, 'escape.py'));
    const request = path => ({ name: 'codegraph_get_ai_context', arguments: { uri: new URL(`file://${path}`).href, line: 1, maxTokens: 1000 } });
    assert.equal(codegraphCall(request(join(own, 'source.py')), own).arguments.maxTokens, 500);
    assert.throws(() => codegraphCall(request(join(other, 'source.py')), own), /outside workspace/);
    assert.throws(() => codegraphCall(request(join(own, 'escape.py')), own), /outside workspace/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
