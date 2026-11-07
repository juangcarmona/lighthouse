import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { checkRefinement, validateProposalFiles, prepareProposal, proposalValidationFailure, createProposalPullRequest } from '../packages/sdlc/src/proposal.mjs';
import { validateStageEnvelope } from '../packages/sdlc/src/host-contract.mjs';
import { routeIssue } from '../packages/sdlc/src/issue-actions.mjs';

const root = 'openspec/changes/issue-18-proposal';
const files = [
  { path: `${root}/proposal.md`, content: '# Proposal\n\n## Why\n\nPublic builds need a credential-free delivery path.\n\n## What Changes\n\n- Build a static talk.\n\n## Capabilities\n\n### New Capabilities\n\n- `static-talk`: Public static talk delivery.\n\n### Modified Capabilities\n\nNone.\n\n## Impact\n\nThe talk build changes.\n' },
  { path: `${root}/design.md`, content: '# Design\n\nKeep the catalogue and replace the talk renderer with a static page. Validate direct navigation in the browser.\n' },
  { path: `${root}/tasks.md`, content: '# Tasks\n\n## 1. Static talk\n\n- [ ] 1.1 Build the talk from public dependencies.\n- [ ] 1.2 Check direct navigation and keyboard access.\n' },
  { path: `${root}/specs/static-talk/spec.md`, content: '## ADDED Requirements\n\n### Requirement: Public static build\nThe talk SHALL build using public dependencies without credentials.\n\n#### Scenario: Clean CI build\n- **WHEN** CI builds a fresh checkout without credentials\n- **THEN** the static talk is available in the output\n' },
];

test('only the matching deterministic OpenSpec JSON rejection is eligible for bounded plan repair', () => {
  const report = { version: '1.0', items: [{ id: 'issue-18-proposal', type: 'change', valid: false, issues: [{ level: 'WARNING', path: 'static-talk/spec.md', message: 'Split the overlong requirement' }] }], summary: { totals: { items: 1, passed: 0, failed: 1 } } };
  const rejection = value => Object.assign(Error('Provider validation rejected the plan'), { code: 1, stdout: JSON.stringify(value) });
  const output = rejection(report).stdout;
  assert.deepEqual(proposalValidationFailure(rejection(report), 18), { provider: '@fission-ai/openspec@1.15.0', status: 'failed', findings: ['static-talk/spec.md: Split the overlong requirement'], output });
  for (const patch of [{ code: 2 }, { code: 'ETIMEDOUT' }, { signal: 'SIGTERM' }, { killed: true }, { stdout: 'npm error unavailable' }, { stdout: 'x'.repeat(65537) }]) assert.equal(proposalValidationFailure(Object.assign(rejection(report), patch), 18), null);
  for (const mutate of [x => { x.items[0].id = 'another-change'; }, x => { x.items[0].valid = true; }, x => { x.items[0].type = 'spec'; }, x => { x.summary.totals.failed = 0; }, x => { x.items[0].issues = []; }, x => { x.items[0].issues[0].level = 'UNKNOWN'; }]) {
    const changed = structuredClone(report); mutate(changed); assert.equal(proposalValidationFailure(rejection(changed), 18), null);
  }
});

test('strict provider warnings remain failures and retain the actual validation report', async () => {
  const cli = resolve('node_modules/@fission-ai/openspec/bin/openspec.js');
  const provider = (cwd, args) => execFileSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, OPENSPEC_TELEMETRY: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const invalid = files.map(file => file.path.endsWith('/spec.md') ? { ...file, content: file.content.replace('The talk SHALL build using public dependencies without credentials.', 'The talk SHALL ' + 'keep bounded output and preserve existing behavior '.repeat(15) + '.') } : file);
  await assert.rejects(prepareProposal(18, invalid, provider), error => {
    assert.equal(error.status, 1);
    assert.equal(error.proposalValidation.status, 'failed');
    assert.match(error.proposalValidation.findings.join(' '), /very long/);
    assert.match(error.message, /Requirement text is very long/);
    assert.equal(JSON.parse(error.proposalValidation.output).items[0].valid, false);
    return true;
  });
  assert.equal((await prepareProposal(18, files, provider)).length, files.length + 1);
});

test('unknown provider failures preserve their original error object and operator message', async () => {
  const error = Object.assign(Error('Provider unavailable'), { code: 1, stdout: 'npm could not contact the registry' });
  await assert.rejects(prepareProposal(18, files, async (_cwd, args) => { if (args[0] === 'validate') throw error; return ''; }), observed => {
    assert.equal(observed, error); assert.equal(observed.message, 'Provider unavailable'); assert.equal(observed.proposalValidation, undefined); return true;
  });
});

test('proposal boundaries reject traversal, executable/config files, duplicates, missing artifacts and completed tasks', () => {
  assert.equal(validateProposalFiles(files, 18), files);
  for (const path of ['../../escape.md', `${root}/../escape.md`, `${root}/.openspec.yaml`, `${root}/specs/-bad/spec.md`, '.github/workflows/pwn.yml', `${root}/run.mjs`]) assert.throws(() => validateProposalFiles([...files, { path, content: 'x' }], 18));
  assert.throws(() => validateProposalFiles([...files, files[0]], 18));
  assert.throws(() => validateProposalFiles(files.slice(1), 18));
  assert.throws(() => validateProposalFiles(files.map(f => ({ ...f, content: f.content.replace('[ ]', '[x]') })), 18));
  assert.throws(() => validateProposalFiles(files.map(f => ({ ...f, content: 'x'.repeat(25000) })), 18));
  assert.throws(() => validateProposalFiles(files, 19));
});

test('documentation-only proposals use the provider skip flag without accepting arbitrary metadata', async () => {
  const docsOnly = [...files.slice(0, 3), { path: `${root}/.openspec.yaml`, content: 'skip_specs: true\n' }];
  assert.equal(validateProposalFiles(docsOnly, 18), docsOnly);
  assert.throws(() => validateProposalFiles(docsOnly.filter(file => !file.path.endsWith('/design.md')), 18), /Missing design\.md/);
  for (const bad of ['skip_specs: false', 'skip_specs: true\nschema: other', 'skip_specs: true\nskip_specs: true']) {
    assert.throws(() => validateProposalFiles([...docsOnly.slice(0, 3), { path: `${root}/.openspec.yaml`, content: bad }], 18));
  }
  assert.throws(() => validateProposalFiles(files.slice(0, 3), 18));
  assert.throws(() => validateProposalFiles([...files, docsOnly[3]], 18));
  const cli = resolve('node_modules/@fission-ai/openspec/bin/openspec.js');
  const provider = (cwd, args) => execFileSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, OPENSPEC_TELEMETRY: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const result = await prepareProposal(18, docsOnly, provider);
  const metadata = result.filter(file => file.path === `${root}/.openspec.yaml`);
  assert.equal(metadata.length, 1);
  assert.match(metadata[0].content, /^schema: spec-driven$/m);
  assert.match(metadata[0].content, /^skip_specs: true$/m);
});

test('a proposal needs an explicit owner request; an unrelated answer never starts proposal execution', () => {
  const issue = { number: 18, state: 'open', labels: [{ name: 'ready' }] };
  const event = { action: 'labeled', issue, label: { name: 'propose' } };
  assert.equal(routeIssue(event, 'owner', 'owner', 'issues').stage, 'propose');
  assert.equal(routeIssue(event, 'stranger', 'owner', 'issues').run, false);
  assert.equal(routeIssue({ ...event, label: { name: 'ready' } }, 'owner', 'owner', 'issues').run, false);
  assert.equal(routeIssue({ action: 'created', issue, comment: { user: { login: 'owner', type: 'User' } } }, 'owner', 'owner', 'issue_comment').run, false);
  assert.equal(routeIssue({ inputs: { issue: '18', stage: 'integrate' } }, 'owner', 'owner', 'workflow_dispatch').run, false);
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

test('real OpenSpec discovery and validation use the supplied baseline without adopter npm settings', async () => {
  const cli = resolve('node_modules/@fission-ai/openspec/bin/openspec.js');
  const specification = '# Existing system\n\n## Purpose\nPreserve the existing system.\n\n## Requirements\n\n### Requirement: Stable behavior\nThe system SHALL preserve its existing behavior.\n\n#### Scenario: Existing input\n- **WHEN** an existing input is supplied\n- **THEN** its behavior is preserved\n';
  const configuration = 'schema: spec-driven\ncontext: Read the committed baseline.\n';
  const file = content => ({ mode: '100644', content: Buffer.from(content) });
  const baseline = new Map([
    ['openspec/config.yaml', file(configuration)],
    ['openspec/specs/existing-system/spec.md', file(specification)],
    ['.npmrc', file('registry=https://registry.invalid\n')],
    ['package.json', file('{"name":"unrelated-adopter"}')],
    ['openspec/changes/another/proposal.md', file('# Unrelated proposal\n')],
  ]);
  let discoveries = 0, validations = 0;
  const provider = async (cwd, args) => {
    assert.equal(await readFile(join(cwd, 'openspec/config.yaml'), 'utf8'), configuration);
    assert.equal(await readFile(join(cwd, 'openspec/specs/existing-system/spec.md'), 'utf8'), specification);
    assert.equal(existsSync(join(cwd, '.npmrc')), false);
    assert.equal(existsSync(join(cwd, 'package.json')), false);
    assert.equal(existsSync(join(cwd, 'openspec/changes/another')), false);
    if (args[0] === 'list') discoveries++;
    if (args[0] === 'validate') validations++;
    return execFileSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: { ...process.env, OPENSPEC_TELEMETRY: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
  };
  const context = await prepareProposal(18, null, provider, baseline);
  assert.equal(context.discovery.status, 'passed');
  assert.deepEqual(context.discovery.command, ['openspec', 'list', '--specs', '--json']);
  assert.deepEqual(context.discovery.specifications.map(spec => spec.id), ['existing-system']);
  assert.equal(discoveries, 1);
  assert.equal((await prepareProposal(18, files, provider, baseline)).length, files.length + 1);
  assert.equal(validations, 1);
});

for (const path of ['openspec/specs/../../escape', 'openspec/specs/unsafe\\name']) test(`OpenSpec baseline preparation rejects unsafe source path ${path}`, async () => {
  let invoked = false;
  await assert.rejects(prepareProposal(18, null, () => { invoked = true; }, new Map([[path,
    { mode: '100644', content: Buffer.from('unsafe') }]])), /Invalid OpenSpec baseline/);
  assert.equal(invoked, false);
});

test('missing or malformed provider inventory remains a planning failure', async () => {
  for (const inventory of [{ specs: [], root: { path: '/another-source' } }, { specs: {}, root: null }, { specs: [], status: [{ severity: 'error', code: 'incomplete_inventory' }] }]) {
    const provider = (cwd, args) => JSON.stringify(args[0] === 'list' ? { root: { path: cwd }, ...inventory } : {});
    await assert.rejects(prepareProposal(18, null, provider, new Map()), /OpenSpec discovery did not identify/);
  }
  const failure = Error('Provider discovery unavailable');
  await assert.rejects(prepareProposal(18, null, (_cwd, args) => {
    if (args[0] === 'list') throw failure;
    return '{}';
  }, new Map()), error => error === failure);
});

test('publisher rechecks authority before a create-only branch, preserves base tree and does not merge', async () => {
  const calls = [];
  const api = async (path, method, body) => { calls.push({ path, method, body }); if (path.startsWith('contents/lighthouse.json?ref=')) return null; return path.startsWith('git/commits/') ? { tree: { sha: 'tree-base' } } : { sha: 'new-sha', html_url: 'https://example/pr/1', number: 1 }; };
  const snapshot = { sourceRevision: 'base', issue: 18, runId: 'a'.repeat(64), title: 'Static talks', defaultBranch: 'main' };
  await assert.rejects(createProposalPullRequest(api, snapshot, files, 'Proposal', 'https://example/run', async () => { throw Error('Intent changed'); }), /Intent changed/);
  assert.equal(calls.some(c => c.path === 'git/refs' || c.path === 'pulls'), false);
  calls.length = 0;
  await createProposalPullRequest(api, snapshot, files, 'Proposal', 'https://example/run', async () => { calls.push({ path: 'recheck' }); });
  assert.deepEqual(calls.map(c => c.path), ['contents/lighthouse.json?ref=base', 'git/commits/base', 'git/trees', 'git/commits', 'recheck', 'git/refs', 'pulls']);
  assert.equal(calls[2].body.base_tree, 'tree-base');
  assert.deepEqual(calls[3].body.parents, ['base']);
  assert.equal(calls[5].method, 'POST');
  assert.equal(calls[5].body.ref, 'refs/heads/lighthouse/propose-18-aaaaaaaaaaaa');
  assert.doesNotMatch(calls[6].body.body, /Closes #18/);
});

test('a resumed proposal updates its applied product PR without opening another branch', async () => {
  const repository = 'owner/repo', head = 'a'.repeat(40), after = 'b'.repeat(40), intent = 'c'.repeat(64);
  const parent = { issue: 18, stage: 'propose', predecessor: { runId: '200', attempt: 1 }, gap: { summary: 'Missing intent', scope: 'Issue scope' }, sourceRevision: 'd'.repeat(40), baseRevision: 'd'.repeat(40), taskDigest: 'e'.repeat(64), autoImplement: false };
  const checkpoint = { schemaVersion: 1, kind: 'checkpoint', identity: { repository, issue: 18, parentRunId: '200', authorizationDigest: '1'.repeat(64), policyDigest: '2'.repeat(64), workflowRevision: '3'.repeat(40), head }, requestDigest: '4'.repeat(64), changeName: 'example', changeId: 'CHG-EXAMPLE', proposalDigest: '5'.repeat(64), baselineDigest: '6'.repeat(64), state: 'applied', effectIds: [`apply:${intent}:${head}`], parent };
  const branch = 'lighthouse/implement-18-aaaaaaaaaaaa';
  const resume = { issue: 18, parent, pullRequest: 34, head, branch, receiptIntent: intent };
  const productPr = { number: 34, state: 'open', merged: false, draft: true, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: branch, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, html_url: 'https://example.test/pr/34', body: `Product decision retained.\n<!-- lighthouse-product-change:{"changeId":"CHG-EXAMPLE"} -->\n<!-- lighthouse-product-change-checkpoint:${JSON.stringify(checkpoint)} -->` };
  const { checkProposal } = await import('../packages/sdlc/src/proposal-review.mjs');
  const pendingBody = productPr.body.replace('\"state\":\"applied\"', '\"state\":\"waiting-product-decision\"') + `\n<!-- lighthouse-proposal:${'a'.repeat(64)} -->`;
  assert.throws(() => checkProposal({ ...productPr, head: { ...productPr.head, ref: 'lighthouse/propose-18-aaaaaaaaaaaa' }, body: pendingBody }, repository));
  const calls = [];
  const api = async (path, method, body) => { calls.push({ path, method, body }); if (path.startsWith('contents/lighthouse.json?ref=')) return null; if (path === 'pulls/34' && method !== 'PATCH') return productPr; if (path === 'git/commits' && method === 'POST') return { sha: after }; return { sha: 'blob', tree: { sha: 'tree' } }; };
  const snapshot = { repository, sourceRevision: head, issue: 18, runId: 'a'.repeat(64), title: 'Example', defaultBranch: 'main', productResume: resume };
  const result = await createProposalPullRequest(api, snapshot, files, 'Engineering proposal.', 'https://example.test/run', async () => {});
  assert.equal(result.number, 34);
  assert.deepEqual(calls.find(call => call.path === `git/refs/heads/${branch}`).body, { sha: after, force: false });
  assert.equal(calls.some(call => call.path === 'pulls' || call.path === 'git/refs'), false);
  const body = calls.find(call => call.path === 'pulls/34' && call.method === 'PATCH').body.body;
  assert.match(body, /Product decision retained/);
  assert.equal(checkProposal({ ...productPr, head: { ...productPr.head, sha: after }, body }, repository).productProposal, true);
  const { scheduledImplementationPulls } = await import('../packages/sdlc/src/pr-state.mjs');
  assert.deepEqual(await scheduledImplementationPulls(async () => [{ ...productPr, head: { ...productPr.head, sha: after }, body }]), []);
  assert.throws(() => checkProposal({ ...productPr, head: { ...productPr.head, sha: '9'.repeat(40) }, body }, repository));
  const { updateProposal } = await import('../packages/sdlc/src/proposal-review.mjs');
  const current = { ...productPr, head: { ...productPr.head, sha: after }, body };
  const next = '8'.repeat(40), feedback = { id: 9, body: 'Clarify.', user: { login: 'owner', type: 'User' } }, feedbackDigest = (await import('../packages/sdlc/src/host-contract.mjs')).digest(JSON.stringify(feedback));
  const review = { ...checkProposal(current, repository), path: 'issues/comments/9', feedbackDigest };
  const reviewCalls = [];
  const reviewApi = async (path, method, payload) => { if (path.startsWith('contents/lighthouse.json?ref=')) return null;
    reviewCalls.push({ path, method, body: payload });
    if (path === 'pulls/34' && method !== 'PATCH') return current;
    if (path === 'issues/comments/9') return feedback;
    if (path === 'pulls/34/files?per_page=100') return [...files.map(file => ({ filename: file.path, status: 'added' })), { filename: 'docs/product/model/example.md', status: 'modified' }];
    if (path.startsWith('contents/')) { const item = files.find(file => path.startsWith(`contents/${file.path}?`)); return { type: 'file', encoding: 'base64', size: item.content.length, content: Buffer.from(item.content).toString('base64') }; }
    if (path === 'git/commits' && method === 'POST') return { sha: next };
    return { sha: 'blob', tree: { sha: 'tree' } };
  };
  await updateProposal(reviewApi, repository, { issue: 18, runId: '7'.repeat(64), proposalReview: review }, files, async () => {});
  const revised = reviewCalls.find(call => call.path === 'pulls/34' && call.method === 'PATCH').body.body;
  assert.equal(checkProposal({ ...current, head: { ...current.head, sha: next }, body: revised }, repository).productProposal, true);
  assert.match(revised, /Product decision retained/);
});

test('authenticated correction reports bind the dispatch base separately from the candidate head', async () => {
  const { loadStageReport } = await import('../packages/sdlc/src/proposal.mjs');
  const { dispatchId, dispatchReceiptBody } = await import('../packages/sdlc/src/stage-dispatch.mjs');
  const { digest } = await import('../packages/sdlc/src/host-contract.mjs');
  const repository = 'owner/repo', base = 'a'.repeat(40), head = 'b'.repeat(40), feedbackKey = 'c'.repeat(64), runId = 'd'.repeat(64);
  const origin = { schemaVersion: 1, repository, issue: 47, stage: 'implement', worker: 'apply-review', feedbackKey, id: dispatchId(repository, feedbackKey, 'implement'), routerRunId: 10, routerAttempt: 1, routerRevision: base, routerRef: 'main', workflowRevision: base, sourceRevision: base, ref: 'main', eventName: 'issue_comment', event: {}, handoff: false, queue: true, taskDigest: 'e'.repeat(64) };
  const receipt = { schemaVersion: 1, stage: 'implement', worker: 'apply-review', feedbackKey, status: 'completed', id: origin.id, digest: digest(JSON.stringify(origin)), routerRunId: 10, routerAttempt: 1, workerRunId: 20 };
  const actor = { login: 'owner' }, parent = { id: 10, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'issue_comment', actor, triggering_actor: actor, head_sha: base, head_branch: 'main', repository: { full_name: repository } };
  const run = { ...parent, id: 20, path: '.github/workflows/lighthouse-sdlc-apply-review.lock.yml', event: 'workflow_dispatch', status: 'completed', conclusion: 'success' };
  const request = { repository, issue: 47, stage: 'implement', workflowRunId: '20', workflowRevision: base, sourceRevision: head, baseRevision: base, runId, dispatch: { commentId: 7, requestId: origin.id, digest: receipt.digest } };
  const comment = { user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repository}/issues/47`, body: dispatchReceiptBody(repository, receipt) };
  const api = async path => { if (path.startsWith('contents/lighthouse.json?ref=')) return null;
    if (path === 'actions/runs/20') return run;
    if (path === 'actions/runs/10/attempts/1') return parent;
    assert.equal(path, 'issues/comments/7'); return comment;
  };
  const readArtifact = async (_api, _repo, _run, _name, file) => file === 'dispatch.json' ? origin : file === 'request.json' ? request : { result: { status: 'passed' } };
  const report = { body: `<!-- lighthouse-actions:${runId} -->\n<!-- lighthouse-stage:implement:passed -->\n[Workflow run](https://github.com/${repository}/actions/runs/20)` };
  assert.equal((await loadStageReport(api, repository, report, { owner: 'owner', issue: 47 }, readArtifact)).request.sourceRevision, head);
  request.baseRevision = 'f'.repeat(40);
  await assert.rejects(loadStageReport(api, repository, report, { owner: 'owner', issue: 47 }, readArtifact), /Dispatched report identity mismatch/);
  request.baseRevision = base; receipt.workerRunId = 21; comment.body = dispatchReceiptBody(repository, receipt);
  await assert.rejects(loadStageReport(api, repository, report, { owner: 'owner', issue: 47 }, readArtifact), /admission receipt/);
});

test('bot correction dispatch origins retain the original adopted failed CI attempt', async () => {
  const { loadDispatch, dispatchId, dispatchReceiptBody } = await import('../packages/sdlc/src/stage-dispatch.mjs');
  const { digest } = await import('../packages/sdlc/src/host-contract.mjs');
  const repository = 'owner/repo', base = 'a'.repeat(40), head = 'b'.repeat(40), feedbackKey = 'c'.repeat(64);
  const origin = { schemaVersion: 1, repository, issue: 47, stage: 'implement', worker: 'apply-review', feedbackKey, id: dispatchId(repository, feedbackKey, 'implement'), routerRunId: 10, routerAttempt: 1, routerRevision: base, routerRef: 'main', workflowRevision: base, sourceRevision: base, ref: 'main', eventName: 'workflow_dispatch', event: { inputs: { issue: '47', stage: 'implement', after_run: '123' } }, eventRunId: '123', handoff: false, queue: true, taskDigest: 'e'.repeat(64), ciRepair: { run: 123, runAttempt: 1, head, pr: 60 } };
  const receipt = { schemaVersion: 1, stage: 'implement', worker: 'apply-review', feedbackKey, status: 'completed', id: origin.id, digest: digest(JSON.stringify(origin)), routerRunId: 10, routerAttempt: 1, workerRunId: 20, eventRunId: '123' };
  const actor = { login: 'github-actions[bot]' }, parent = { id: 10, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch', actor, triggering_actor: actor, head_sha: base, head_branch: 'main', repository: { full_name: repository } };
  const run = { ...parent, id: 20, path: '.github/workflows/lighthouse-sdlc-apply-review.lock.yml', status: 'completed', conclusion: 'success' };
  const ci = { status: 'completed', conclusion: 'failure', head_sha: head, repository: { full_name: repository }, path: '.github/workflows/verify.yml' };
  const comment = { user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repository}/issues/47`, body: dispatchReceiptBody(repository, receipt) };
  const api = async path => { if (path.startsWith('contents/lighthouse.json?ref=')) return null;
    if (path === 'actions/runs/10/attempts/1') return parent;
    if (path === 'actions/runs/123/attempts/1') return ci;
    if (path.startsWith('contents/')) return { content: Buffer.from(JSON.stringify({ completion: { postMergeWorkflows: ['verify.yml'] } })).toString('base64') };
    assert.equal(path, 'issues/comments/7'); return comment;
  };
  const readArtifact = async () => origin;
  assert.equal((await loadDispatch(api, repository, 'owner', 47, 7, run, readArtifact)).request.ciRepair.run, 123);
  ci.head_sha = base;
  await assert.rejects(loadDispatch(api, repository, 'owner', 47, 7, run, readArtifact), /original adopted failed attempt/);
});
