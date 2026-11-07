import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { commandEvidenceBinding } from '../packages/sdlc/src/implementation-evidence.mjs';
import { changesDigest, validateCheckReceipt } from '../packages/sdlc/src/implementation.mjs';
import { implementationPrProof, reconcileImplementationPr } from '../packages/sdlc/src/pr-state.mjs';
import { runGithubUnattended, assertUnattendedPullRequest } from '../packages/sdlc/src/unattended-actions.mjs';
import { applyCandidate, stageContext, boundedOpenSpecProvider, executeUnattendedStage } from '../packages/sdlc/src/unattended-runtime.mjs';

async function fixture({ route = 'hotfix', attempt = 1, rejectValidation = 0, specBearing = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-native-adapter-')), sourceRoot = join(root, 'source');
  await mkdir(join(sourceRoot, 'src/feature'), { recursive: true });
  await writeFile(join(sourceRoot, 'src/feature/rule.mjs'), 'export const eligible = value => value > 2;\n');
  const git = args => execFileSync('git', ['-C', sourceRoot, '-c', 'core.hooksPath=/dev/null', ...args], { encoding: 'utf8', stdio: 'pipe',
    env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@localhost', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@localhost' } });
  git(['init', '--template=', '--initial-branch=main']); git(['add', '.']); git(['commit', '-m', 'Fixture']);
  const revision = git(['rev-parse', 'HEAD']).trim(), eventPath = join(root, 'event.json'), configPath = join(root, 'engine.json');
  await writeFile(eventPath, JSON.stringify({ inputs: { issue: '1', route } }));
  await writeFile(configPath, JSON.stringify({ modelProfiles: { schemaVersion: 1, enabled: true, defaultProfile: 'build', profiles: {
    build: { model: 'openai/implementation', reasoningEffort: 'medium' }, plan: { model: 'openai/reviewer', reasoningEffort: 'high' },
  } }, modelCapabilities: {
    'openai/implementation': { available: true, tools: true, reasoningEfforts: ['medium'] },
    'openai/reviewer': { available: true, tools: true, reasoningEfforts: ['high'] },
  } }));
  const policy = { schemaVersion: 1, enabled: true, routes: [route], paths: ['src/feature/', 'tests/'], reviewerProfile: 'plan', allowFivePoint: false,
    merge: false, maxCorrections: 1, timeoutSeconds: 60, hotfix: { modules: { feature: ['src/feature/', 'tests/'] },
      setupCommands: [], testPaths: ['tests/'], regressionCommand: ['node', '--test', 'tests/edge.test.mjs'], failurePattern: ['ERR_ASSERTION'] } };
  const eligibility = { points: 1, risk: 'low', reversible: true, dependenciesResolved: true, scopeKnown: true, productChangeNeeded: false,
    humanDecisionRequired: false, reason: 'An isolated boundary and known assertion', confirmedDefect: true, rollback: 'Revert the correction' };
  const plan = { command: policy.hotfix.regressionCommand, assertion: 'Expected inclusive boundary', estimatedProductionLines: 2, rootCause: 'Strict comparison excludes equality',
    plannedFiles: ['src/feature/rule.mjs', 'tests/edge.test.mjs'] };
  const comments = [], labels = [], executions = [], writes = [];
  let publishedPr = null;
  const issue = () => ({ number: 1, state: 'open', title: 'Correct the inclusive boundary', body: 'Values equal to 2 must be eligible.', html_url: 'https://github.com/owner/repo/issues/1', user: { login: 'owner' }, labels: labels.map(name => ({ name })) });
  const encode = value => ({ content: Buffer.from(JSON.stringify(value)).toString('base64') });
  const api = async (path, method = 'GET', body) => { if (path.startsWith('contents/lighthouse.json?ref=')) return null;
    if (method !== 'GET') writes.push({ path, method, body });
    if (path === '') return { default_branch: 'main' };
    if (path === 'commits/main') return { sha: revision };
    if (path === 'actions/runs/123') return { event: 'workflow_dispatch', actor: { login: 'owner' }, triggering_actor: { login: 'owner' },
      repository: { full_name: 'owner/repo' }, head_sha: revision, head_branch: 'main', path: '.github/workflows/lighthouse-sdlc-unattended.yml', run_attempt: attempt };
    if (path.startsWith('contents/.lighthouse/unattended.json')) return encode(policy);
    if (path.startsWith('contents/.lighthouse/implement.json')) return encode({ defaults: { scope: 'The isolated issue', paths: ['src/feature/', 'tests/'],
      checks: [['node', '--test', 'tests/edge.test.mjs']], reviewRequired: false, verification: { paths: ['tests/'], corrections: {} } } });
    if (path.startsWith('contents/.lighthouse/')) return null;
    if (path === 'issues/1') return issue();
    if (path.startsWith('issues/1/comments')) {
      if (method === 'POST') { const result = { id: comments.length + 1, user: { login: 'github-actions[bot]', type: 'Bot' }, body: body.body }; comments.push(result); return result; }
      return comments;
    }
    if (path === 'issues/1/labels' && method === 'POST') { labels.push(...body.labels); return []; }
    if (path.startsWith('issues/1/labels/') && method === 'DELETE') { const label = path.slice('issues/1/labels/'.length), index = labels.indexOf(label); if (index >= 0) labels.splice(index, 1); return null; }
    if (path.startsWith('pulls?state=open')) return [];
    if (path === 'git/commits/' + revision) return { tree: { sha: 'tree' } };
    if (path === 'git/commits/' + 'b'.repeat(40)) return { tree: { sha: 'b'.repeat(40) } };
    if (path === 'git/blobs' || path === 'git/trees' || path === 'git/commits') return { sha: 'b'.repeat(40) };
    if (path === 'git/refs') return { object: { sha: 'b'.repeat(40) } };
    if (path === 'git/ref/heads/main') return { object: { sha: revision } };
    if (path.startsWith('git/ref/heads/lighthouse/implement-')) return { object: { sha: publishedPr.head.sha } };
    if (path === 'pulls' && method === 'POST') return publishedPr = { id: 30, number: 3, state: 'open', merged: false, draft: body.draft, body: body.body, user: { login: 'github-actions[bot]', type: 'Bot' }, html_url: 'https://github.com/owner/repo/pull/3', head: { sha: 'b'.repeat(40), ref: body.head, repo: { full_name: 'owner/repo' } }, base: { ref: body.base, sha: revision, repo: { full_name: 'owner/repo' } } };
    if (path === 'pulls/3') return publishedPr;
    if (path.startsWith('issues/3/') || path.startsWith('pulls/3/')) return [];
    throw Error('Unexpected fixture API: ' + method + ' ' + path);
  };
  const execute = async options => {
    assert.equal(options.request.repository, 'owner/repo');
    executions.push(options);
    const envelope = stageContext({ ...options.request, reviewOutput: undefined }, issue()).contract.envelope;
    let changes = [], receipt = null;
    if (['triage', 'refine'].includes(options.request.stage)) envelope.result.output = { eligibility, hotfix: plan };
    else if (options.request.stage === 'propose') envelope.result.output.files = [
      ...['proposal.md', 'design.md', 'tasks.md'].map(name => ({ path: 'openspec/changes/issue-1-proposal/' + name, content: name === 'tasks.md' ? '- [ ] Implement boundary correction\n' : '# Synthetic adapter plan\n' })),
      ...(specBearing ? [{ path: 'openspec/changes/issue-1-proposal/specs/boundary/spec.md', content: '## ADDED Requirements\n\n### Requirement: Inclusive boundary\nValues equal to 2 SHALL be eligible.\n\n#### Scenario: Equal value\n- **WHEN** the value equals 2\n- **THEN** it is eligible\n' }] : [{ path: 'openspec/changes/issue-1-proposal/.openspec.yaml', content: 'skip_specs: true' }]),
    ];
    else if (options.request.worker === 'independent-review') {
      if (options.context.review.purpose === 'candidate') {
        assert.deepEqual(options.context.review.details.scope, { implementationPaths: policy.paths, planningRoots: route === 'ff' ? ['openspec/changes/issue-1-proposal/'] : [] });
        assert.match(options.prompt, /findings \(plain strings/);
        assert.deepEqual(options.request.reviewOutput, { protocol: 'verdict-v1', purpose: 'candidate', binding: options.context.review.binding });
        assert.equal(options.context.contract.envelope, undefined);
        assert.equal(options.context.contract.review.binding, options.context.review.binding);
        if (route === 'hotfix') {
          assert.match(options.context.review.details.red.receipt.checks.find(c => c.exitCode !== 0).log, /ERR_ASSERTION/);
          assert.ok(options.context.review.details.red.tests['tests/edge.test.mjs']);
        }
        assert.match(Buffer.from(options.context.review.details.originalFiles['src/feature/rule.mjs'], 'base64').toString(), /value > 2/);
      }
      envelope.result.output.review = { binding: options.context.review.binding, verdict: 'accept', findings: [] };
    } else if (route === 'hotfix' && !options.source.has('tests/edge.test.mjs')) {
      changes = [{ path: 'tests/edge.test.mjs', mode: '100644', content: Buffer.from('assert.equal(eligible(2), true);\n').toString('base64') }];
      receipt = { checks: [{ command: plan.command, exitCode: 1, log: 'ERR_ASSERTION: Expected inclusive boundary', execution: { status: 'failed', exitCode: 1, signal: null } }] };
      envelope.result.status = 'blocked';
      envelope.result.output.eligibility = eligibility;
    } else {
      changes = [{ path: 'src/feature/rule.mjs', mode: '100644', content: Buffer.from('export const eligible = value => value >= 2;\n').toString('base64') }];
      receipt = { checks: options.request.implementation.policy.checks.map(command => ({ command, exitCode: 0, log: 'passed', execution: { status: 'passed', exitCode: 0, signal: null } })) };
      envelope.result.output.eligibility = eligibility;
    }
    if (receipt) receipt = { ...syntheticReceipt(options.request, changes, receipt.checks), ...receipt };
    return { request: options.request, envelope, receipt, changes, source: applyCandidate(options.source, changes), runtime: {
      model: options.request.worker === 'independent-review' ? 'openai/reviewer' : 'openai/implementation',
      modelExecution: { providerReported: { status: 'unverified' } }, execution: { status: 'passed' },
    } };
  };
  const env = { ...process.env, GITHUB_EVENT_PATH: eventPath, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_ACTOR: 'owner', GITHUB_TRIGGERING_ACTOR: 'owner',
    GITHUB_REPOSITORY: 'owner/repo', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: String(attempt),
    LIGHTHOUSE_SOURCE_ROOT: sourceRoot, LIGHTHOUSE_ENGINE_CONFIG: configPath, RUNNER_TEMP: root };
  if (route === 'ff') {
    // Synthetic provider transport only: this is not OpenSpec validation evidence.
    const bin = join(root, 'bin'); await mkdir(bin);
    await writeFile(join(bin, 'npx'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(process.argv.indexOf('openspec') + 1);
if (args[0] === 'validate' && ${rejectValidation} > 0) {
  const counter = process.env.HOME + '/validation-count';
  const count = fs.existsSync(counter) ? Number(fs.readFileSync(counter, 'utf8')) : 0;
  fs.writeFileSync(counter, String(count + 1));
  if (count < ${rejectValidation}) {
    console.log(JSON.stringify({ version: '1.0', items: [{ id: args[1], type: 'change', valid: false, issues: [{ level: 'WARNING', path: 'spec.md', message: 'Split the overlong requirement' }] }], summary: { totals: { items: 1, passed: 0, failed: 1 } } }));
    process.exit(1);
  }
}
if (args[0] === 'new') {
  const dir = 'openspec/changes/' + args[2]; fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + '/.openspec.yaml', 'schema: spec-driven\\ncreated: 2026-11-05\\n');
}
console.log(JSON.stringify(args[0] === 'status' ? { isPlanningComplete: true } : { outputPath: args[1], instruction: 'Synthetic fixture', template: '' }));
`, { mode: 0o755 });
    env.PATH = bin + ':' + process.env.PATH;
  }
  return { root, api, env, execute, executions, writes, labels, comments, policy, revision, issue };
}

function assertHostIdentity(f, intent, attempt) {
  assert.equal(new Set(f.executions.map(e => e.request.runId)).size, f.executions.length);
  for (const { request, context } of f.executions) {
    for (const value of [request, context.request]) {
      assert.equal(value.repository, 'owner/repo');
      assert.equal(value.sourceRevision, f.revision);
      assert.equal(value.workflowRunId, '123');
      assert.equal(value.attempt, attempt);
      assert.equal(value.taskDigest, intent);
    }
  }
}

// Contract fixture only, never an independent host execution receipt.
function syntheticReceipt(request, changes, checks) {
  return { schemaVersion: 2, runId: request.runId, sourceRevision: request.sourceRevision,
    changesDigest: changesDigest(changes), candidateTree: 'b'.repeat(40), binding: commandEvidenceBinding(request), checks };
}

test('every FF/hotfix stage and correction retains authenticated rerun and initial owner intent', async t => {
  for (const route of ['ff', 'hotfix']) await t.test(route, async () => {
    const f = await fixture({ route, attempt: 3 }), execute = f.execute;
    const answer = { id: 1, body: 'Keep the inclusive edge.', updated_at: '2026-11-05T00:00:00Z', user: { login: 'owner' } };
    f.comments.push(answer);
    const intent = createHash('sha256').update(JSON.stringify({ title: f.issue().title, body: f.issue().body,
      comments: [{ id: answer.id, body: answer.body, updated_at: answer.updated_at }] })).digest('hex');
    let candidateReviews = 0;
    f.execute = async options => {
      const result = await execute(options);
      if (options.request.stage === 'implement') assert.equal(validateCheckReceipt(syntheticReceipt(options.request, result.changes, result.receipt.checks),
        options.request, result.changes), result.receipt.checks.every(c => c.exitCode === 0));
      // Model-returned identity is untrusted and must never seed a subsequent request.
      Object.assign(result.envelope.result.output, { workflowRunId: '999', attempt: 99, taskDigest: 'f'.repeat(64) });
      if (options.context.review?.purpose === 'candidate' && ++candidateReviews === 1) {
        result.envelope.result.status = 'blocked';
        result.envelope.result.output.review = { binding: options.context.review.binding, verdict: 'request-changes', findings: ['Retain the edge correction.'] };
      }
      return result;
    };
    try {
      const result = await runGithubUnattended(f);
      assert.equal(result.status, 'waiting-human', result.reason);
      assert.deepEqual(f.executions.map(e => e.request.stage), route === 'ff'
        ? ['refine', 'propose', 'integrate', 'implement', 'integrate', 'implement', 'integrate']
        : ['triage', 'integrate', 'implement', 'implement', 'integrate', 'implement', 'integrate']);
      assertHostIdentity(f, intent, 3);
      assert.equal(f.writes.filter(w => w.path === 'pulls').length, 1);
      assert.equal(candidateReviews, 2);
      const retained = JSON.parse(await readFile(join(f.root, 'lighthouse-unattended-123/implementation-evidence.json'), 'utf8'));
      const implementation = f.executions.filter(e => e.request.stage === 'implement').at(-1).request;
      assert.equal(retained.binding.runId, implementation.runId);
      assert.equal(retained.binding.intent, intent);
      assert.equal(retained.binding.attempt, 3);
      assert.equal(retained.publication.head, 'b'.repeat(40));
      assert.equal(retained.receipt.candidateTree, retained.publication.tree);
      assert.equal(retained.changesDigest, changesDigest([{ path: 'src/feature/rule.mjs', mode: '100644', content: Buffer.from('export const eligible = value => value >= 2;\n').toString('base64') }]));
      assert.equal(retained.unattended.route, route);
      assert.ok(retained.receipt.checks.every(check => !('log' in check)));
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
});

test('a published tree that differs from the checked tree cannot produce command evidence or continue delivery', async () => {
  const f = await fixture(), api = f.api;
  f.api = async (...args) => args[0] === 'git/commits/' + 'b'.repeat(40) ? { tree: { sha: 'c'.repeat(40) } } : api(...args);
  try {
    const result = await runGithubUnattended(f);
    assert.equal(result.status, 'blocked');
    assert.match(result.reason, /tested and published trees/);
    assert.equal(f.writes.filter(w => w.path === 'pulls').length, 1);
    assert.equal(f.writes.filter(w => w.path.endsWith('/merge') || w.path.endsWith('/dispatches')).length, 0);
    await assert.rejects(readFile(join(f.root, 'lighthouse-unattended-123/implementation-evidence.json')), { code: 'ENOENT' });
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('provider validation repair preserves stage identities and never reviews rejected files', async () => {
  const f = await fixture({ route: 'ff', rejectValidation: 1 });
  try {
    const result = await runGithubUnattended(f);
    assert.equal(result.status, 'waiting-human', result.reason);
    assert.equal(result.planningRound, 1);
    assert.deepEqual(f.executions.map(execution => execution.request.stage), ['refine', 'propose', 'propose', 'integrate', 'implement', 'integrate']);
    assert.deepEqual(f.executions[2].context.correction.findings, ['spec.md: Split the overlong requirement']);
    const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const runId = digest({ repository: 'owner/repo', issue: 1, route: 'ff', run: '123' });
    assert.equal(f.executions[2].request.runId, digest({ runId, sequence: 4, stage: 'propose', worker: 'propose' }));
    assert.equal(f.executions[3].request.runId, digest({ runId, sequence: 5, stage: 'integrate', worker: 'independent-review' }));
    assert.equal(result.evidence[0].kind, 'proposal-validation');
    assert.equal(result.evidence[0].files.length, 4);
    const output = await readFile(join(f.root, 'lighthouse-unattended-123/provider-commands/provider-7.stdout.log'), 'utf8');
    assert.equal(JSON.parse(output).items[0].valid, false);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('repeated provider validation rejection exhausts without review, code edits or publication', async () => {
  const f = await fixture({ route: 'ff', rejectValidation: 3 });
  try {
    const result = await runGithubUnattended(f);
    assert.equal(result.status, 'blocked'); assert.match(result.reason, /limit exhausted.*overlong/);
    assert.deepEqual(f.executions.map(execution => execution.request.stage), ['refine', 'propose', 'propose']);
    assert.equal(result.evidence.filter(item => item.kind === 'proposal-validation').length, 2);
    assert.equal(f.writes.filter(write => write.path === 'pulls').length, 0);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('native admission rejects malformed/unsafe attempts and mismatched authenticated workflows', async t => {
  for (const attempt of [0, -1, 1.5, 'NaN', '1x', Number.MAX_SAFE_INTEGER + 1]) await t.test('attempt ' + attempt, async () => {
    const f = await fixture({ attempt });
    try {
      await assert.rejects(runGithubUnattended(f), /attempt|identity/);
      assert.equal(f.executions.length, 0); assert.equal(f.writes.length, 0);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  for (const [key, value] of [['event', 'push'], ['repository', { full_name: 'other/repo' }], ['head_sha', 'f'.repeat(40)],
    ['path', '.github/workflows/other.yml'], ['run_attempt', 2], ['actor', { login: 'other' }], ['triggering_actor', { login: 'other' }]]) await t.test(key, async () => {
    const f = await fixture(), api = f.api;
    f.api = async (...args) => { const result = await api(...args); return args[0] === 'actions/runs/123' ? { ...result, [key]: value } : result; };
    try {
      await assert.rejects(runGithubUnattended(f), /workflow identity/);
      assert.equal(f.executions.length, 0); assert.equal(f.writes.length, 0);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
});

test('source, title, body and retained owner answer changes stop before the next engine or publication', async t => {
  for (const mutation of ['source', 'title', 'body', 'answer']) await t.test(mutation, async () => {
    const f = await fixture(), api = f.api, execute = f.execute;
    f.comments.push({ id: 1, body: 'Initial answer', updated_at: '2026-11-05T00:00:00Z', user: { login: 'owner' } });
    let changed = false;
    f.api = async (...args) => {
      const result = await api(...args);
      if (changed && mutation === 'source' && args[0] === 'commits/main') return { sha: 'f'.repeat(40) };
      if (changed && ['title', 'body'].includes(mutation) && args[0] === 'issues/1') return { ...result, [mutation]: 'Changed authorized intent' };
      return result;
    };
    f.execute = async options => {
      const result = await execute(options); changed = true;
      if (mutation === 'answer') f.comments[0].body = 'Changed answer';
      return result;
    };
    try {
      const result = await runGithubUnattended(f);
      assert.equal(result.status, 'blocked');
      assert.match(result.reason, mutation === 'source' ? /base or policy changed/ : /owner authorization changed/);
      assert.equal(f.executions.length, 1);
      assert.ok(!f.writes.some(w => ['git/refs', 'pulls'].includes(w.path)));
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
});

test('synthetic v2 receipts bind captured implementation requests and reject identity/replay mismatches', async t => {
  const captures = [];
  for (const attempt of [1, 2]) {
    const f = await fixture({ attempt }), execute = f.execute;
    f.execute = async options => {
      const result = await execute(options);
      if (options.request.stage === 'implement') captures.push({ request: options.request, changes: result.changes, checks: result.receipt.checks });
      return result;
    };
    try { const result = await runGithubUnattended(f); assert.equal(result.status, 'waiting-human', result.reason); }
    finally { await rm(f.root, { recursive: true, force: true }); }
  }
  // Contract fixtures, not independent command execution or an actual host checks.json.
  const synthetic = ({ request, changes, checks }) => syntheticReceipt(request, changes, checks);
  for (const capture of captures) assert.equal(validateCheckReceipt(synthetic(capture), capture.request, capture.changes), capture.checks.every(c => c.exitCode === 0));
  const green = captures[1], receipt = synthetic(green);
  for (const [field, value] of [['repository', 'other/repo'], ['issue', 2], ['runId', 'f'.repeat(64)], ['workflowRunId', '124'], ['attempt', 2],
    ['sourceRevision', 'f'.repeat(40)], ['policyRevision', 'e'.repeat(40)], ['intent', 'f'.repeat(64)], ['policy', 'f'.repeat(64)], ['planning', 'f'.repeat(64)]]) await t.test(field, () => {
    assert.notEqual(receipt.binding[field], value);
    assert.throws(() => validateCheckReceipt({ ...receipt, binding: { ...receipt.binding, [field]: value } }, green.request, green.changes), /producer or input mismatch/);
  });
  for (const [name, altered] of [
    ['policy revision', { ...green.request, baseRevision: 'e'.repeat(40) }],
    ['selected policy', { ...green.request, implementation: { ...green.request.implementation, policy: { ...green.request.implementation.policy, scope: 'Other scope' } } }],
    ['planning reference', { ...green.request, planningReference: { runId: 'f'.repeat(64) } }],
  ]) await t.test(name, () => assert.throws(() => validateCheckReceipt(receipt, altered, green.changes), /producer or input mismatch/));
  // Keep all outer receipt identity, argv, tree and change digests valid; replay only the foreign producer binding.
  for (const [name, foreign, field] of [['cross-stage', captures[0], 'runId'], ['cross-attempt', captures[3], 'attempt']]) await t.test(name, () => {
    const replayed = commandEvidenceBinding(foreign.request)[field];
    assert.notEqual(replayed, receipt.binding[field]);
    assert.throws(() => validateCheckReceipt({ ...receipt, binding: { ...receipt.binding, [field]: replayed } }, green.request, green.changes), /producer or input mismatch/);
  });
});

test('native adapter connects triage, independent planning, RED, repair, review and one PR', async () => {
  const f = await fixture();
  try {
    const result = await runGithubUnattended(f);
    assert.equal(result.status, 'waiting-human', result.reason);
    assert.deepEqual(f.executions.map(e => e.request.stage), ['triage', 'integrate', 'implement', 'implement', 'integrate']);
    assert.equal(f.writes.filter(w => w.path === 'pulls').length, 1);
    assert.ok(!f.writes.some(w => w.path.endsWith('/merge')));
    assert.ok(!f.labels.includes('agent-working'));
    await assert.rejects(runGithubUnattended(f), /already has a receipt/);
    assert.equal(f.executions.length, 5);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('native technical blockage with green host checks repairs missing evidence before one reviewed publication', async () => {
  const f = await fixture({ route: 'ff' }), execute = f.execute;
  let attempts = 0, reviews = 0;
  f.execute = async options => {
    const result = await execute(options);
    if (options.request.stage === 'implement') {
      if (++attempts === 1) {
        result.envelope.result.status = 'blocked';
        result.envelope.result.missingEvidence = ['Complete optional 404 and job-log regressions'];
        result.envelope.effect.body = 'Planned regression coverage remains incomplete';
      } else {
        assert.ok(options.context.correction.findings.some(value => value.includes('optional 404')));
        assert.equal(options.context.correction.round, 1);
      }
    }
    if (options.context.review?.purpose === 'candidate') { reviews++; assert.equal(attempts, 2); }
    return result;
  };
  try {
    const result = await runGithubUnattended(f);
    assert.equal(result.status, 'waiting-human', result.reason);
    assert.equal(attempts, 2); assert.equal(reviews, 1); assert.equal(f.writes.filter(write => write.path === 'pulls').length, 1);
    assert.equal(result.evidence.filter(item => item.kind === 'incomplete-implementation').length, 1);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('planning sees admitted command inventory and escalation reports actual missing evidence', async () => {
  const f = await fixture(), execute = f.execute;
  f.execute = async options => {
    const result = await execute(options);
    if (options.request.worker === 'independent-review' && options.context.review.purpose === 'candidate') {
      result.envelope.result.status = 'blocked';
      result.envelope.result.output.review = { binding: options.context.review.binding, verdict: 'escalate', findings: ['The host grant lacks npm run verify; maintainer must align the admitted command inventory.'] };
    }
    return result;
  };
  try {
    const result = await runGithubUnattended(f);
    assert.equal(result.status, 'blocked');
    assert.deepEqual(f.executions[0].context.unattended.implementationChecks, [['node', '--test', 'tests/edge.test.mjs']]);
    for (const value of f.executions.filter(e => e.request.stage === 'implement')) assert.deepEqual(value.context.unattended.implementationChecks, value.request.implementation.policy.checks);
    assert.match(f.comments.at(-1).body, /host grant lacks npm run verify/);
    assert.ok(!f.comments.at(-1).body.includes('requires a human decision'));
    assert.ok(!f.writes.some(w => w.path === 'pulls'));
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('published unattended candidates remain compatible with existing CI PR reconciliation', async () => {
  const f = await fixture();
  try {
    assert.equal((await runGithubUnattended(f)).status, 'waiting-human');
    const creation = f.writes.find(w => w.path === 'pulls').body;
    const pr = { number: 3, body: creation.body, state: 'open', merged: false, draft: true, user: { login: 'github-actions[bot]', type: 'Bot' },
      head: { sha: 'b'.repeat(40), ref: creation.head, repo: { full_name: 'owner/repo' } }, base: { ref: 'main', repo: { full_name: 'owner/repo' } } };
    assert.equal(implementationPrProof(f.comments, pr).complete, true);
    let promoted = false;
    const api = async (path, ...args) => path.includes('/check-runs?')
      ? { check_runs: [{ id: 1, name: 'repository', app: { id: 7 }, head_sha: pr.head.sha, status: 'completed', conclusion: 'success' }] }
      : path.includes('/statuses') ? [] : f.api(path, ...args);
    const result = await reconcileImplementationPr(api, 'owner/repo', pr, await f.api('issues/1'), f.comments,
      [{ context: 'repository', app: 7 }], async () => { promoted = true; }, { auto: true });
    assert.equal(result.status, 'ready'); assert.equal(promoted, true);
    assert.ok(!f.labels.includes('agent-working'));
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('a rejected plan reports the actual reviewer findings and does not start implementation', async () => {
  const f = await fixture(), execute = f.execute;
  f.execute = async options => {
    const result = await execute(options);
    if (options.request.worker === 'independent-review') {
      result.envelope.result.status = 'blocked';
      result.envelope.result.missingEvidence = ['Root-cause justification'];
      result.envelope.result.output.review = { binding: options.context.review.binding, verdict: 'request-changes', findings: ['Root cause is not justified by source'] };
    }
    return result;
  };
  try {
    const result = await runGithubUnattended(f);
    assert.equal(result.status, 'blocked'); assert.match(result.reason, /Root cause is not justified by source/);
    assert.equal(f.executions.length, 2); assert.ok(!f.writes.some(w => w.path === 'pulls'));
    const startLabel = f.writes.findIndex(w => w.path === 'issues/1/labels' && w.body.labels.includes('agent-working'));
    const startComment = f.writes.findIndex(w => w.path === 'issues/1/comments' && w.body.body.includes('Working ·'));
    const endLabel = f.writes.findIndex(w => w.path === 'issues/1/labels/agent-working' && w.method === 'DELETE');
    const endComment = f.writes.findIndex(w => w.path === 'issues/1/comments' && w.body.body.includes('Blocked ·'));
    assert.ok(startLabel >= 0 && startLabel < startComment && endLabel > startComment && endLabel < endComment);
    assert.match(f.comments.at(-1).body, /Root cause is not justified by source/);
    assert.doesNotMatch(f.comments.at(-1).body, /Ready for your review/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('FF planning repair uses concrete feedback, drops superseded files and retains its accepted round', async () => {
  const f = await fixture({ route: 'ff' }), execute = f.execute;
  const staleSpec = 'openspec/changes/issue-1-proposal/specs/superseded/spec.md';
  let proposals = 0, reviews = 0, implementations = 0;
  const bindings = [];
  f.execute = async options => {
    const result = await execute(options);
    if (options.request.stage === 'propose') {
      if (++proposals === 1) {
        result.envelope.result.output.files = result.envelope.result.output.files.filter(file => !file.path.endsWith('.openspec.yaml'));
        result.envelope.result.output.files.push({ path: staleSpec, content: '## ADDED Requirements\n\n### Requirement: Boundary\nThe boundary SHALL include equality.\n\n#### Scenario: Equality\n- **WHEN** value is 2\n- **THEN** it is eligible\n' });
      } else {
        assert.deepEqual(options.context.correction.findings, ['Correct the artifact scope']);
        assert.ok(options.context.correction.previous.files.some(file => file.path === staleSpec));
      }
      assert.match(options.prompt, /adopter rules.*openspec\/config.yaml/);
      assert.match(options.prompt, /final file also includes host-owned provider metadata/);
    }
    if (options.request.worker === 'independent-review' && options.context.review.purpose === 'plan') {
      bindings.push(options.context.review.binding);
      if (++reviews === 1) {
        result.envelope.result.status = 'blocked';
        result.envelope.result.missingEvidence = ['Correct the artifact scope'];
        result.envelope.result.output.review = { binding: options.context.review.binding, verdict: 'request-changes', findings: ['Correct the artifact scope'] };
      }
    }
    if (options.request.stage === 'implement') { implementations++; assert.equal(reviews, 2); assert.equal(options.source.has(staleSpec), false); }
    return result;
  };
  try {
    const result = await runGithubUnattended(f);
    assert.equal(result.status, 'waiting-human'); assert.equal(result.planningRound, 1);
    assert.equal(proposals, 2); assert.equal(reviews, 2); assert.equal(implementations, 1); assert.notEqual(bindings[0], bindings[1]);
    const retained = JSON.parse(await readFile(join(f.root, 'lighthouse-unattended-123/report.json')));
    assert.equal(retained.planningRound, 1);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

for (const specBearing of [false, true]) test(`FF planning review receives the host-validated ${specBearing ? 'spec-deltas' : 'skip-specs'} lane`, async () => {
  const f = await fixture({ route: 'ff', specBearing }), execute = f.execute;
  let reviewed = false;
  f.execute = async options => {
    const result = await execute(options);
    if (options.context.review?.purpose === 'plan') {
      reviewed = true;
      const files = options.context.review.details.plan.files;
      const metadata = files.find(file => file.path.endsWith('/.openspec.yaml')).content;
      assert.match(metadata, /schema: spec-driven/);
      assert.equal(metadata.includes('skip_specs: true'), !specBearing);
      if (options.context.review.specificationMode !== (specBearing ? 'spec-deltas' : 'skip-specs'))
        result.envelope.result.output.review = { binding: options.context.review.binding, verdict: 'request-changes', findings: ['Planning review did not identify the validated specification lane.'] };
    }
    return result;
  };
  try {
    const result = await runGithubUnattended(f);
    assert.equal(reviewed, true);
    assert.equal(result.status, 'waiting-human', result.reason);
    assert.equal(f.writes.filter(write => write.path === 'pulls').length, 1);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('planning review rejects the actual producer using the reviewer model', async () => {
  const f = await fixture(), execute = f.execute;
  f.execute = async options => {
    const result = await execute(options);
    if (options.request.stage === 'triage') result.runtime.model = 'openai/reviewer';
    return result;
  };
  try {
    const result = await runGithubUnattended(f);
    assert.equal(result.status, 'blocked'); assert.match(result.reason, /distinct model/);
    assert.equal(f.writes.filter(w => w.path === 'pulls').length, 0);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('owner setup precedes the separately recorded regression in RED and GREEN', async () => {
  const f = await fixture(), execute = f.execute;
  f.policy.hotfix.setupCommands = [['npm', 'ci', '--ignore-scripts']];
  f.execute = async options => {
    const result = await execute(options);
    if (options.request.stage === 'implement') {
      assert.deepEqual(options.request.implementation.policy.checks.slice(0, 2), [...f.policy.hotfix.setupCommands, f.policy.hotfix.regressionCommand]);
      if (result.receipt.checks[0].exitCode !== 0) result.receipt.checks.unshift({ command: f.policy.hotfix.setupCommands[0], exitCode: 0, execution: { status: 'passed', exitCode: 0, signal: null } });
    }
    return result;
  };
  try { const result = await runGithubUnattended(f); assert.equal(result.status, 'waiting-human', result.reason); }
  finally { await rm(f.root, { recursive: true, force: true }); }
});

test('pending human answer/review blocks native admission without launching an engine', async () => {
  for (const label of ['needs-info', 'waiting-review']) {
    const f = await fixture(); f.labels.push(label);
    try { await assert.rejects(runGithubUnattended(f), /paused/); assert.equal(f.executions.length, 0); }
    finally { await rm(f.root, { recursive: true, force: true }); }
  }
});

test('human attention added during a run stops continuation and releases its reservation', async () => {
  const f = await fixture(), execute = f.execute;
  f.execute = async options => { const result = await execute(options); if (f.executions.length === 2) f.labels.push('needs-info'); return result; };
  try {
    const outcome = await runGithubUnattended(f);
    assert.equal(outcome.status, 'blocked'); assert.equal(f.executions.length, 2);
    assert.equal(f.writes.filter(w => w.path === 'pulls').length, 0);
    assert.ok(!f.labels.includes('agent-working'));
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('a hotfix model cannot substitute its own regression command', async () => {
  const f = await fixture(), execute = f.execute;
  f.execute = async options => {
    const result = await execute(options);
    if (options.request.stage === 'triage') result.envelope.result.output.hotfix.command = ['node', '-e', 'process.exit(1)'];
    return result;
  };
  try {
    const outcome = await runGithubUnattended(f);
    assert.equal(outcome.status, 'blocked'); assert.match(outcome.reason, /owner-declared/);
    assert.equal(f.executions.length, 1);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('an untouched blocked reviewer template cannot authorize implementation', async () => {
  const f = await fixture(), execute = f.execute;
  f.execute = async options => {
    const result = await execute(options);
    if (options.request.worker === 'independent-review') {
      result.envelope.result.status = 'blocked';
      result.envelope.result.output = {};
      result.envelope.result.missingEvidence = ['Independent reviewer must complete the assessment'];
    }
    return result;
  };
  try {
    const outcome = await runGithubUnattended(f);
    assert.equal(outcome.status, 'blocked');
    assert.match(outcome.reason, /invalid or stale findings/);
    assert.ok(!f.executions.some(value => value.request.stage === 'implement'));
    assert.ok(!f.writes.some(value => value.path === 'pulls'));
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('provider deadline is checked before any process starts', async () => {
  const controller = new AbortController(); controller.abort();
  const provider = boundedOpenSpecProvider({ root: tmpdir(), deadline: Date.now() + 1000, signal: controller.signal });
  await assert.rejects(provider(tmpdir(), ['status']), /deadline/);
});


test('a real child startup failure retains its precise diagnostic without starting Docker', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-engine-failure-'));
  const config = join(root, 'engine.json');
  await writeFile(config, JSON.stringify({ image: 'invalid' }));
  const request = { runId: 'f'.repeat(64), issue: 1, stage: 'triage', worker: 'triage', sourceRevision: 'a'.repeat(40) };
  try {
    await assert.rejects(executeUnattendedStage({ root, request, source: new Map(), context: stageContext(request, {}), prompt: 'Do not execute',
      env: { PATH: process.env.PATH, HOME: root, LIGHTHOUSE_ENGINE_CONFIG: config, GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' } }), /triage: Invalid operator engine configuration/);
    const failure = JSON.parse(await readFile(join(root, request.runId, 'tmp/lighthouse-123-1/engine-error.json'), 'utf8'));
    assert.equal(failure.message, 'Invalid operator engine configuration');
  } finally { await rm(root, { recursive: true, force: true }); }
});


test('delegated integration honors owner draft holds and new PR feedback before promotion or merge', async () => {
  const pr = { number: 3, head: { sha: 'b'.repeat(40) } };
  await assert.rejects(assertUnattendedPullRequest(async () => [], [{ user: { login: 'github-actions[bot]' }, body: '<!-- lighthouse-pr-hold:3:' + pr.head.sha + ' -->' }], pr, 'owner'), /on hold/);
  for (const [path, value, pattern] of [
    ['timeline', [{ event: 'converted_to_draft', actor: { login: 'owner' } }], /converted.*draft/],
    ['reviews', [{ user: { login: 'owner' }, state: 'CHANGES_REQUESTED', commit_id: pr.head.sha }], /feedback/],
    ['comments', [{ user: { login: 'owner' }, body: 'Please fix the boundary before merging' }], /feedback/],
  ]) {
    const api = async url => url.includes('/' + path + '?') ? value : [];
    await assert.rejects(assertUnattendedPullRequest(api, [], pr, 'owner'), pattern);
  }
  const approved = async url => url.includes('/reviews?') ? [{ user: { login: 'owner' }, state: 'APPROVED', commit_id: pr.head.sha }] : [];
  await assertUnattendedPullRequest(approved, [], pr, 'owner');
});


test('the native host integrates with concurrent readiness and retains its merge bundle before post-merge dispatch', async t => {
  for (const interrupt of [null, 'pause', 'cancel', 'pause-before-publication', 'cancel-before-publication', 'post-merge-dispatch-error', 'post-merge-notification-error', 'post-merge-dispatch-and-notification-error']) await t.test(interrupt ?? 'success', async t => {
  const f = await fixture(); f.policy.merge = true;
  const originalApi = f.api, events = [];
  const revision = execFileSync('git', ['-C', f.env.LIGHTHOUSE_SOURCE_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const merged = 'c'.repeat(40), evidence = 'd'.repeat(40);
  const profile = { schemaVersion: 1, profileVersion: 1, repository: 'owner/repo', intake: 'collaborators', requiredChecks: [{ context: 'repository', integrationId: 7 }], requiredApprovals: 0,
    evidenceBranch: 'process/data', completion: { publishEvidence: true, postMergeWorkflows: ['verify.yml'] } };
  let pr = null, integrated = false, promotionCalls = 0, inspections = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    promotionCalls++; pr.draft = false; pr.mergeable_state = 'clean';
    // Existing CI reconciliation completed the same transition just before this mutation.
    return { ok: true, json: async () => ({ errors: [{ message: 'Already ready for review' }] }) };
  });
  f.api = async (path, method = 'GET', body) => {
    events.push({ path, method, body }); if (path.startsWith('contents/lighthouse.json?ref=')) return null;
    if (integrated && path === 'issues/1/comments' && method === 'POST' && interrupt?.includes('notification')) throw Error('Notifications unavailable');
    if (path === 'commits/main') return { sha: integrated ? merged : revision };
    if (path.startsWith('contents/.lighthouse/github.json')) return { content: Buffer.from(JSON.stringify(profile)).toString('base64') };
    if (path.startsWith('rules/branches/process')) return ['deletion', 'non_fast_forward'].map(type => ({ type, ruleset_source_type: 'Repository', ruleset_id: 1 }));
    if (path === 'rulesets/1') return { enforcement: 'active', bypass_actors: [] };
    if (path.startsWith('rules/branches/main')) return [{ type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'repository', integration_id: 7 }] } }];
    if (path === 'branches/main') return { protection: { enabled: false } };
    if (path.startsWith('actions/runs/123/jobs')) return { jobs: [{ check_run_url: 'https://api.github.com/repos/owner/repo/check-runs/99' }] };
    if (path.includes('/check-runs?')) return { check_runs: [{ id: 1, name: 'repository', head_sha: 'b'.repeat(40), app: { id: 7 }, status: 'completed', conclusion: 'success' }] };
    if (path.includes('/statuses')) return [];
    if (path.startsWith('pulls/3/files')) {
      // Arrive during the last observation, after its issue/authority read and before the merge effect.
      if (++inspections === 3 && interrupt === 'pause') f.labels.push('human-working');
      if (inspections === 3 && interrupt === 'cancel') process.emit('SIGTERM');
      return ['src/feature/rule.mjs', 'tests/edge.test.mjs'].map(filename => ({ filename, sha: 'b'.repeat(40), status: 'modified' }));
    }
    if (path === 'pulls' && method === 'POST') {
      pr = await originalApi(path, method, body);
      Object.assign(pr, { title: body.title, body: body.body, draft: true, changed_files: 2, node_id: 'fixture-pr', mergeable: true, mergeable_state: 'draft',
        base: { ref: 'main', sha: f.revision, repo: { full_name: 'owner/repo' } } });
      pr.head.repo = { full_name: 'owner/repo' }; return pr;
    }
    if (path === 'pulls/3/merge' && method === 'PUT') {
      assert.equal(pr.draft, false); assert.equal(body.sha, pr.head.sha);
      integrated = true; pr.merged = true; pr.state = 'closed'; pr.merge_commit_sha = merged;
      return { merged: true, sha: merged };
    }
    if (path === 'git/ref/heads/process/data') return { object: { sha: evidence } };
    if (path.startsWith('git/trees/' + evidence)) return { sha: evidence, truncated: false, tree: [] };
    if (path === 'git/refs/heads/process/data' && method === 'PATCH') return null;
    if (path.startsWith('actions/workflows/verify.yml/runs')) return { workflow_runs: [] };
    if (path === 'actions/workflows/verify.yml/dispatches' && method === 'POST') {
      if (body.ref === 'main' && interrupt?.includes('dispatch')) throw Error('Post-merge CI unavailable');
      return null;
    }
    const response = await originalApi(path, method, body);
    if (path === 'git/refs' && method === 'POST' && interrupt === 'pause-before-publication') f.labels.push('human-working');
    if (path === 'git/refs' && method === 'POST' && interrupt === 'cancel-before-publication') process.emit('SIGTERM');
    return response;
  };
  try {
    const result = await runGithubUnattended(f);
    if (interrupt?.startsWith('pause') || interrupt?.startsWith('cancel')) {
      assert.equal(result.status, 'blocked', 'A late ' + interrupt + ' must stop the merge');
      assert.equal(integrated, false); assert.equal(events.filter(e => e.method === 'PUT').length, 0);
      if (interrupt.endsWith('before-publication')) assert.equal(events.filter(e => e.path === 'pulls' && e.method === 'POST').length, 0);
      return;
    }
    assert.equal(result.status, 'passed', result.reason); assert.equal(result.integrated.sha, merged);
    if (interrupt?.includes('dispatch')) {
      assert.equal(result.integrated.postMerge[0].status, 'unavailable');
      assert.match(result.integrated.postMerge[0].reason, /CI unavailable/);
    }
    if (interrupt?.includes('notification')) {
      assert.ok(result.integrated.notifications.length > 0);
      assert.match(result.integrated.notifications[0].reason, /Notifications unavailable/);
    }
    assert.equal(promotionCalls, 1); assert.equal(events.filter(e => e.method === 'PUT').length, 1);
    const bundle = events.findIndex(e => e.path === 'git/refs/heads/process/data' && e.method === 'PATCH');
    const postMerge = events.findIndex(e => e.path === 'actions/workflows/verify.yml/dispatches' && e.body.ref === 'main');
    assert.ok(bundle > 0 && postMerge > bundle);
    assert.ok(!f.labels.includes('agent-working'));
    if (!interrupt?.includes('notification')) {
      const pending = f.comments.find(comment => comment.body.includes('<!-- lighthouse-pending-review:'));
      assert.ok(pending, 'Delegated integration must retain its final-review continuation');
      assert.match(pending.body, /Final review: pending/);
      assert.match(pending.body, /"run":"123"/);
      assert.match(pending.body, new RegExp(merged));
    }
  } finally { await rm(f.root, { recursive: true, force: true }); }
  });
});

test('an unattended stop never clears a newer execution reservation or overwrites its handoff', async () => {
  const f = await fixture(), execute = f.execute;
  f.execute = async options => {
    const result = await execute(options);
    if (options.request.worker === 'independent-review') {
      f.comments.push({ id: f.comments.length + 1, user: { login: 'github-actions[bot]', type: 'Bot' }, body: '<!-- lighthouse-dispatch:{"newer":true} -->' });
      result.envelope.result.status = 'blocked';
      result.envelope.result.missingEvidence = ['New blocker'];
      result.envelope.result.output.review = { binding: options.context.review.binding, verdict: 'request-changes', findings: ['The plan needs a decision.'] };
    }
    return result;
  };
  try {
    const result = await runGithubUnattended(f);
    assert.equal(result.status, 'blocked');
    assert.ok(f.labels.includes('agent-working'));
    assert.match(f.comments.at(-1).body, /lighthouse-dispatch/);
    assert.equal(f.writes.some(w => w.path === 'issues/1/labels/agent-working' && w.method === 'DELETE'), false);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('a human hold preserves an uncertain execution reservation and names the recovery action', async () => {
  const f = await fixture(), execute = f.execute;
  f.execute = async options => {
    const result = await execute(options);
    if (options.request.worker === 'independent-review') {
      f.labels.push('human-working');
      result.envelope.result.status = 'blocked';
      result.envelope.result.missingEvidence = ['Owner hold'];
      result.envelope.result.output.review = { binding: options.context.review.binding, verdict: 'request-changes', findings: ['Owner intervention is needed.'] };
    }
    return result;
  };
  try {
    const result = await runGithubUnattended(f);
    assert.equal(result.status, 'blocked');
    assert.ok(f.labels.includes('agent-working'));
    assert.match(f.comments.at(-1).body, /human hold and existing execution reservation/);
    assert.doesNotMatch(f.comments.at(-1).body, /Ready for your review/);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('an unattended product question is actionable and its answer survives an authorized retry', async () => {
  const f = await fixture(), execute = f.execute, question = 'Who can enable the option?';
  let first = true, observedAnswer = false;
  f.execute = async options => {
    const result = await execute(options);
    if (first && options.request.stage === 'triage') {
      result.envelope.result.status = 'blocked';
      result.envelope.result.output.handoff = { question };
      result.envelope.effect.body = 'The product decision is missing.';
    }
    if (!first && options.request.stage === 'triage') observedAnswer = options.context.issue.ownerAnswers.some(answer => answer.body === 'The repository owner.');
    return result;
  };
  try {
    const stopped = await runGithubUnattended(f);
    assert.equal(stopped.status, 'blocked');
    assert.ok(f.labels.includes('needs-info'));
    assert.match(f.comments.at(-1).body, /Owner: Who can enable the option\? Reply here\./);
    assert.match(f.comments.at(-1).body, /reply does not approve another gate/);
    const last = f.writes.findLastIndex(w => w.path === 'issues/1/comments' && w.body.body.includes('Waiting for your answer'));
    const label = f.writes.findLastIndex(w => w.path === 'issues/1/labels' && w.body.labels.includes('needs-info'));
    assert.ok(label >= 0 && label < last);
    f.comments.push({ id: f.comments.length + 1, user: { login: 'owner', type: 'User' }, body: 'The repository owner.', updated_at: '2026-10-31T12:00:00Z' });
    f.labels.splice(f.labels.indexOf('needs-info'), 1);
    first = false;
    const oldApi = f.api;
    f.api = (path, ...args) => oldApi(path === 'actions/runs/124' ? 'actions/runs/123' : path, ...args);
    f.env.GITHUB_RUN_ID = '124';
    const retried = await runGithubUnattended(f);
    assert.equal(retried.status, 'waiting-human', retried.reason);
    assert.equal(observedAnswer, true);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('missing admitted checks and stale reviewer bindings stop before candidate publication', async t => {
  for (const scenario of ['missing-check', 'stale-review']) await t.test(scenario, async () => {
    const f = await fixture(), execute = f.execute;
    f.execute = async options => {
      const result = await execute(options);
      if (scenario === 'missing-check' && options.request.stage === 'implement' && result.envelope.result.status === 'passed') result.receipt.checks.pop();
      if (scenario === 'stale-review' && options.context.review?.purpose === 'candidate') result.envelope.result.output.review.binding = 'a'.repeat(64);
      return result;
    };
    try {
      const result = await runGithubUnattended(f);
      assert.equal(result.status, 'blocked');
      assert.match(result.reason, scenario === 'missing-check' ? /check inventory/ : /stale findings/);
      assert.ok(!f.writes.some(write => write.path === 'pulls'));
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
});

test('an old unattended installation must declare verification inputs before executing', async () => {
  const f = await fixture(), api = f.api;
  f.api = async (...args) => {
    const result = await api(...args);
    if (args[0].startsWith('contents/.lighthouse/implement.json')) {
      const configuration = JSON.parse(Buffer.from(result.content, 'base64').toString());
      delete configuration.defaults.verification;
      result.content = Buffer.from(JSON.stringify(configuration)).toString('base64');
    }
    return result;
  };
  try {
    await assert.rejects(runGithubUnattended(f), /requires declared verification inputs/);
    assert.equal(f.executions.length, 0);
    assert.equal(f.writes.length, 0);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('RED prerequisite stops retain the concrete unavailable check or human decision without repair or publication', async t => {
  for (const [field, reason] of [['unavailableChecks', 'Required isolated service receipt is unavailable'], ['pendingReview', 'Maintainer must decide the target retention policy']]) await t.test(field, async () => {
    const f = await fixture(), execute = f.execute;
    f.execute = async options => {
      const result = await execute(options);
      if (options.context.hotfix) { result.envelope.result.status = 'blocked'; result.envelope.result[field] = [reason]; }
      return result;
    };
    try {
      const result = await runGithubUnattended(f);
      assert.equal(result.status, 'blocked');
      assert.ok(result.reason.includes(reason), result.reason);
      assert.deepEqual(f.executions.map(e => e.request.stage), ['triage', 'integrate', 'implement']);
      assert.equal(f.writes.filter(w => w.path === 'pulls').length, 0);
      assert.ok(!f.labels.includes('agent-working'));
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
});
