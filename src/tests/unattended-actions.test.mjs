import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runGithubUnattended } from '../packages/sdlc/src/unattended-actions.mjs';
import { applyCandidate, stageContext, boundedOpenSpecProvider, executeUnattendedStage } from '../packages/sdlc/src/unattended-runtime.mjs';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-native-adapter-')), sourceRoot = join(root, 'source');
  await mkdir(join(sourceRoot, 'src/feature'), { recursive: true });
  await writeFile(join(sourceRoot, 'src/feature/rule.mjs'), 'export const eligible = value => value > 2;\n');
  const git = args => execFileSync('git', ['-C', sourceRoot, '-c', 'core.hooksPath=/dev/null', ...args], { encoding: 'utf8', stdio: 'pipe',
    env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@localhost', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@localhost' } });
  git(['init', '--template=', '--initial-branch=main']); git(['add', '.']); git(['commit', '-m', 'Fixture']);
  const revision = git(['rev-parse', 'HEAD']).trim(), eventPath = join(root, 'event.json'), configPath = join(root, 'engine.json');
  await writeFile(eventPath, JSON.stringify({ inputs: { issue: '1', route: 'hotfix' } }));
  await writeFile(configPath, JSON.stringify({ modelProfiles: { schemaVersion: 1, enabled: true, defaultProfile: 'build', profiles: {
    build: { model: 'openai/implementation', reasoningEffort: 'medium' }, plan: { model: 'openai/reviewer', reasoningEffort: 'high' },
  } }, modelCapabilities: {
    'openai/implementation': { available: true, tools: true, reasoningEfforts: ['medium'] },
    'openai/reviewer': { available: true, tools: true, reasoningEfforts: ['high'] },
  } }));
  const policy = { schemaVersion: 1, enabled: true, routes: ['hotfix'], paths: ['src/feature/', 'tests/'], reviewerProfile: 'plan', allowFivePoint: false,
    merge: false, maxCorrections: 1, timeoutSeconds: 60, hotfix: { modules: { feature: ['src/feature/', 'tests/'] },
      setupCommands: [], testPaths: ['tests/'], regressionCommand: ['node', '--test', 'tests/edge.test.mjs'], failurePattern: ['ERR_ASSERTION'] } };
  const eligibility = { points: 1, risk: 'low', reversible: true, dependenciesResolved: true, scopeKnown: true, productChangeNeeded: false,
    humanDecisionRequired: false, reason: 'An isolated boundary and known assertion', confirmedDefect: true, rollback: 'Revert the correction' };
  const plan = { command: policy.hotfix.regressionCommand, assertion: 'Expected inclusive boundary', estimatedProductionLines: 2, rootCause: 'Strict comparison excludes equality',
    plannedFiles: ['src/feature/rule.mjs', 'tests/edge.test.mjs'] };
  const comments = [], labels = [], executions = [], writes = [];
  const issue = () => ({ number: 1, state: 'open', title: 'Correct the inclusive boundary', body: 'Values equal to 2 must be eligible.', user: { login: 'owner' }, labels: labels.map(name => ({ name })) });
  const encode = value => ({ content: Buffer.from(JSON.stringify(value)).toString('base64') });
  const api = async (path, method = 'GET', body) => {
    if (method !== 'GET') writes.push({ path, method, body });
    if (path === '') return { default_branch: 'main' };
    if (path === 'commits/main') return { sha: revision };
    if (path === 'actions/runs/123') return { event: 'workflow_dispatch', actor: { login: 'owner' }, triggering_actor: { login: 'owner' },
      repository: { full_name: 'owner/repo' }, head_sha: revision, head_branch: 'main', path: '.github/workflows/lighthouse-sdlc-unattended.yml', run_attempt: 1 };
    if (path.startsWith('contents/.lighthouse/unattended.json')) return encode(policy);
    if (path.startsWith('contents/.lighthouse/implement.json')) return encode({ defaults: { scope: 'The isolated issue', paths: ['src/feature/', 'tests/'],
      checks: [['node', '--test', 'tests/edge.test.mjs']], reviewRequired: false } });
    if (path.startsWith('contents/.lighthouse/')) return null;
    if (path === 'issues/1') return issue();
    if (path.startsWith('issues/1/comments')) {
      if (method === 'POST') { const result = { id: comments.length + 1, user: { login: 'github-actions[bot]' }, body: body.body }; comments.push(result); return result; }
      return comments;
    }
    if (path === 'issues/1/labels' && method === 'POST') { labels.push(...body.labels); return []; }
    if (path === 'issues/1/labels/agent-working' && method === 'DELETE') { labels.splice(labels.indexOf('agent-working'), 1); return null; }
    if (path.startsWith('pulls?state=open')) return [];
    if (path === 'git/commits/' + revision) return { tree: { sha: 'tree' } };
    if (path === 'git/blobs' || path === 'git/trees' || path === 'git/commits') return { sha: 'b'.repeat(40) };
    if (path === 'git/refs') return { object: { sha: 'b'.repeat(40) } };
    if (path === 'pulls' && method === 'POST') return { number: 3, html_url: 'https://github.com/owner/repo/pull/3', head: { sha: 'b'.repeat(40), ref: body.head } };
    throw Error('Unexpected fixture API: ' + method + ' ' + path);
  };
  const execute = async options => {
    executions.push(options);
    const envelope = stageContext(options.request, issue()).contract.envelope;
    let changes = [], receipt = null;
    if (options.request.stage === 'triage') envelope.result.output = { eligibility, hotfix: plan };
    else if (options.request.worker === 'independent-review') {
      if (options.context.review.purpose === 'candidate') {
        assert.match(options.context.review.details.red.receipt.checks.find(c => c.exitCode !== 0).log, /ERR_ASSERTION/);
        assert.ok(options.context.review.details.red.tests['tests/edge.test.mjs']);
        assert.match(Buffer.from(options.context.review.details.originalFiles['src/feature/rule.mjs'], 'base64').toString(), /value > 2/);
      }
      envelope.result.output.review = { binding: options.context.review.binding, verdict: 'accept', findings: [] };
    } else if (!options.source.has('tests/edge.test.mjs')) {
      changes = [{ path: 'tests/edge.test.mjs', mode: '100644', content: Buffer.from('assert.equal(eligible(2), true);\n').toString('base64') }];
      receipt = { checks: [{ command: plan.command, exitCode: 1, log: 'ERR_ASSERTION: Expected inclusive boundary', execution: { status: 'failed', exitCode: 1, signal: null } }] };
      envelope.result.status = 'blocked';
      envelope.result.output.eligibility = eligibility;
    } else {
      changes = [{ path: 'src/feature/rule.mjs', mode: '100644', content: Buffer.from('export const eligible = value => value >= 2;\n').toString('base64') }];
      receipt = { checks: options.request.implementation.policy.checks.map(command => ({ command, exitCode: 0, log: 'passed', execution: { status: 'passed', exitCode: 0, signal: null } })) };
      envelope.result.output.eligibility = eligibility;
    }
    return { request: options.request, envelope, receipt, changes, source: applyCandidate(options.source, changes), runtime: {
      model: options.request.worker === 'independent-review' ? 'openai/reviewer' : 'openai/implementation',
      modelExecution: { providerReported: { status: 'unverified' } }, execution: { status: 'passed' },
    } };
  };
  const env = { ...process.env, GITHUB_EVENT_PATH: eventPath, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_ACTOR: 'owner', GITHUB_TRIGGERING_ACTOR: 'owner',
    GITHUB_REPOSITORY: 'owner/repo', GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1',
    LIGHTHOUSE_SOURCE_ROOT: sourceRoot, LIGHTHOUSE_ENGINE_CONFIG: configPath, RUNNER_TEMP: root };
  return { root, api, env, execute, executions, writes, labels, comments, policy };
}

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
