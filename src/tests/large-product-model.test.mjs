import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, stat, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadProductCore, productModelDigest, prepareProductEvidence } from '../packages/sdlc/src/product-change.mjs';
import { productModelDigestFromApi } from '../packages/sdlc/src/product-change-actions.mjs';
import { preparePlanningProductEvidence, installProductEvidence } from '../packages/sdlc/src/opencode-execute.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
const modelRoot = 'docs/product/model';
const revision = 'a'.repeat(40);
const expectedDigest = files => sha([...files].sort(([a], [b]) => a.localeCompare(b)).map(([path, content]) => `${path}\0${sha(content)}\n`).join(''));

async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-large-model-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '.product'));
  await mkdir(join(root, modelRoot, 'actors'), { recursive: true });
  await writeFile(join(root, '.product/config.yaml'), 'version: v1alpha1\nproduct-root: docs/product\n');
  return root;
}

function actor(number) {
  const id = `ACT-${String(number).padStart(4, '0')}`;
  return { path: `actors/${id.toLowerCase()}.md`, content: `---\nid: ${id}\ntype: actor\ntitle: Generic actor ${number}\nstatus: active\nactor-kind: human\n---\n\n# Generic actor ${number}\n\n## Purpose\n\nExercise model evidence.\n\n## Goals\n\nReceive complete evidence.\n\n## Responsibilities\n\nReview the result.\n\n## Boundaries\n\nNo approval authority is implied.\n` };
}

async function model(root, count) {
  const files = new Map();
  for (let i = count; i > 0; i--) {
    const file = actor(i);
    await writeFile(join(root, modelRoot, file.path), file.content);
    files.set(file.path, file.content);
  }
  return files;
}

function modelApi(files, { truncated = false } = {}) {
  return async path => {
    if (path === `git/trees/${revision}?recursive=1`) return { truncated, tree: [...files].map(([name, content]) => ({ path: `${modelRoot}/${name}`, type: 'blob', mode: '100644', size: Buffer.byteLength(content), sha: name })) };
    if (path === `contents/.product/config.yaml?ref=${revision}`) return null;
    if (path.startsWith('git/blobs/')) {
      const content = files.get(path.slice('git/blobs/'.length));
      assert.notEqual(content, undefined);
      return { encoding: 'base64', size: Buffer.byteLength(content), content: Buffer.from(content).toString('base64') };
    }
    throw Error(`Unexpected API path: ${path}`);
  };
}

function provider({ count = 1, reportBytes = 0, titleBytes = 0, diagnostics = [] } = {}) {
  const nodes = Array.from({ length: count }, (_, i) => ({ id: `ACT-${i}`, type: 'actor', title: 'x'.repeat(titleBytes), digest: `sha256:${'b'.repeat(64)}` }));
  return { version: '0.25.0', openRepository: async () => ({}), validateBaseline: async () => ({ diagnostics, graph: { nodes } }), inspectArtifact: (_graph, id) => ({ id, data: 'x'.repeat(reportBytes) }), analyzeImpact: (_graph, id) => ({ root: id }), emitCitation: ({ id }) => id };
}

test('640 real-provider artifacts are fingerprinted, serialized and installed completely', async t => {
  const root = await workspace(t), files = await model(root, 640);
  const core = await loadProductCore();
  assert.equal(core.version, '0.25.0');
  const repository = await core.openRepository(root);
  assert.deepEqual(repository.configDiagnostics, []);
  const baseline = await core.validateBaseline(repository);
  assert.deepEqual(baseline.diagnostics, []);
  assert.equal(baseline.graph.nodes.length, 640);
  const expected = expectedDigest(files);
  assert.equal(await productModelDigest(root), expected);
  assert.equal((await productModelDigestFromApi(modelApi(files), revision)).digest, expected);

  const run = join(root, 'run'); await mkdir(run);
  await writeFile(join(run, 'context.json'), JSON.stringify({ contract: { rules: 'Original rules.' } }));
  const result = await preparePlanningProductEvidence(root, run, { core });
  assert.equal(result.artifacts, 640);
  assert.equal(result.baselineDigest, expected);
  const installed = join(root, '.lighthouse-product-evidence');
  const prepared = join(run, 'evidence/host/product-context');
  const indexBytes = await readFile(join(installed, 'index.json'));
  assert.deepEqual(indexBytes, await readFile(join(prepared, 'index.json')));
  const index = JSON.parse(indexBytes);
  assert.equal(index.baselineDigest, expected);
  assert.equal(index.artifacts.length, 640);
  assert.equal(new Set(index.artifacts.map(item => item.id)).size, 640);
  assert.equal((await readdir(installed)).length, 641);
  assert.equal((await readdir(prepared)).length, 641);
  for (const node of baseline.graph.nodes) {
    assert.deepEqual(index.artifacts.find(item => item.id === node.id), { id: node.id, type: node.type, title: node.title, report: `${node.id}.json` });
    const reportBytes = await readFile(join(installed, `${node.id}.json`));
    assert.deepEqual(reportBytes, await readFile(join(prepared, `${node.id}.json`)));
    assert.deepEqual(JSON.parse(reportBytes), { inspect: core.inspectArtifact(baseline.graph, node.id), impact: core.analyzeImpact(baseline.graph, node.id), citation: core.emitCitation({ id: node.id, digest: node.digest, form: 'payload' }) });
    assert.equal((await stat(join(installed, `${node.id}.json`))).mode & 0o222, 0);
    assert.equal(await readFile(join(root, node.path), 'utf8'), files.get(node.path.slice(modelRoot.length + 1)));
  }
  assert.equal((await stat(join(installed, 'index.json'))).mode & 0o222, 0);
  assert.equal(JSON.parse(await readFile(join(run, 'context.json'))).productEvidence.artifacts, 640);
  assert.equal(await productModelDigest(root), expected);

  const last = actor(640);
  await writeFile(join(root, modelRoot, last.path), last.content + '\nChanged final artifact.\n');
  files.set(last.path, last.content + '\nChanged final artifact.\n');
  assert.notEqual(await productModelDigest(root), expected);
  assert.equal(await productModelDigest(root), expectedDigest(files));
  assert.equal((await productModelDigestFromApi(modelApi(files), revision)).digest, expectedDigest(files));
});

test('API overlays can grow a 512-file model to 640 without losing fingerprint rows', async t => {
  const root = await workspace(t), files = await model(root, 640);
  const original = new Map([...files].filter(([path]) => Number(path.match(/act-(\d+)/)[1]) <= 512));
  const overrides = [...files].filter(([path]) => !original.has(path)).map(([path, content]) => ({ path: `${modelRoot}/${path}`, content }));
  const result = await productModelDigestFromApi(modelApi(original), revision, overrides);
  assert.equal(result.digest, expectedDigest(files));
  assert.equal(result.digest, await productModelDigest(root));
});

test('model per-file, aggregate and API tree safeguards remain independent of count', async t => {
  const root = await workspace(t);
  const oversized = new Map([['large.md', 'x'.repeat(65537)]]);
  await writeFile(join(root, modelRoot, 'large.md'), oversized.get('large.md'));
  await assert.rejects(productModelDigest(root), /fingerprint bounds/);
  await assert.rejects(productModelDigestFromApi(modelApi(oversized), revision), /bounded regular file/);
  await rm(join(root, modelRoot, 'large.md'));
  const files = new Map();
  for (let i = 0; i < 129; i++) {
    const name = `${i}.md`, content = 'x'.repeat(65536);
    files.set(name, content); await writeFile(join(root, modelRoot, name), content);
  }
  await assert.rejects(productModelDigest(root), /fingerprint bounds/);
  await assert.rejects(productModelDigestFromApi(modelApi(files), revision), /aggregate bound/);
  await assert.rejects(productModelDigestFromApi(modelApi(files, { truncated: true }), revision), /API bound/);
  const small = new Map([['one.md', 'one']]);
  const additions = Array.from({ length: 129 }, (_, i) => ({ path: `${modelRoot}/new-${i}.md`, content: 'x'.repeat(65536) }));
  await assert.rejects(productModelDigestFromApi(modelApi(small), revision, additions), /aggregate bound/);
});

test('preparation retains report, aggregate and serialized-index byte bounds', async t => {
  const root = await workspace(t);
  await assert.rejects(prepareProductEvidence(root, join(root, 'report'), provider({ reportBytes: 512 * 1024 })), /byte bound/);
  await assert.rejects(prepareProductEvidence(root, join(root, 'aggregate'), provider({ count: 34, reportBytes: 500 * 1024 })), /byte bound/);
  await assert.rejects(prepareProductEvidence(root, join(root, 'index'), provider({ count: 2, titleBytes: 270 * 1024 })), /index exceeds the byte bound/);
  await assert.rejects(stat(join(root, 'index/index.json')), { code: 'ENOENT' });
});

test('invalid graphs, blocking diagnostics, unsafe identities and changed baselines remain rejected', async t => {
  const root = await workspace(t); await model(root, 1);
  const digest = await productModelDigest(root);
  await assert.rejects(prepareProductEvidence(root, join(root, 'invalid'), provider({ diagnostics: [{ severity: 'error' }] })), /blocking diagnostic/);
  await assert.rejects(prepareProductEvidence(root, join(root, 'graph'), { ...provider(), validateBaseline: async () => ({ diagnostics: [], graph: { nodes: null } }) }), /graph is invalid/);
  await assert.rejects(prepareProductEvidence(root, join(root, 'unsafe'), { ...provider(), validateBaseline: async () => ({ diagnostics: [], graph: { nodes: [{ id: '../unsafe' }] } }) }), /unsafe artifact identity/);
  await assert.rejects(prepareProductEvidence(root, join(root, 'stale'), provider(), { baselineDigest: 'f'.repeat(64) }), /baseline changed before/);
  const changing = provider();
  const validate = changing.validateBaseline;
  changing.validateBaseline = async () => {
    await writeFile(join(root, modelRoot, 'added.md'), 'Changed baseline\n');
    return validate();
  };
  await assert.rejects(prepareProductEvidence(root, join(root, 'changed'), changing, { baselineDigest: digest }), /baseline changed during/);
});

async function evidence(root, name, count = 1, content = '{}') {
  const input = join(root, name), source = join(root, `${name}-source`);
  await mkdir(input); await mkdir(source);
  const index = { schemaVersion: 1, source: '@prodshape/core', version: '0.25.0', baselineDigest: 'a'.repeat(64), artifacts: [] };
  for (let i = 0; i < count; i++) {
    const id = `ACT-${i}`, report = `${id}.json`;
    index.artifacts.push({ id, report }); await writeFile(join(input, report), content);
  }
  await writeFile(join(input, 'index.json'), JSON.stringify(index));
  return { input, source, index };
}

test('installation retains per-file, index and aggregate byte bounds', async t => {
  const root = await workspace(t);
  const report = await evidence(root, 'report', 1, 'x'.repeat(512 * 1024 + 1));
  await assert.rejects(installProductEvidence(report.input, report.source), /exceeds bounds/);
  const index = await evidence(root, 'index');
  await writeFile(join(index.input, 'index.json'), ' '.repeat(512 * 1024 + 1));
  await assert.rejects(installProductEvidence(index.input, index.source), /index is unsafe or exceeds bounds/);
  const aggregate = await evidence(root, 'aggregate', 35, 'x'.repeat(512 * 1024));
  await assert.rejects(installProductEvidence(aggregate.input, aggregate.source), /exceeds bounds/);
});

test('installation rejects mismatched, incomplete, duplicate and unsafe evidence inventories', async t => {
  const root = await workspace(t);
  for (const mode of ['baseline', 'missing', 'duplicate', 'identity', 'unsafe-name', 'symlink', 'index-symlink']) {
    const f = await evidence(root, mode, 2);
    if (mode === 'missing') f.index.artifacts.pop();
    if (mode === 'duplicate') f.index.artifacts[1] = f.index.artifacts[0];
    if (mode === 'identity') f.index.artifacts[0].id = 'ACT-OTHER';
    await writeFile(join(f.input, 'index.json'), JSON.stringify(f.index));
    if (mode === 'unsafe-name') await writeFile(join(f.input, 'unexpected.txt'), 'data');
    if (mode === 'symlink' || mode === 'index-symlink') {
      const name = mode === 'symlink' ? 'ACT-0.json' : 'index.json';
      const content = await readFile(join(f.input, name));
      await rm(join(f.input, name));
      await writeFile(join(root, `${mode}-target`), content);
      await symlink(join(root, `${mode}-target`), join(f.input, name));
    }
    await assert.rejects(installProductEvidence(f.input, f.source, mode === 'baseline' ? 'b'.repeat(64) : f.index.baselineDigest), /index is invalid|inventory is invalid|unsafe/);
  }
});
