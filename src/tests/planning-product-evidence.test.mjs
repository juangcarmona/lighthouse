import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { preparePlanningProductEvidence } from '../packages/sdlc/src/opencode-execute.mjs';
import { productModelDigest, loadProductCore } from '../packages/sdlc/src/product-change.mjs';

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-planning-product-')), source = join(dir, 'source'), run = join(dir, 'run');
  await mkdir(join(source, '.product'), { recursive: true }); await mkdir(join(source, 'docs/product/model'), { recursive: true }); await mkdir(run);
  await writeFile(join(source, '.product/config.yaml'), 'version: v1alpha1\nproduct-root: docs/product\n');
  const model = join(source, 'docs/product/model/fr-one.md'), content = '# Current supplied observation contract\n';
  await writeFile(model, content);
  const context = { request: { sourceRevision: 'a'.repeat(40) }, contract: { rules: 'Original responsibility.' } };
  await writeFile(join(run, 'context.json'), JSON.stringify(context));
  const digest = 'sha256:' + createHash('sha256').update(content).digest('hex');
  const core = { version: '0.25.0', openRepository: async () => ({}), validateBaseline: async () => ({ diagnostics: [], graph: { nodes: [{ id: 'FR-ONE', type: 'functional-requirement', title: 'One', digest }] } }), inspectArtifact: (_graph, id) => ({ id }), analyzeImpact: (_graph, id) => ({ root: id }), emitCitation: ({ id, digest }) => `pdac:cite id="${id}" digest="${digest}"` };
  return { dir, source, run, model, content, context, core, digest };
}

test('a read-only planner receives current provider inspect, impact and citation reports without model mutation', async () => {
  const f = await fixture();
  try {
    const expected = await productModelDigest(f.source), result = await preparePlanningProductEvidence(f.source, f.run, { core: f.core });
    assert.equal(result.baselineDigest, expected); assert.equal(result.artifacts, 1);
    const context = JSON.parse(await readFile(join(f.run, 'context.json')));
    assert.deepEqual(context.request, f.context.request); assert.equal(context.productEvidence.evidenceRoot, '/workspace/.lighthouse-product-evidence');
    assert.match(context.contract.rules, /Original responsibility/); assert.match(context.contract.rules, /citation/);
    const reportPath = join(f.source, '.lighthouse-product-evidence/FR-ONE.json');
    const report = JSON.parse(await readFile(reportPath));
    assert.equal(report.inspect.id, 'FR-ONE'); assert.equal(report.impact.root, 'FR-ONE'); assert.ok(report.citation.includes(f.digest));
    assert.equal((await stat(reportPath)).mode & 0o222, 0);
    assert.equal(await readFile(f.model, 'utf8'), f.content); assert.equal(await productModelDigest(f.source), expected);
    assert.deepEqual(JSON.parse(await readFile(join(f.run, 'evidence/host/product-context/FR-ONE.json'))), report);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('missing configuration does not install a provider or claim product adoption', async () => {
  const f = await fixture();
  try {
    await rm(join(f.source, '.product/config.yaml'));
    const before = await readFile(join(f.run, 'context.json'));
    const install = async () => { throw Error('Must not install'); };
    assert.equal(await preparePlanningProductEvidence(f.source, f.run, { install }), null);
    assert.deepEqual(await readFile(join(f.run, 'context.json')), before);
    await assert.rejects(stat(join(f.source, '.lighthouse-product-evidence')), { code: 'ENOENT' });
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('invalid or changed baselines and preexisting report directories cannot yield planning evidence', async () => {
  for (const mode of ['invalid', 'changed', 'collision']) {
    const f = await fixture();
    try {
      const original = f.core.validateBaseline;
      if (mode === 'invalid') f.core.validateBaseline = async () => ({ diagnostics: [{ severity: 'error' }], graph: { nodes: [] } });
      if (mode === 'changed') f.core.validateBaseline = async () => { await writeFile(f.model, 'Changed model\n'); return original(); };
      if (mode === 'collision') await mkdir(join(f.source, '.lighthouse-product-evidence'));
      const before = await readFile(join(f.run, 'context.json'));
      await assert.rejects(preparePlanningProductEvidence(f.source, f.run, { core: f.core }), /blocking diagnostic|baseline changed|EEXIST/);
      assert.deepEqual(await readFile(join(f.run, 'context.json')), before);
    } finally { await rm(f.dir, { recursive: true, force: true }); }
  }
});

test('provider setup is pinned, isolated and credential-free, and failure remains technical', async () => {
  const f = await fixture();
  try {
    let installed = false;
    const install = async (command, args, options) => {
      installed = true; assert.equal(command, 'npm'); assert.ok(args.includes('@prodshape/core@0.25.0')); assert.ok(args.includes('--ignore-scripts'));
      assert.ok(args.includes(join(f.run, 'product-provider'))); assert.ok(options.timeout <= 60000);
      assert.equal(options.env.GH_TOKEN, undefined); assert.equal(options.env.GITHUB_TOKEN, undefined); assert.notEqual(options.env.HOME, process.env.HOME);
      assert.notEqual(options.env.NPM_CONFIG_USERCONFIG, options.env.NPM_CONFIG_GLOBALCONFIG);
      for (const key of ['NPM_CONFIG_USERCONFIG', 'NPM_CONFIG_GLOBALCONFIG']) assert.equal(await readFile(options.env[key], 'utf8'), '');
      throw Object.assign(Error('Registry unavailable'), { stderr: 'ETIMEDOUT public registry' });
    };
    await assert.rejects(preparePlanningProductEvidence(f.source, f.run, { install }), /ProductShape.*setup.*ETIMEDOUT/);
    assert.equal(installed, true); assert.equal(await readFile(f.model, 'utf8'), f.content);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('cancellation stops provider setup and incompatible provider versions are rejected', async () => {
  const f = await fixture();
  try {
    const controller = new AbortController(); controller.abort();
    await assert.rejects(preparePlanningProductEvidence(f.source, f.run, { signal: controller.signal, install: async () => { throw Error('Must not install'); } }), { name: 'AbortError' });
    const pkg = join(f.dir, 'wrong-provider'); await mkdir(join(pkg, 'dist'), { recursive: true });
    await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: '@prodshape/core', version: '0.24.0' }));
    await writeFile(join(pkg, 'dist/index.js'), 'throw Error("Must not import incompatible provider");');
    await assert.rejects(loadProductCore({ entry: join(pkg, 'dist/index.js') }), /Pinned ProductShape core 0.25.0/);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('cancellation interrupts an active provider installation before planning context publication', async () => {
  const f = await fixture(), controller = new AbortController(), active = Promise.withResolvers();
  try {
    const install = (_command, _args, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(Error('Provider setup cancelled'), { name: 'AbortError' })), { once: true }); active.resolve();
    });
    const before = await readFile(join(f.run, 'context.json'));
    const preparing = preparePlanningProductEvidence(f.source, f.run, { install, signal: controller.signal });
    await active.promise; controller.abort();
    await assert.rejects(preparing, { name: 'AbortError' });
    assert.deepEqual(await readFile(join(f.run, 'context.json')), before);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('cancellation during graph validation cannot publish a planning context', async () => {
  const f = await fixture(), controller = new AbortController();
  try {
    const validate = f.core.validateBaseline;
    f.core.validateBaseline = async repository => { controller.abort(); return validate(repository); };
    const before = await readFile(join(f.run, 'context.json'));
    await assert.rejects(preparePlanningProductEvidence(f.source, f.run, { core: f.core, signal: controller.signal }), { name: 'AbortError' });
    assert.deepEqual(await readFile(join(f.run, 'context.json')), before);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});
