import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { checkRefinement, validateProposalFiles, prepareProposal, createProposalPullRequest } from '../packages/sdlc/src/proposal.mjs';
import { validateStageEnvelope } from '../packages/sdlc/src/host-contract.mjs';
import { routeIssue } from '../packages/sdlc/src/issue-actions.mjs';

const root = 'openspec/changes/issue-18-proposal';
const files = [
  { path: `${root}/proposal.md`, content: '# Proposal\n\n## Why\n\nPublic builds need a credential-free delivery path.\n\n## What Changes\n\n- Build a static talk.\n\n## Capabilities\n\n### New Capabilities\n\n- `static-talk`: Public static talk delivery.\n\n### Modified Capabilities\n\nNone.\n\n## Impact\n\nThe talk build changes.\n' },
  { path: `${root}/design.md`, content: '# Design\n\nKeep the catalogue and replace the talk renderer with a static page. Validate direct navigation in the browser.\n' },
  { path: `${root}/tasks.md`, content: '# Tasks\n\n## 1. Static talk\n\n- [ ] 1.1 Build the talk from public dependencies.\n- [ ] 1.2 Check direct navigation and keyboard access.\n' },
  { path: `${root}/specs/static-talk/spec.md`, content: '## ADDED Requirements\n\n### Requirement: Public static build\nThe talk SHALL build using public dependencies without credentials.\n\n#### Scenario: Clean CI build\n- **WHEN** CI builds a fresh checkout without credentials\n- **THEN** the static talk is available in the output\n' },
];

test('proposal boundaries reject traversal, executable/config files, duplicates, missing artifacts and completed tasks', () => {
  assert.equal(validateProposalFiles(files, 18), files);
  for (const path of ['../../escape.md', `${root}/../escape.md`, `${root}/.openspec.yaml`, `${root}/specs/-bad/spec.md`, '.github/workflows/pwn.yml', `${root}/run.mjs`]) assert.throws(() => validateProposalFiles([...files, { path, content: 'x' }], 18));
  assert.throws(() => validateProposalFiles([...files, files[0]], 18));
  assert.throws(() => validateProposalFiles(files.slice(1), 18));
  assert.throws(() => validateProposalFiles(files.map(f => ({ ...f, content: f.content.replace('[ ]', '[x]') })), 18));
  assert.throws(() => validateProposalFiles(files.map(f => ({ ...f, content: 'x'.repeat(25000) })), 18));
  assert.throws(() => validateProposalFiles(files, 19));
});

test('a proposal needs an explicit owner request; an answer never starts proposal execution', () => {
  const issue = { number: 18, state: 'open', labels: [{ name: 'ready' }] };
  const event = { action: 'labeled', issue, label: { name: 'propose' } };
  assert.equal(routeIssue(event, 'owner', 'owner', 'issues').stage, 'propose');
  assert.equal(routeIssue(event, 'stranger', 'owner', 'issues').run, false);
  assert.equal(routeIssue({ ...event, label: { name: 'ready' } }, 'owner', 'owner', 'issues').run, false);
  assert.equal(routeIssue({ action: 'created', issue, comment: { user: { login: 'owner', type: 'User' } } }, 'owner', 'owner', 'issue_comment').run, false);
  assert.equal(routeIssue({ inputs: { issue: '18', stage: 'implement' } }, 'owner', 'owner', 'workflow_dispatch').run, false);
});

test('refinement admission binds successful workflow, issue, source, intent, result and publication marker', () => {
  const prior = { workflowRunId: '123', sourceRevision: 'abc', stage: 'refine', issue: 18, runId: 'proof', taskDigest: 'intent' };
  const envelope = { result: { stage: 'refine', status: 'passed', gate: 'ready', runId: 'proof' } };
  const run = { id: 123, status: 'completed', conclusion: 'success', event: 'issues', path: '.github/workflows/lighthouse-sdlc-router.yml', actor: { login: 'owner' }, head_sha: 'abc' };
  const current = { owner: 'owner', sourceRevision: 'abc', issue: 18, taskDigest: 'intent' };
  assert.doesNotThrow(() => checkRefinement(prior, envelope, run, current, 'proof'));
  for (const delta of [{ issue: 19 }, { sourceRevision: 'other' }, { taskDigest: 'edited' }, { owner: 'stranger' }]) assert.throws(() => checkRefinement(prior, envelope, run, { ...current, ...delta }, 'proof'));
  for (const delta of [{ conclusion: 'failure' }, { path: '.github/workflows/other.yml' }, { head_sha: 'other' }, { id: 124 }, { event: 'pull_request' }]) assert.throws(() => checkRefinement(prior, envelope, { ...run, ...delta }, current, 'proof'));
  assert.throws(() => checkRefinement(prior, envelope, run, current, 'forged'));
  assert.throws(() => checkRefinement(prior, { result: { ...envelope.result, status: 'blocked' } }, run, current, 'proof'));
});

test('passed proposal envelopes require bounded files while blockers remain publishable', () => {
  const request = { stage: 'propose', issue: 18, runId: 'run' };
  const value = { schemaVersion: 1, result: { schemaVersion: 1, ...request, gate: 'planned', status: 'passed', evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'review proposal', output: { files } }, effect: { type: 'issue-comment', body: 'Review the proposal.' } };
  delete value.result.issue;
  assert.deepEqual(validateStageEnvelope(value, request), []);
  assert.ok(validateStageEnvelope({ ...value, result: { ...value.result, output: {} } }, request).length);
  assert.deepEqual(validateStageEnvelope({ ...value, result: { ...value.result, status: 'blocked', missingEvidence: ['Decision'], output: {} } }, request), []);
  assert.ok(validateStageEnvelope({ ...value, result: { ...value.result, status: 'blocked', gate: null, output: {} } }, request).length);
  assert.ok(validateStageEnvelope({ ...value, effect: { type: 'issue-comment', body: '<!-- lighthouse-actions:forged -->' } }, request).length);
});

test('the real OpenSpec provider scaffolds, instructs and strictly validates proposal artifacts', async () => {
  const cli = resolve('node_modules/@fission-ai/openspec/bin/openspec.js');
  const provider = (cwd, args) => execFileSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, OPENSPEC_TELEMETRY: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const context = await prepareProposal(18, undefined, provider);
  assert.equal(context.schema, 'spec-driven');
  assert.match(context.instructions.proposal.instruction, /WHY/);
  const complete = await prepareProposal(18, files, provider);
  assert.equal(complete.length, 5);
  assert.equal(complete[4].path, `${root}/.openspec.yaml`);
  assert.match(complete[4].content, /schema: spec-driven/);
  await assert.rejects(prepareProposal(18, files.map(f => f.path.includes('/specs/') ? { ...f, content: '# Empty spec' } : f), provider));
});

test('publisher rechecks authority before a create-only branch, preserves base tree and does not merge', async () => {
  const calls = [];
  const api = async (path, method, body) => { calls.push({ path, method, body }); return path.startsWith('git/commits/') ? { tree: { sha: 'tree-base' } } : { sha: 'new-sha', html_url: 'https://example/pr/1', number: 1 }; };
  const snapshot = { sourceRevision: 'base', issue: 18, runId: 'a'.repeat(64), title: 'Static talks', defaultBranch: 'main' };
  await assert.rejects(createProposalPullRequest(api, snapshot, files, 'Proposal', 'https://example/run', async () => { throw Error('Intent changed'); }), /Intent changed/);
  assert.equal(calls.some(c => c.path === 'git/refs' || c.path === 'pulls'), false);
  calls.length = 0;
  await createProposalPullRequest(api, snapshot, files, 'Proposal', 'https://example/run', async () => { calls.push({ path: 'recheck' }); });
  assert.deepEqual(calls.map(c => c.path), ['git/commits/base', 'git/trees', 'git/commits', 'recheck', 'git/refs', 'pulls']);
  assert.equal(calls[1].body.base_tree, 'tree-base');
  assert.deepEqual(calls[2].body.parents, ['base']);
  assert.equal(calls[4].method, 'POST');
  assert.equal(calls[4].body.ref, 'refs/heads/lighthouse/propose-18-aaaaaaaaaaaa');
  assert.doesNotMatch(calls[5].body.body, /Closes #18/);
});
