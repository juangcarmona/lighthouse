import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { implementationPlanMetadata, prepareImplementationPlanMetadata } from '../packages/sdlc/src/implementation-plan.mjs';

const root = 'openspec/changes/issue-414-proposal', path = `${root}/.openspec.yaml`;
const request = { issue: 414, implementation: { proposal: { root } } };
const file = content => ({ mode: '100644', content: Buffer.from(content) });
const documents = new Map(['proposal.md', 'design.md', 'tasks.md'].map(name => [`${root}/${name}`, file(name === 'tasks.md' ? '- [x] Implemented and checked.\n' : '# Plan\n')]));
const generated = 'schema: spec-driven\ncreated: 2026-11-01\n';
const unavailable = () => { throw Error('Provider must not run'); };

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
