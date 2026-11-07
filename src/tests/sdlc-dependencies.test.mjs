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

async function staticGraph() {
  const graph = new Map();
  for (const name of (await readdir(root)).filter(name => name.endsWith('.mjs'))) {
    const edges = [...(await source(name)).matchAll(/(?:import|export)\s+(?:[^;]*?\s+from\s+)?['"]\.\/([^'"]+\.mjs)['"]/g)].map(match => match[1]);
    graph.set(name, [...new Set(edges)]);
  }
  return graph;
}

test('delivery services have no static dependency cycle', async () => {
  const graph = await staticGraph(), done = new Set(), active = new Set(), path = [];
  const visit = name => {
    assert.ok(!active.has(name), `Static cycle: ${[...path, name].join(' -> ')}`);
    if (done.has(name)) return;
    active.add(name); path.push(name);
    for (const dependency of graph.get(name) ?? []) visit(dependency);
    path.pop(); active.delete(name); done.add(name);
  };
  for (const name of graph.keys()) visit(name);
});

test('completion observations and evidence services do not load the event authorization facade', async () => {
  for (const name of ['completion-state.mjs', 'completion-contract.mjs', 'integration-evidence.mjs', 'process-publication.mjs', 'completion-recovery.mjs', 'post-merge-review.mjs']) {
    for (const dependency of imports(await source(name))) assert.ok(!['./completion.mjs', './completion-events.mjs', './issue-actions.mjs', './completion-actions.mjs'].includes(dependency), `${name} loads event authorization through ${dependency}`);
  }
});

test('CI delivery shares retry policy without loading recovery orchestration', async () => {
  assert.ok(!imports(await source('delivery-events.mjs')).includes('./worker-recovery.mjs'));
  assert.deepEqual(imports(await source('recovery-policy.mjs')), []);
});

test('the completion facade preserves public exports and recovery defaults', async () => {
  const api = await import('../packages/sdlc/src/completion.mjs');
  assert.deepEqual(Object.keys(api).sort(), ['assertChecks', 'assertCitedChecks', 'assertFresh', 'authorizeCompletion', 'authorizeCompletionEvent', 'checkCommit', 'completionEffects', 'evidenceProtection', 'fingerprint', 'inspectCompletion', 'list', 'loadProfile', 'mergeAccepted', 'observeChecks', 'postMergeRuns', 'requiredPolicy', 'ruleRevision', 'sha'].sort());
  assert.equal(api.inspectCompletion, (await import('../packages/sdlc/src/completion-state.mjs')).inspectCompletion);
  assert.equal(api.authorizeCompletionEvent, (await import('../packages/sdlc/src/completion-events.mjs')).authorizeCompletionEvent);
  const policy = await import('../packages/sdlc/src/worker-recovery.mjs');
  assert.equal(policy.retryLimit, 2);
  assert.equal(policy.retryDelayMs, 30 * 60 * 1000);
});
