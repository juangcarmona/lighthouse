import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { implementationPlanMetadata, prepareImplementationPlanMetadata } from '../packages/sdlc/src/implementation-plan.mjs';

const root = 'openspec/changes/issue-414-proposal', path = `${root}/.openspec.yaml`;
const request = { issue: 414, implementation: { proposal: { root } } };
const file = content => ({ mode: '100644', content: Buffer.from(content) });
const documents = new Map(['proposal.md', 'design.md', 'tasks.md'].map(name => [`${root}/${name}`, file(name === 'tasks.md' ? '- [x] Implemented and checked.\n' : '# Plan\n')]));
const generated = 'schema: spec-driven\ncreated: 2026-11-01\n';
const unavailable = () => { throw Error('Provider must not run'); };

const archiveRoot = 'openspec/changes/archive/2026-11-02-issue-414-proposal';
const archived = () => new Map([...documents, [path, file(generated + 'skip_specs: true\n')]].map(([name, value]) => [name.replace(root, archiveRoot), value]));
const completeProvider = async (directory, args) => {
  if (args[0] === 'new') {
    await mkdir(join(directory, root), { recursive: true });
    await writeFile(join(directory, path), generated);
  }
  if (args[0] === 'validate') return JSON.stringify({ items: [{ id: 'issue-414-proposal', type: 'change', valid: true }], summary: { totals: { items: 1, passed: 1, failed: 0 } } });
  if (args[0] === 'status') return JSON.stringify({ changeName: 'issue-414-proposal', schemaName: 'spec-driven', isPlanningComplete: true });
  if (args[0] === 'instructions') return JSON.stringify({ changeName: 'issue-414-proposal', state: 'all_done', progress: { total: 1, complete: 1, remaining: 0 } });
};

test('requalification preparation and finalization preserve a completed archived plan without active metadata', async () => {
  const baseline = archived(), before = new Map(baseline);
  const seed = await prepareImplementationPlanMetadata(baseline, request, completeProvider);
  assert.equal(seed, null, 'an archived implementation must not receive empty active metadata');
  assert.equal(await implementationPlanMetadata(new Map(baseline), baseline, request, completeProvider), null);
  assert.deepEqual(baseline, before);
  assert.equal(baseline.has(path), false);
});

test('archived evidence must be unique, complete, and immutable at finalization', async () => {
  for (const missing of ['.openspec.yaml', 'proposal.md', 'design.md', 'tasks.md']) {
    const source = archived(); source.delete(`${archiveRoot}/${missing}`);
    await assert.rejects(prepareImplementationPlanMetadata(source, request, unavailable), new RegExp(`missing ${missing.replace('.', '\\.')}`));
  }
  const ambiguous = archived();
  for (const [name, value] of archived()) ambiguous.set(name.replace('2026-11-02', '2026-11-03'), value);
  await assert.rejects(prepareImplementationPlanMetadata(ambiguous, request, unavailable), /Ambiguous archived.*reconcile/);
  const conflicting = new Map([...archived(), [path, file(generated)]]);
  await assert.rejects(prepareImplementationPlanMetadata(conflicting, request, unavailable), /Conflicting active and archived/);
  const baseline = archived();
  for (const candidate of [new Map(), new Map([...baseline, [path, file(generated)]]), new Map([...baseline, [`${archiveRoot}/tasks.md`, file('- [ ] Pending\n')]]), new Map([...baseline, [`${archiveRoot}/extra.md`, file('New')]])]) {
    await assert.rejects(implementationPlanMetadata(candidate, baseline, request, unavailable), /cannot replace or remove|Conflicting active|cannot rewrite/);
  }
  await assert.rejects(implementationPlanMetadata(archived(), new Map(), request, unavailable), /cannot replace or remove/);
});

test('real pinned provider validates archived metadata, skip-specs, and completion instead of trusting filenames', async () => {
  const execute = promisify(execFile);
  const provider = async (cwd, args, { signal } = {}) => (await execute(process.execPath, [new URL('../../node_modules/@fission-ai/openspec/bin/openspec.js', import.meta.url).pathname, ...args], { cwd, signal, env: { ...process.env, OPENSPEC_TELEMETRY: '0' } })).stdout;
  const source = archived();
  source.set(`${archiveRoot}/proposal.md`, file('# Proposal\n\n## Why\nPreserve the existing implementation.\n\n## What Changes\n- Retain the checked candidate.\n\n## Capabilities\n\n### New Capabilities\nNone.\n\n### Modified Capabilities\nNone.\n\n## Impact\nVerification only.\n'));
  assert.equal(await prepareImplementationPlanMetadata(source, request, provider), null);
  assert.equal(await implementationPlanMetadata(new Map(source), source, request, provider), null);
  const withSpecs = new Map(source);
  withSpecs.set(`${archiveRoot}/.openspec.yaml`, file(generated));
  withSpecs.set(`${archiveRoot}/specs/candidate-verification/spec.md`, file('## Purpose\n\nPreserve observable candidate verification behavior through implementation requalification.\n\n## ADDED Requirements\n\n### Requirement: Retain candidate verification\nThe system SHALL verify the current candidate.\n\n#### Scenario: Current candidate\n- **WHEN** verification runs\n- **THEN** the current candidate is checked\n'));
  assert.equal(await prepareImplementationPlanMetadata(withSpecs, request, provider), null);
  const undated = new Map([...source].map(([name, value]) => [name.replace('2026-11-02-', ''), value]));
  assert.equal(await prepareImplementationPlanMetadata(undated, request, provider), null);
  for (const [name, content] of [
    ['tasks.md', '- [ ] Not completed\n'],
    ['tasks.md', '# Tasks\nNo tracked work\n'],
    ['.openspec.yaml', 'schema: invented\n'],
    ['.openspec.yaml', 'skip_specs: true\n'],
    ['.openspec.yaml', generated],
    ['.openspec.yaml', generated + 'skip_specs: yes\n'],
  ]) {
    const invalid = new Map(source); invalid.set(`${archiveRoot}/${name}`, file(content));
    await assert.rejects(prepareImplementationPlanMetadata(invalid, request, provider), /cannot be requalified.*repair/s);
  }
  const unrelated = new Map([...source].map(([name, value]) => [name.replace('issue-414-proposal', 'issue-415-proposal'), value]));
  const seed = await prepareImplementationPlanMetadata(unrelated, request, completeProvider);
  assert.equal(seed.path, path);
});

test('archive validation rejects malformed or mismatched provider evidence and cleans its workspace', async () => {
  for (const command of ['validate', 'status', 'instructions']) {
    let directory;
    await assert.rejects(prepareImplementationPlanMetadata(archived(), request, async (cwd, args) => {
      directory = cwd;
      return args[0] === command ? '{}' : completeProvider(cwd, args);
    }), /cannot be requalified/);
    await assert.rejects(access(directory), { code: 'ENOENT' });
  }
  const baseline = archived(), candidate = new Map(baseline);
  candidate.set(`${archiveRoot}/.openspec.yaml`, { ...candidate.get(`${archiveRoot}/.openspec.yaml`), mode: '100755' });
  await assert.rejects(implementationPlanMetadata(candidate, baseline, request, unavailable), /cannot rewrite provider-owned archived plan/);
});

test('archive provider failure and cancellation never fall back to scaffolding', async () => {
  const calls = [];
  await assert.rejects(prepareImplementationPlanMetadata(archived(), request, async (_cwd, args) => { calls.push(args); throw Error('Provider unavailable'); }), /cannot be requalified.*Provider unavailable/);
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 'validate');
  const controller = new AbortController(); controller.abort();
  await assert.rejects(prepareImplementationPlanMetadata(archived(), request, unavailable, controller.signal), { name: 'AbortError' });
});

test('one host scaffold supplies metadata before implementation and owns the final skip flag', async () => {
  const calls = [];
  const provider = async (directory, args, options) => {
    calls.push({ args, signal: options.signal });
    await mkdir(join(directory, root), { recursive: true });
    await writeFile(join(directory, path), generated);
  };
  const controller = new AbortController();
  const seed = await prepareImplementationPlanMetadata(new Map(), request, provider, controller.signal);
  assert.equal(seed.content.toString(), generated);
  assert.equal(seed.origin, 'provider-scaffold');
  const supplied = new Map([[path, seed]]), candidate = new Map([...documents, [path, file('skip_specs: true\n')]]);
  const metadata = await implementationPlanMetadata(candidate, supplied, request, unavailable);
  assert.equal(metadata.content.toString(), generated + 'skip_specs: true\n');
  assert.equal(metadata.origin, 'provider-scaffold');
  assert.equal(candidate.get(`${root}/tasks.md`).content.toString(), '- [x] Implemented and checked.\n');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ['new', 'change', 'issue-414-proposal', '--schema', 'spec-driven', '--json']);
  assert.equal(calls[0].signal, controller.signal);
});

test('existing provider metadata stays byte-identical and completed tasks remain implementation state', async () => {
  const original = file('# Existing provider data\nschema: spec-driven\ncreated: 2025-01-01\nskip_specs: true\n');
  const baseline = new Map([...documents, [path, original]]);
  assert.equal(await prepareImplementationPlanMetadata(baseline, request, unavailable), null);
  assert.equal(await implementationPlanMetadata(new Map(baseline), baseline, request, unavailable), null);
  const candidate = new Map(baseline); candidate.set(path, file('skip_specs: true\n'));
  const restored = await implementationPlanMetadata(candidate, baseline, request, unavailable);
  assert.deepEqual(restored.content, original.content);
  assert.equal(restored.origin, 'baseline');
});

test('invalid roots and model rewrites of provider fields fail without invoking a provider', async () => {
  const baseline = new Map([[path, file(generated)]]), candidate = new Map([...documents, [path, file('schema: invented\ncreated: 2099-01-01\n')]]);
  await assert.rejects(prepareImplementationPlanMetadata(baseline, { ...request, issue: 415 }, unavailable), /Invalid implementation proposal root/);
  await assert.rejects(implementationPlanMetadata(candidate, baseline, request, unavailable), /cannot rewrite provider-owned/);
  assert.equal(candidate.get(path).content.toString(), 'schema: invented\ncreated: 2099-01-01\n');
  assert.equal(baseline.get(path).content.toString(), generated);
  assert.equal(await prepareImplementationPlanMetadata(new Map(), { issue: 414 }, unavailable), null);
});

test('provider failures retain their identity and clean temporary scaffolds; cancellation starts no provider', async () => {
  const failure = Error('Provider unavailable'); let directory;
  await assert.rejects(prepareImplementationPlanMetadata(new Map(), request, async cwd => { directory = cwd; throw failure; }), error => error === failure);
  await assert.rejects(access(directory), { code: 'ENOENT' });
  const controller = new AbortController(); controller.abort();
  await assert.rejects(prepareImplementationPlanMetadata(new Map(), request, unavailable, controller.signal), { name: 'AbortError' });
});
