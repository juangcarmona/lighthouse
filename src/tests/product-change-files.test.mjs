import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProductChangeFiles, validateProductChangeOutput, productModelDirectory, prepareProductEvidence } from '../packages/sdlc/src/product-change.mjs';
import { bindValidatedProductCandidate } from '../packages/sdlc/src/product-change-actions.mjs';
import { installProductEvidence } from '../packages/sdlc/src/opencode-execute.mjs';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('the product model path follows the adopter configuration without escaping the workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-product-model-path-'));
  try {
    await mkdir(join(root, '.product'));
    await writeFile(join(root, '.product/config.yaml'), 'product-root: custom/product\n');
    assert.equal(await productModelDirectory(root), 'custom/product/model');
    await writeFile(join(root, '.product/config.yaml'), 'product-root: ../outside\n');
    await assert.rejects(productModelDirectory(root), /unsafe/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('provider graph evidence reaches only the isolated product workspace', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-product-evidence-'));
  try {
    const node = { id: 'FR-ONE', type: 'functional-requirement', title: 'One', digest: `sha256:${'a'.repeat(64)}` };
    const core = { version: '0.25.0', openRepository: async () => ({}), validateBaseline: async () => ({ diagnostics: [], graph: { nodes: [node] } }), inspectArtifact: (_graph, id) => ({ id }), analyzeImpact: (_graph, id) => ({ root: id, questioned: [] }), emitCitation: ({ id, digest }) => `pdac:cite id="${id}" digest="${digest}"` };
    const evidence = join(root, 'input'), source = join(root, 'source');
    await mkdir(source);
    assert.equal((await prepareProductEvidence(root, evidence, core)).artifacts, 1);
    await installProductEvidence(evidence, source);
    const report = JSON.parse(await readFile(join(source, '.lighthouse-product-evidence/FR-ONE.json'), 'utf8'));
    assert.equal(report.inspect.id, 'FR-ONE');
    assert.match(report.citation, /pdac:cite id="FR-ONE"/);
    await assert.rejects(installProductEvidence(evidence, source), /EEXIST/);
    const other = join(root, 'other'); await mkdir(other);
    await assert.rejects(installProductEvidence(evidence, other, 'b'.repeat(64)), /index is invalid/);
    await assert.rejects(prepareProductEvidence(root, join(root, 'invalid'), { ...core, validateBaseline: async () => ({ diagnostics: [{ severity: 'error' }], graph: { nodes: [node] } }) }), /blocking diagnostic/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

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

test('the host binds and validates a candidate without requiring a shell in the agent', () => {
  const root = 'openspec/changes/example', baseline = 'a'.repeat(64);
  const files = [
    { path: `${root}/.openspec.yaml`, content: 'schema: product-change\n' },
    { path: `${root}/product-change/change.md`, content: '---\nid: CHG-EXAMPLE\nstatus: draft\n---\n' },
    { path: `${root}/product-change/proposed/requirement.md`, content: 'Requirement' },
  ];
  const product = { schemaVersion: 1, outcome: 'candidate', entry: 'idea', affectedAreas: [], decisions: [], changeName: 'example', changeId: 'CHG-EXAMPLE', files, baselineDigest: baseline, providerValidation: { status: 'pending', diagnosticCount: 0 } };
  const digest = validateProductChangeFiles(files, { changeName: 'example' }).digest;
  const validation = { provider: 'passed', openSpec: 'passed', changeId: 'CHG-EXAMPLE', baselineDigest: baseline, digest, diagnosticCount: 2 };
  assert.deepEqual(validateProductChangeOutput(product), []);
  const bound = bindValidatedProductCandidate(product, validation, baseline);
  assert.equal(bound.proposalDigest, digest);
  assert.deepEqual(bound.providerValidation, { status: 'passed', diagnosticCount: 2 });
  assert.deepEqual(validateProductChangeOutput(bound), []);
  for (const changed of [{ ...validation, provider: 'failed' }, { ...validation, digest: 'b'.repeat(64) }, { ...validation, baselineDigest: 'c'.repeat(64) }]) {
    if (changed.digest !== digest) assert.throws(() => bindValidatedProductCandidate({ ...product, proposalDigest: digest }, changed, baseline));
    else assert.throws(() => bindValidatedProductCandidate(product, changed, baseline));
  }
  assert.ok(validateProductChangeOutput({ ...product, providerValidation: { status: 'passed', diagnosticCount: 0 } }).length);
  assert.ok(validateProductChangeOutput({ ...product, providerValidation: { status: 'pending', diagnosticCount: 1 } }).length);
});
