import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { implementationPrProof, reconcileImplementationPr } from '../packages/sdlc/src/pr-state.mjs';
import { runGithubUnattended, assertUnattendedPullRequest } from '../packages/sdlc/src/unattended-actions.mjs';
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
  let publishedPr = null;
  const issue = () => ({ number: 1, state: 'open', title: 'Correct the inclusive boundary', body: 'Values equal to 2 must be eligible.', html_url: 'https://github.com/owner/repo/issues/1', user: { login: 'owner' }, labels: labels.map(name => ({ name })) });
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
      if (method === 'POST') { const result = { id: comments.length + 1, user: { login: 'github-actions[bot]', type: 'Bot' }, body: body.body }; comments.push(result); return result; }
      return comments;
    }
    if (path === 'issues/1/labels' && method === 'POST') { labels.push(...body.labels); return []; }
    if (path.startsWith('issues/1/labels/') && method === 'DELETE') { const label = path.slice('issues/1/labels/'.length), index = labels.indexOf(label); if (index >= 0) labels.splice(index, 1); return null; }
    if (path.startsWith('pulls?state=open')) return [];
    if (path === 'git/commits/' + revision) return { tree: { sha: 'tree' } };
    if (path === 'git/blobs' || path === 'git/trees' || path === 'git/commits') return { sha: 'b'.repeat(40) };
    if (path === 'git/refs') return { object: { sha: 'b'.repeat(40) } };
    if (path === 'pulls' && method === 'POST') return publishedPr = { number: 3, state: 'open', html_url: 'https://github.com/owner/repo/pull/3', head: { sha: 'b'.repeat(40), ref: body.head } };
    if (path === 'pulls/3') return publishedPr;
    if (path.startsWith('issues/3/') || path.startsWith('pulls/3/')) return [];
    throw Error('Unexpected fixture API: ' + method + ' ' + path);
  };
  const execute = async options => {
    executions.push(options);
    const envelope = stageContext(options.request, issue()).contract.envelope;
    let changes = [], receipt = null;
    if (options.request.stage === 'triage') envelope.result.output = { eligibility, hotfix: plan };
    else if (options.request.worker === 'independent-review') {
      if (options.context.review.purpose === 'candidate') {
        assert.deepEqual(options.context.review.details.scope, { implementationPaths: policy.paths, planningRoots: [] });
        assert.match(options.prompt, /findings as an array of plain strings/);
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
    events.push({ path, method, body });
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
        base: { ref: 'main', repo: { full_name: 'owner/repo' } } });
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
  } finally { await rm(f.root, { recursive: true, force: true }); }
  });
});
