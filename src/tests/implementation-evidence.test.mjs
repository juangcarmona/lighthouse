import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { commandEvidenceBinding, retainedCommandOutput, implementationEvidenceBundle, readImplementationEvidence } from '../packages/sdlc/src/implementation-evidence.mjs';
import { changesDigest, loadImplementation } from '../packages/sdlc/src/implementation.mjs';
import { assertCitedChecks } from '../packages/sdlc/src/completion.mjs';
import { dispatchId, dispatchArtifact, dispatchReceiptBody } from '../packages/sdlc/src/stage-dispatch.mjs';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { unattendedImplementationPolicy, unattendedDigest } from '../packages/sdlc/src/unattended.mjs';

const revision = 'a'.repeat(40), head = 'b'.repeat(40), tree = 'c'.repeat(40), intent = 'd'.repeat(64);
const copy = value => structuredClone(value);
async function fixture({ unattended = false, route = 'ff', product = false } = {}) {
  const repository = 'owner/demo', issue = 18, pr = 23;
  const policy = { scope: 'Fix the specified behavior.', paths: ['src/'], reviewRequired: false, checks: [['node', 'verify.mjs']] };
  if (unattended) policy.verification = { paths: ['src/tests/'], corrections: {} };
  const file = value => ({ content: Buffer.from(JSON.stringify(value)).toString('base64') });
  const state = { native: { id: 700, run_attempt: 1, repository: { full_name: repository }, path: '.github/workflows/lighthouse-sdlc-implement.lock.yml', head_sha: revision, head_branch: 'main', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', actor: { login: 'owner' }, triggering_actor: { login: 'owner' } }, policy, tree, workflow: 'e'.repeat(40), missing: false, expired: false };
  const identity = 'f'.repeat(64);
  state.pr = { number: pr, state: 'open', merged: false, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: `lighthouse/implement-${issue}-${identity.slice(0, 12)}`, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${identity} -->` };
  state.implementationIdentity = identity;
  if (product) {
    const applyIntent = '9'.repeat(64), appliedHead = '8'.repeat(40);
    const parent = { issue, stage: 'implement', predecessor: { runId: '200', attempt: 1 }, gap: { summary: 'Missing intent', scope: 'Issue scope' }, sourceRevision: revision, baseRevision: revision, taskDigest: intent, autoImplement: false };
    const checkpoint = { schemaVersion: 1, kind: 'checkpoint', identity: { repository, issue, parentRunId: '200', authorizationDigest: '1'.repeat(64), policyDigest: '2'.repeat(64), workflowRevision: revision, head: appliedHead }, requestDigest: '4'.repeat(64), changeName: 'example', changeId: 'CHG-EXAMPLE', proposalDigest: '5'.repeat(64), baselineDigest: '6'.repeat(64), state: 'applied', effectIds: [`apply:${applyIntent}:${appliedHead}`], parent };
    state.pr.body = `<!-- lighthouse-product-change-checkpoint:${JSON.stringify(checkpoint)} -->\n<!-- lighthouse-product-implementation:${JSON.stringify({ schemaVersion: 1, issue, runId: identity, applyIntent, head })} -->`;
    state.implementationIdentity = digest(JSON.stringify({ issue, applyIntent }));
  }
  const completion = { binding: { repository, issue, pr, head, intent, branch: 'main' }, currentRevision: revision };
  state.unattended = unattended;
  state.grant = { schemaVersion: 1, enabled: true, routes: [route], paths: ['src/value.js'], reviewerProfile: 'fast', allowFivePoint: false, merge: true, maxCorrections: 2, timeoutSeconds: 600,
    ...(route === 'hotfix' ? { hotfix: { setupCommands: [['node', 'setup.mjs']], regressionCommand: ['node', '--test', 'src/tests/regression.mjs'], testPaths: ['src/tests/'], failurePattern: ['ERR_ASSERTION'], modules: { core: ['src/'] } } } : {}) };
  if (unattended) state.native.path = '.github/workflows/lighthouse-sdlc-unattended.yml';
  const api = async path => {
    if (path === 'pulls/23') return copy(state.pr);
    if (path === 'actions/runs/700' || path === 'actions/runs/700/attempts/1') return copy(state.native);
    if (path.startsWith('issues/18/comments?')) return [{ user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-pr-state:${JSON.stringify({ pr, head, complete: true, run: 700, attempt: 1, implementationIdentity: state.implementationIdentity })} -->` }];
    if (path.startsWith('contents/.lighthouse/implement.json?')) return file({ defaults: state.policy });
    if (path.startsWith('contents/.lighthouse/environment.json?')) return null;
    if (path.startsWith('contents/.lighthouse/unattended.json?')) return file(state.grant);
    if (path.startsWith('contents/.product/config.yaml?') && state.productRoot) {
      const content = `product-root: "${state.productRoot}"\n`;
      return { sha: '9'.repeat(40), encoding: 'base64', size: Buffer.byteLength(content), content: Buffer.from(content).toString('base64') };
    }
    if (path.startsWith('contents/.github/workflows/')) return { sha: path.endsWith('ref=' + state.native.head_sha) ? 'e'.repeat(40) : state.workflow };
    if (/^git\/commits\/[a-f0-9]{40}$/.test(path) && path !== 'git/commits/' + head) { const ref = path.slice(12); return { sha: ref, tree: { sha: ref } }; }
    if (path === 'git/commits/' + head) return { tree: { sha: state.tree } };
    if (/^git\/trees\/[a-f0-9]{40}\?recursive=1$/.test(path)) return { truncated: state.incompleteTree ?? false, tree: [
      ...(state.sourceLinks ?? []).map(entry => ({ ...entry, type: 'blob' })),
      ...(state.productRoot ? [{ type: 'blob', mode: '100644', path: '.product/config.yaml', sha: '9'.repeat(40) }] : []),
      { type: 'tree', mode: '040000', path: (state.productRoot ?? 'docs/product') + '/model', sha: path.includes(revision) ? 'f'.repeat(40) : path.includes(head) ? state.candidateModelTree ?? 'f'.repeat(40) : state.modelTree ?? 'f'.repeat(40) },
      { type: 'blob', mode: '100644', path: 'openspec/config.yaml', sha: path.includes(revision) ? 'f'.repeat(40) : path.includes(head) ? state.candidateSharedPolicy ?? 'f'.repeat(40) : state.sharedPolicy ?? 'f'.repeat(40) },
    ] };
    throw Error('Unexpected API request: ' + path);
  };
  const implementation = await loadImplementation(api, issue, 'owner', revision, 'main', unattended ? route : null);
  if (unattended) implementation.policy = unattendedImplementationPolicy(implementation.policy, state.grant, issue, route);
  const request = { repository, issue, runId: 'f'.repeat(64), sourceRevision: revision, taskDigest: intent, workflowRunId: '700', attempt: 1, implementation };
  const changes = [{ path: 'src/value.js', mode: '100644', content: Buffer.from('export const value = 2;').toString('base64') }];
  const receipt = { schemaVersion: 2, binding: commandEvidenceBinding(request), candidateTree: tree, observedAt: '2026-11-04T12:00:00Z', runId: request.runId, sourceRevision: revision, changesDigest: changesDigest(changes), serviceCleanup: true, checks: implementation.policy.checks.map(command => ({ command, exitCode: 0, execution: { status: 'passed' }, output: retainedCommandOutput('Verification passed\n') })) };
  state.artifact = implementationEvidenceBundle(request, receipt, changes, { pr, head, tree });
  if (unattended) state.artifact.unattended = { route, policyDigest: unattendedDigest(state.grant) };
  const readArtifact = async (_api, repo, run, name, member, optional) => {
    assert.equal(repo, repository); assert.equal(run, 700);
    assert.equal(name, unattended ? 'lighthouse-unattended-700-1' : 'lighthouse-command-evidence-18-1'); assert.equal(member, 'implementation-evidence.json'); assert.equal(optional, true);
    if (state.expired) throw Error('Required artifact unavailable, ambiguous or too large');
    return state.missing ? null : copy(state.artifact);
  };
  return { state, completion, api, options: { readArtifact, now: Date.parse('2026-11-04T13:00:00Z') }, request, receipt, changes };
}

test('FF and hotfix host receipts authenticate the admitted scoped policy and canonical native artifact', async () => {
  for (const route of ['ff', 'hotfix']) {
    const f = await fixture({ unattended: true, route });
    const result = await readImplementationEvidence(f.api, f.completion, f.options);
    assert.equal(result.status, 'passed', result.reason);
    assert.equal(result.artifact.name, 'lighthouse-unattended-700-1');
    assert.equal(result.publication.tree, tree);
    if (route === 'hotfix') assert.deepEqual(result.checks[0].command, ['node', 'setup.mjs']);
    // Moving the active grant to the next issue does not rewrite an already executed grant.
    f.completion.currentRevision = '1'.repeat(40);
    const nextGrantApi = async path => path === 'contents/.lighthouse/unattended.json?ref=' + f.completion.currentRevision ? { content: Buffer.from(JSON.stringify({ enabled: false })).toString('base64') } : f.api(path);
    assert.equal((await readImplementationEvidence(nextGrantApi, f.completion, f.options)).status, 'passed');
  }
});

test('unattended command evidence rejects fabricated authority, changed scope, stale checks and missing original members', async t => {
  const cases = {
    'no admitted grant binding': f => { delete f.state.artifact.unattended; },
    'changed grant': f => { f.state.grant.paths = ['src/other.js']; },
    'disabled grant': f => { f.state.grant.enabled = false; },
    'unsupported route': f => { f.state.artifact.unattended.route = 'other'; },
    'wrong source': f => { f.state.native.head_sha = '3'.repeat(40); },
    'bot without owner dispatch': f => { f.state.native.actor.login = 'github-actions[bot]'; },
    'changed verification command': f => { f.state.policy.checks = [['node', 'other.mjs']]; },
    'wrong tested tree': f => { f.state.tree = '2'.repeat(40); },
    'altered output': f => { f.state.artifact.receipt.checks[0].output.content += 'forged'; },
    'missing canonical member': f => { f.state.missing = true; },
    'expired canonical artifact': f => { f.state.expired = true; },
  };
  for (const [name, mutate] of Object.entries(cases)) await t.test(name, async () => {
    const f = await fixture({ unattended: true }); mutate(f);
    assert.equal((await readImplementationEvidence(f.api, f.completion, f.options)).status, 'unavailable');
  });
});

test('identity-bearing ordinary and product receipts authenticate open and merged PRs', async t => {
  for (const product of [false, true]) for (const merged of [false, true]) await t.test(`${product ? 'product' : 'ordinary'} ${merged ? 'merged' : 'open'}`, async () => {
    const f = await fixture({ product });
    if (merged) {
      f.state.pr.state = 'closed'; f.state.pr.merged = true; f.state.pr.merge_commit_sha = '7'.repeat(40);
      f.completion.merged = true; f.completion.merge = f.state.pr.merge_commit_sha;
    }
    const result = await readImplementationEvidence(f.api, f.completion, f.options);
    assert.equal(result.status, 'passed', result.reason);
    assert.equal(result.publication.head, head);
  });
});

test('a matching host receipt authenticates commands against the current published tree', async () => {
  const f = await fixture();
  const result = await readImplementationEvidence(f.api, f.completion, f.options);
  assert.equal(result.status, 'passed', result.reason);
  assert.equal(result.checks.length, 2);
  assert.deepEqual(result.checks[0].command, ['node', 'verify.mjs']);
  assert.equal(result.checks[0].output.content, 'Verification passed\n');
  assert.equal(result.producer.attempt, 1);
  // Unrelated main commits do not invalidate a byte-identical candidate, policy and workflow.
  f.completion.currentRevision = '1'.repeat(40);
  assert.equal((await readImplementationEvidence(f.api, f.completion, f.options)).status, 'passed');
  f.state.modelTree = f.state.candidateModelTree = '2'.repeat(40);
  assert.equal((await readImplementationEvidence(f.api, f.completion, f.options)).status, 'passed', 'already-tested authority changes remain reusable after merge');
});

test('authority freshness follows the existing configured ProductShape model root', async () => {
  const f = await fixture(); f.state.productRoot = 'specification/product';
  f.completion.currentRevision = '1'.repeat(40); f.state.modelTree = '2'.repeat(40);
  const result = await readImplementationEvidence(f.api, f.completion, f.options);
  assert.equal(result.status, 'unavailable'); assert.match(result.reason, /specification\/product\/model/);
});

test('a bot producer requires the authenticated router receipt and matching admitted inputs', async () => {
  const f = await fixture(), repository = f.completion.binding.repository;
  f.state.native.actor.login = f.state.native.triggering_actor.login = 'github-actions[bot]';
  const request = { schemaVersion: 1, id: dispatchId(repository, '300', 'implement'), repository, issue: 18, stage: 'implement', autoImplement: false, routerRunId: '300', routerAttempt: 1, workflowRevision: revision, sourceRevision: revision, taskDigest: intent, ref: 'main', eventName: 'workflow_dispatch', event: { inputs: { issue: '18', stage: 'implement' } }, handoff: false };
  const receipt = { schemaVersion: 1, stage: 'implement', id: request.id, digest: digest(JSON.stringify(request)), routerRunId: '300', routerAttempt: 1, workerRunId: '700' };
  f.state.artifact.dispatch = { commentId: 30, requestId: request.id, digest: receipt.digest };
  const api = async path => {
    if (path === 'issues/comments/30') return { id: 30, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repository}/issues/18`, body: dispatchReceiptBody(repository, receipt) };
    if (path === 'actions/runs/300/attempts/1') return { id: 300, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch', actor: { login: 'owner' }, triggering_actor: { login: 'owner' }, head_sha: revision, head_branch: 'main', repository: { full_name: repository } };
    return f.api(path);
  };
  const readArtifact = async (...args) => args[3] === dispatchArtifact(request) ? copy(request) : f.options.readArtifact(...args);
  const result = await readImplementationEvidence(api, f.completion, { ...f.options, readArtifact });
  assert.equal(result.status, 'passed', result.reason);
  // A correction reads the PR head while its router still admits the default-branch policy revision.
  request.worker = 'apply-review'; request.feedbackKey = '3'.repeat(64);
  request.id = dispatchId(repository, request.feedbackKey, 'implement');
  receipt.worker = request.worker; receipt.feedbackKey = request.feedbackKey; receipt.id = request.id; receipt.digest = digest(JSON.stringify(request));
  f.state.native.path = '.github/workflows/lighthouse-sdlc-apply-review.lock.yml';
  const corrected = { ...f.request, sourceRevision: '2'.repeat(40), baseRevision: revision, dispatch: { commentId: 30, requestId: request.id, digest: receipt.digest } };
  const correctedReceipt = { ...f.receipt, binding: commandEvidenceBinding(corrected), sourceRevision: corrected.sourceRevision };
  f.state.artifact = implementationEvidenceBundle(corrected, correctedReceipt, f.changes, { pr: 23, head, tree });
  const correction = await readImplementationEvidence(api, f.completion, { ...f.options, readArtifact });
  assert.equal(correction.status, 'passed', correction.reason);
  request.taskDigest = '1'.repeat(64);
  assert.equal((await readImplementationEvidence(api, f.completion, { ...f.options, readArtifact })).status, 'unavailable');
});

test('spoofed producers and changed criteria, code, plan, policy, command or attempt stay unavailable', async t => {
  const cases = {
    'another PR': f => { f.state.pr.number++; },
    'another issue branch': f => { f.state.pr.head.ref = f.state.pr.head.ref.replace('-18-', '-19-'); },
    'another head repository': f => { f.state.pr.head.repo.full_name = 'attacker/demo'; },
    'another base repository': f => { f.state.pr.base.repo.full_name = 'attacker/demo'; },
    'another base branch': f => { f.state.pr.base.ref = 'other'; },
    'another current head': f => { f.state.pr.head.sha = '1'.repeat(40); },
    'another implementation identity': f => { f.state.implementationIdentity = '1'.repeat(64); },
    'missing implementation marker': f => { f.state.pr.body = ''; },
    'closed without merge': f => { f.state.pr.state = 'closed'; },
    'unexpected merge': f => { f.state.pr.state = 'closed'; f.state.pr.merged = true; },
    'unconfirmed merge': f => { f.completion.merged = true; f.completion.merge = '7'.repeat(40); },
    'different merge commit': f => { f.completion.merged = true; f.completion.merge = '7'.repeat(40); f.state.pr.state = 'closed'; f.state.pr.merged = true; f.state.pr.merge_commit_sha = '8'.repeat(40); },
    'another repository': f => { f.state.native.repository.full_name = 'attacker/demo'; },
    'another workflow': f => { f.state.native.path = '.github/workflows/untrusted.yml'; },
    'another actor': f => { f.state.native.actor.login = 'attacker'; },
    'unproven bot origin': f => { f.state.native.actor.login = 'github-actions[bot]'; },
    'unsuccessful source run': f => { f.state.native.conclusion = 'failure'; },
    'another run': f => { f.state.artifact.binding.workflowRunId = '701'; },
    'mismatched attempt': f => { f.state.native.run_attempt = 2; },
    'receipt attempt': f => { f.state.artifact.binding.attempt = 2; },
    'changed criteria': f => { f.completion.binding.intent = '1'.repeat(64); },
    'changed code or in-tree plan': f => { f.state.tree = '2'.repeat(40); },
    'changed published head': f => { f.state.artifact.publication.head = '2'.repeat(40); },
    'changed policy': f => { f.state.policy.reviewRequired = true; },
    'changed checks': f => { f.state.policy.checks[0] = ['node', 'other.mjs']; },
    'changed argv': f => { f.state.artifact.receipt.checks[0].command = ['true']; },
    'changed external plan': f => { f.state.artifact.planningReference = { number: 99 }; },
    'changed workflow': f => { f.completion.currentRevision = '1'.repeat(40); f.state.workflow = '2'.repeat(40); },
    'changed accepted product model': f => { f.completion.currentRevision = '1'.repeat(40); f.state.modelTree = '2'.repeat(40); },
    'changed shared validation policy': f => { f.completion.currentRevision = '1'.repeat(40); f.state.sharedPolicy = '2'.repeat(40); },
    'incomplete authority inventory': f => { f.completion.currentRevision = '1'.repeat(40); f.state.incompleteTree = true; },
    'tampered output': f => { f.state.artifact.receipt.checks[0].output.content = 'Invented success'; },
    'tampered provider rows': f => { f.state.artifact.receipt.checks[0].output.jsonEvidence = { citations: [{ status: 'current' }] }; },
    'agent JSON': f => { f.state.artifact = { producer: 'agent', status: 'passed', checks: [] }; },
    'legacy receipt': f => { f.state.artifact.receipt.schemaVersion = 1; },
    'missing artifact': f => { f.state.missing = true; },
    'expired artifact': f => { f.state.expired = true; },
  };
  for (const [name, mutate] of Object.entries(cases)) await t.test(name, async () => {
    const f = await fixture(); mutate(f);
    const result = await readImplementationEvidence(f.api, f.completion, f.options);
    assert.equal(result.status, 'unavailable', JSON.stringify(result));
    assert.deepEqual(result.checks, []);
    assert.ok(result.reason);
  });
});

test('retained failures, unavailable commands and truncated output preserve their meanings', async () => {
  const f = await fixture();
  f.state.artifact.receipt.checks[0].exitCode = 1;
  f.state.artifact.receipt.checks[0].execution.status = 'failed';
  let result = await readImplementationEvidence(f.api, f.completion, f.options);
  assert.equal(result.status, 'failed'); assert.equal(result.checks[0].status, 'failed');
  f.state.artifact.receipt.checks[0].reason = 'Checks modified source; candidate not validated';
  f.state.artifact.receipt.checks[0].execution.status = 'passed';
  assert.equal((await readImplementationEvidence(f.api, f.completion, f.options)).checks[0].status, 'failed');
  f.state.artifact.receipt.checks[1].reason = 'Not run after a failed check';
  delete f.state.artifact.receipt.checks[1].output;
  result = await readImplementationEvidence(f.api, f.completion, f.options);
  assert.equal(result.status, 'unavailable'); assert.equal(result.checks[0].status, 'failed'); assert.equal(result.checks[1].status, 'unavailable');
  const long = retainedCommandOutput('x'.repeat(5000));
  assert.equal(long.content.length, 4096); assert.equal(long.truncated, true); assert.notEqual(long.sha256, long.logSha256);
  const provider = retainedCommandOutput(JSON.stringify({ citations: ['x'.repeat(6000)], summary: { current: 37, stale: 0, errors: 0 } }));
  assert.equal(provider.truncated, true); assert.deepEqual(provider.jsonSummary, { current: 37, stale: 0, errors: 0 });
  assert.equal(retainedCommandOutput('partial JSON {"summary":').jsonSummary, undefined);
  const lost = retainedCommandOutput('{"summary":{"current":37}}', true);
  assert.equal(lost.logTruncated, true); assert.equal(lost.truncated, true); assert.equal(lost.jsonSummary, undefined);
  const scoped = retainedCommandOutput(JSON.stringify({ schema: 'provider/v1', documents: [{ path: 'plan/design.md', citations: 1 }, { path: 'other.md', citations: 1 }], citations: [{ source: 'plan/design.md', status: 'current' }, { source: 'other.md', status: 'stale' }], diagnostics: [{ file: 'other.md', message: 'Stale citation' }] }), false, ['plan/']);
  assert.deepEqual(scoped.jsonEvidence.scope, ['plan/design.md']);
  assert.deepEqual(scoped.jsonEvidence.citations, [{ source: 'plan/design.md', status: 'current' }]);
  assert.equal(scoped.jsonEvidence.diagnostics[0].file, 'other.md');
  assert.equal(retainedCommandOutput(JSON.stringify({ citations: [{ source: 'plan/design.md', content: 'x'.repeat(9000) }] }), false, ['plan/']).jsonEvidence, undefined);
});

test('publisher rejects an altered binding or a tested tree that differs from publication', async () => {
  const f = await fixture();
  assert.throws(() => implementationEvidenceBundle(f.request, f.receipt, f.changes, { pr: 23, head, tree: '2'.repeat(40) }), /trees/);
  f.receipt.binding.intent = '1'.repeat(64);
  assert.throws(() => implementationEvidenceBundle(f.request, f.receipt, f.changes, { pr: 23, head, tree }), /input mismatch/);
});

test('publication rechecks any cited host receipt before accepting the assessment', async () => {
  const f = await fixture(), before = await readImplementationEvidence(f.api, f.completion, f.options);
  const envelope = { result: { evidence: [{ id: before.checks[0].evidenceId, status: 'passed' }] } };
  assert.doesNotThrow(() => assertCitedChecks(envelope, { observedChecks: before.checks }, { observedChecks: before.checks }));
  for (const id of ['implementation:forged', 'github-check:forged', 'github-status:forged']) assert.throws(() => assertCitedChecks({ result: { evidence: [{ id, status: 'passed' }] } }, { observedChecks: before.checks }, { observedChecks: before.checks }), /unauthenticated/);
  f.state.missing = true;
  const after = await readImplementationEvidence(f.api, f.completion, f.options);
  assert.throws(() => assertCitedChecks(envelope, { observedChecks: before.checks }, { observedChecks: after.checks }), /unavailable/);
});

test('an installed tarball accepts authenticated matching inputs, rejects a spoof and preserves stage-result v1', async () => {
  const root = fileURLToPath(new URL('../../', import.meta.url)), temp = await mkdtemp(join(tmpdir(), 'lighthouse-command-consumer-'));
  try {
    const [{ filename }] = JSON.parse(execFileSync('npm', ['pack', '--workspace', '@juangcarmona/lighthouse-sdlc', '--pack-destination', temp, '--json'], { cwd: root, encoding: 'utf8' }));
    await writeFile(join(temp, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(temp, filename)], { cwd: temp, stdio: 'pipe' });
    const f = await fixture(), paths = [
      'pulls/23', 'issues/18/comments?per_page=100&page=1', 'actions/runs/700', 'actions/runs/700/attempts/1',
      `contents/.github/workflows/lighthouse-sdlc-implement.lock.yml?ref=${revision}`,
      `contents/.lighthouse/implement.json?ref=${revision}`, `contents/.lighthouse/environment.json?ref=${revision}`,
      `git/commits/${head}`, `git/commits/${revision}`, `git/trees/${revision}?recursive=1`,
    ];
    const responses = Object.fromEntries(await Promise.all(paths.map(async path => [path, await f.api(path)])));
    await writeFile(join(temp, 'inputs.json'), JSON.stringify({ responses, artifact: f.state.artifact, completion: f.completion, now: f.options.now }));
    await writeFile(join(temp, 'consumer.mjs'), `
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readImplementationEvidence } from '@juangcarmona/lighthouse-sdlc/implementation-evidence';
import { adaptStageResult } from '@juangcarmona/lighthouse-sdlc/evidence';
const data=JSON.parse(readFileSync(new URL('./inputs.json',import.meta.url)));
const api=async path=>structuredClone(data.responses[path]);
const options={now:data.now,readArtifact:async()=>structuredClone(data.artifact)};
const accepted=await readImplementationEvidence(api,data.completion,options);
assert.equal(accepted.status,'passed',accepted.reason);
data.responses['actions/runs/700/attempts/1'].actor.login='untrusted';
const rejected=await readImplementationEvidence(api,data.completion,options);
assert.equal(rejected.status,'unavailable');
const legacy={schemaVersion:1,runId:'legacy',stage:'implement',gate:'done',status:'passed',evidence:[{id:'original',status:'passed'}],missingEvidence:[],unavailableChecks:[],pendingReview:[],nextAction:'Review.'};
const before=JSON.stringify(legacy), adapted=adaptStageResult(legacy);
assert.deepEqual(adapted.errors,[]);assert.equal(JSON.stringify(adapted.record.payload),before);assert.equal(JSON.stringify(legacy),before);
console.log(JSON.stringify({installedPackage:true,accepted:accepted.status,rejected:rejected.status,reason:rejected.reason,legacyPayloadUnchanged:true}));
`);
    const trace = JSON.parse(execFileSync(process.execPath, ['consumer.mjs'], { cwd: temp, encoding: 'utf8' }));
    assert.equal(trace.accepted, 'passed'); assert.equal(trace.rejected, 'unavailable'); assert.equal(trace.legacyPayloadUnchanged, true);
    console.log('Packaged command evidence trace:', JSON.stringify(trace));
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('synchronized receipts authenticate immutable base inputs and exact commit ancestry without changing legacy admission', async () => {
  const base = '1'.repeat(40), ancestor = '2'.repeat(40), sourceTree = '4'.repeat(40), baseTree = '5'.repeat(40), ancestorTree = '6'.repeat(40);
  const before = '7'.repeat(40), after = '8'.repeat(40);
  const synchronization = { schemaVersion: 1, source: revision, base, ancestor, sourceTree, baseTree, files: [{ path: '.github/workflows/ci.yml', sha: after, mode: '100644', size: 4, before: { sha: before, mode: '100644' } }] };
  for (const scenario of ['passed', 'missing-manifest', 'changed-blob', 'wrong-parents', 'disabled-policy', 'model-changes']) {
    const f = await fixture();
    f.state.policy.verification = { paths: ['.github/'], corrections: {}, synchronizeBase: true };
    const implementation = await loadImplementation(f.api, 18, 'owner', base, 'main');
    const request = { ...f.request, baseRevision: base, implementation, sourceSynchronization: synchronization };
    const receipt = { ...f.receipt, changesDigest: changesDigest([]), binding: commandEvidenceBinding(request) };
    f.state.artifact = implementationEvidenceBundle(request, receipt, [], { pr: 23, head, tree });
    if (scenario === 'missing-manifest') delete f.state.artifact.sourceSynchronization;
    if (scenario === 'disabled-policy') f.state.policy.verification.synchronizeBase = false;
    if (scenario === 'model-changes') { f.state.artifact.changesDigest = changesDigest(f.changes); f.state.artifact.receipt.changesDigest = f.state.artifact.changesDigest; }
    f.completion.currentRevision = base;
    const api = async path => {
      if (path === `compare/${base}...${revision}`) return { base_commit: { sha: base }, merge_base_commit: { sha: ancestor }, behind_by: 1 };
      if ([revision, base, ancestor].some(ref => path === `git/commits/${ref}`)) { const sha = path.slice(12); return { sha, tree: { sha: ({ [revision]: sourceTree, [base]: baseTree, [ancestor]: ancestorTree })[sha] } }; }
      if ([sourceTree, baseTree, ancestorTree].some(ref => path === `git/trees/${ref}?recursive=1`)) return { truncated: false, tree: [{ path: '.github/workflows/ci.yml', mode: '100644', type: 'blob', size: 4, sha: path.includes(baseTree) ? scenario === 'changed-blob' ? '9'.repeat(40) : after : before }] };
      const value = await f.api(path);
      if (path === `git/commits/${head}`) value.parents = (scenario === 'wrong-parents' ? [revision] : [revision, base]).map(sha => ({ sha }));
      return value;
    };
    const result = await readImplementationEvidence(api, f.completion, f.options);
    assert.equal(result.status, scenario === 'passed' ? 'passed' : 'unavailable', scenario + ': ' + result.reason);
  }
});

test('source-link command evidence reconstructs admitted entries and rejects a self-consistent forged artifact', async () => {
  const { sourceLinksDigest } = await import('../packages/sdlc/src/source-link-tree.mjs');
  const f = await fixture();
  f.state.sourceLinks = [{ path: '.claude/skills/example', mode: '120000', sha: '1'.repeat(40) }];
  const sourceLinks = { schemaVersion: 1, sourceRevision: revision, entries: copy(f.state.sourceLinks) };
  const request = { ...f.request, sourceLinks };
  const receipt = { ...f.receipt, binding: commandEvidenceBinding(request) };
  f.state.artifact = implementationEvidenceBundle(request, receipt, f.changes, { pr: 23, head, tree });
  assert.equal((await readImplementationEvidence(f.api, f.completion, f.options)).status, 'passed');
  f.state.artifact.sourceLinks.entries[0].sha = '2'.repeat(40);
  const forged = sourceLinksDigest(f.state.artifact.sourceLinks, revision);
  f.state.artifact.binding.sourceLinks = forged; f.state.artifact.receipt.binding.sourceLinks = forged;
  const denied = await readImplementationEvidence(f.api, f.completion, f.options);
  assert.equal(denied.status, 'unavailable'); assert.match(denied.reason, /source-link provenance/);
  delete f.state.artifact.sourceLinks; delete f.state.artifact.binding.sourceLinks; delete f.state.artifact.receipt.binding.sourceLinks;
  assert.match((await readImplementationEvidence(f.api, f.completion, f.options)).reason, /source-link provenance/);
});
