import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadImplementation } from '../packages/sdlc/src/implementation.mjs';
import { prepareImplementationPlanMetadata, implementationPlanMetadata } from '../packages/sdlc/src/implementation-plan.mjs';

const execute = promisify(execFile);
const issue = 414, active = `openspec/changes/issue-${issue}-proposal`;
const archive = `openspec/changes/archive/2026-11-02-issue-${issue}-proposal`;
const metadata = 'schema: spec-driven\ncreated: 2026-11-01\nskip_specs: true\n';
const plan = root => new Map([
  [`${root}/.openspec.yaml`, metadata],
  [`${root}/proposal.md`, '# Proposal\n\n## Why\nPreserve the current candidate.\n\n## What Changes\n- Verify the candidate.\n\n## Capabilities\n\n### New Capabilities\nNone.\n\n### Modified Capabilities\nNone.\n\n## Impact\nVerification only.\n'],
  [`${root}/design.md`, '# Design\nPreserve the candidate.\n'],
  [`${root}/tasks.md`, '# Tasks\n- [x] Implement and verify the candidate.\n'],
]);
const source = files => new Map([...files].map(([path, content]) => [path, { mode: '100644', content: Buffer.from(content) }]));
const provider = async (cwd, args, { signal } = {}) => (await execute(process.execPath, [fileURLToPath(new URL('../../node_modules/@fission-ai/openspec/bin/openspec.js', import.meta.url)), ...args], { cwd, signal, env: { ...process.env, OPENSPEC_TELEMETRY: '0' } })).stdout;
const api = async path => path.startsWith('contents/.lighthouse/implement.json') ? { content: Buffer.from(JSON.stringify({ defaults: { scope: 'Verify this candidate', paths: ['*'], checks: [['node', '--version']], reviewRequired: false } })).toString('base64') } : null;

async function snapshot(root, prefix = '') {
  const files = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await snapshot(root, path));
    else files.push([path, (await readFile(join(root, path))).toString('base64')]);
  }
  return files.sort(([a], [b]) => a.localeCompare(b));
}

async function generatedCheck(files, inspect) {
  const cwd = await mkdtemp(join(tmpdir(), 'lighthouse-generated-plan-check-'));
  try {
    for (const [path, content] of files) {
      await mkdir(join(cwd, path, '..'), { recursive: true });
      await writeFile(join(cwd, path), content);
    }
    const implementation = await loadImplementation(api, issue, 'owner', 'a'.repeat(40), 'main');
    const command = implementation.policy.checks.at(-1);
    assert.ok(command.includes('--strict'));
    assert.ok(command.includes('--no-interactive'));
    // The independent runtime mounts this owning package read-only at /harness.
    // Resolve only that mount; execute every other generated argument unchanged.
    const argv = command.map(arg => arg.startsWith('/harness/') ? fileURLToPath(new URL(`../packages/sdlc/${arg.slice('/harness/'.length)}`, import.meta.url)) : arg);
    const before = await snapshot(cwd);
    try {
      const run = () => execute(argv[0], argv.slice(1), { cwd, timeout: 120000, env: { ...process.env, OPENSPEC_TELEMETRY: '0', CI: 'true' } });
      await inspect(run, implementation);
    } finally { assert.deepEqual(await snapshot(cwd), before, 'independent plan validation must not change the candidate'); }
  } finally { await rm(cwd, { recursive: true, force: true }); }
}

test('loadImplementation generated independent check requalifies a completed archive without active metadata', async () => {
  const files = plan(archive);
  await generatedCheck(files, async (run, implementation) => {
    const baseline = source(files), request = { issue, implementation };
    assert.equal(await prepareImplementationPlanMetadata(baseline, request, provider), null);
    assert.equal(await implementationPlanMetadata(new Map(baseline), baseline, request, provider), null);
    await run();
  });
});

test('generated independent check retains active/new-plan strict validation and fails closed without a plan', async () => {
  await generatedCheck(plan(active), run => run());
  const implementation = await loadImplementation(api, issue, 'owner', 'a'.repeat(40), 'main');
  const seed = await prepareImplementationPlanMetadata(new Map(), { issue, implementation }, provider);
  const materialized = plan(active); materialized.set(seed.path, `${seed.content.toString().trimEnd()}\nskip_specs: true\n`);
  await generatedCheck(materialized, run => run());
  await generatedCheck(new Map(), async (run, implementation) => {
    const seed = await prepareImplementationPlanMetadata(new Map(), { issue, implementation }, provider);
    assert.equal(seed.path, `${active}/.openspec.yaml`, 'new plans still scaffold during preparation');
    await assert.rejects(run(), /Unknown item|No implementation plan/);
  });
  const invalid = plan(active); invalid.set(`${active}/.openspec.yaml`, 'schema: invented\n');
  await generatedCheck(invalid, run => assert.rejects(run()));
});

test('generated independent check rejects incomplete, invalid, conflicting and ambiguous archive evidence', async () => {
  const variants = [
    [files => files.delete(`${archive}/.openspec.yaml`), /missing .openspec.yaml/],
    [files => files.delete(`${archive}/design.md`), /missing design.md/],
    [files => files.set(`${archive}/tasks.md`, '- [ ] Pending\n'), /incomplete|cannot be requalified/],
    [files => files.set(`${archive}/tasks.md`, '# Tasks\nNo tracked work.\n'), /cannot be requalified/],
    [files => files.set(`${archive}/.openspec.yaml`, 'schema: invented\n'), /cannot be requalified/],
    [files => files.set(`${active}/.openspec.yaml`, metadata), /Conflicting active and archived/],
    [files => { for (const [path, content] of plan(archive.replace('2026-11-02', '2026-11-03'))) files.set(path, content); }, /Ambiguous archived/],
  ];
  for (const [mutate, expected] of variants) {
    const files = plan(archive); mutate(files);
    await generatedCheck(files, run => assert.rejects(run(), expected));
  }
});

test('generated independent check validates undated archives with specifications and ignores unrelated archives', async () => {
  const files = plan(archive.replace('2026-11-02-', ''));
  const root = archive.replace('2026-11-02-', '');
  files.set(`${root}/.openspec.yaml`, metadata.replace('skip_specs: true\n', ''));
  files.set(`${root}/specs/candidate-verification/spec.md`, '## Purpose\n\nPreserve observable candidate verification behavior through implementation requalification.\n\n## ADDED Requirements\n\n### Requirement: Retain candidate verification\nThe system SHALL verify the current candidate.\n\n#### Scenario: Current candidate\n- **WHEN** verification runs\n- **THEN** the current candidate is checked\n');
  await generatedCheck(files, run => run());
  const unrelated = new Map([...plan(archive)].map(([path, content]) => [path.replace('issue-414', 'issue-415'), content]));
  await generatedCheck(unrelated, run => assert.rejects(run(), /No implementation plan/));
});
