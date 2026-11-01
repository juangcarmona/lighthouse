import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateUnattendedPolicy, admitUnattended, hotfixScope, regressionPlan, assertRegression, assertIndependentReview, runUnattended, unattendedDigest, verifyUnattendedIntegration } from '../packages/sdlc/src/unattended.mjs';
import { candidateInventory, stageContext, applyCandidate } from '../packages/sdlc/src/unattended-runtime.mjs';
import { validateStageEnvelope } from '../packages/sdlc/src/host-contract.mjs';
import { runGithubUnattended } from '../packages/sdlc/src/unattended-actions.mjs';
import { executionReceipt } from '../packages/sdlc/src/execution-resources.mjs';
import { loadImplementation } from '../packages/sdlc/src/implementation.mjs';

const policy = () => ({ schemaVersion: 1, enabled: true, routes: ['ff', 'hotfix'], paths: ['src/feature/', 'tests/'], reviewerProfile: 'plan',
  allowFivePoint: false, merge: true, maxCorrections: 2, timeoutSeconds: 60,
  hotfix: { setupCommands: [], regressionCommand: ['node', '--test', 'tests/edge.test.mjs'], failurePattern: ['Expected inclusive boundary'], testPaths: ['tests/'], modules: { feature: ['src/feature/', 'tests/'] } } });
const eligible = () => ({ points: 2, risk: 'low', reversible: true, dependenciesResolved: true, scopeKnown: true, productChangeNeeded: false, humanDecisionRequired: false, reason: 'Known reversible behavior with a focused assertion', confirmedDefect: true, rollback: 'Revert the isolated commit' });
const plan = () => ({ command: ['node', '--test', 'tests/edge.test.mjs'], assertion: 'Expected inclusive boundary', estimatedProductionLines: 2, rootCause: 'Strict comparison excludes the boundary', plannedFiles: ['src/feature/rule.mjs', 'tests/edge.test.mjs'] });
const check = (exitCode = 0, log = '') => ({ checks: [{ command: plan().command, exitCode, log, execution: { status: exitCode ? 'failed' : 'passed', exitCode, signal: null } }] });
const file = (path = 'src/feature/rule.mjs', additions = 1, deletions = 1) => ({ path, additions, deletions, binary: false });

test('fast-forward admission distinguishes points, risk and explicit five-point opt-in', () => {
  const p = policy();
  for (const points of [1, 2, 3]) assert.equal(admitUnattended({ ...eligible(), points }, p, 'ff'), true);
  for (const points of [0, 5, 8, 'small']) assert.throws(() => admitUnattended({ ...eligible(), points }, p, 'ff'));
  assert.equal(admitUnattended({ ...eligible(), points: 5 }, { ...p, allowFivePoint: true }, 'ff'), true);
  for (const change of [{ risk: 'high' }, { reversible: false }, { dependenciesResolved: false }, { productChangeNeeded: true }, { humanDecisionRequired: true }]) {
    assert.throws(() => admitUnattended({ ...eligible(), ...change }, p, 'ff'));
  }
  for (const change of [{ enabled: false }, { paths: ['*'] }, { paths: ['.github/'] }, { paths: ['docs/product/model/'] }, { maxCorrections: 99 }, { timeoutSeconds: 0 }]) {
    assert.throws(() => validateUnattendedPolicy({ ...p, ...change }, 'ff'));
  }
});

test('hotfix counts complete production churn while retaining test file/module limits', () => {
  const p = policy();
  const scope = hotfixScope([file(undefined, 50, 50), file('tests/edge.test.mjs', 200, 20)], p);
  assert.equal(scope.productionLines, 100); assert.equal(scope.files, 2);
  assert.deepEqual(scope.modules, ['feature']);
  assert.throws(() => hotfixScope([file(undefined, 51, 50)], p), /100 production/);
  assert.throws(() => hotfixScope(Array.from({ length: 11 }, (_, i) => file('tests/' + i)), p), /10 changed/);
  assert.throws(() => hotfixScope([{ ...file(), binary: true }], p), /unassessed/);
  assert.throws(() => hotfixScope([file('src/other/rule.mjs')], p), /out-of-scope/);
  const ambiguous = policy(); ambiguous.hotfix.modules.second = ['src/feature/'];
  assert.throws(() => hotfixScope([file()], ambiguous), /exactly one/);
  const many = policy(); many.paths.push('extra/'); many.hotfix.modules = { a: ['src/feature/'], b: ['tests/'], c: ['extra/'] };
  assert.throws(() => hotfixScope([file(), file('tests/a'), file('extra/a')], many), /two modules/);
  assert.throws(() => admitUnattended({ ...eligible(), confirmedDefect: false }, p, 'hotfix'), /confirmed/);
});

test('RED/GREEN receipts require the named assertion and executed command', () => {
  const p = regressionPlan(plan());
  assertRegression(check(1, 'AssertionError: Expected inclusive boundary'), p, 'red');
  assertRegression(check(), p, 'green');
  assert.throws(() => assertRegression(check(1, 'Cannot find module'), p, 'red'), /behavioral assertion/);
  assert.throws(() => assertRegression(check(), p, 'red'), /RED/);
  assert.throws(() => assertRegression(check(1), p, 'green'), /GREEN/);
  assert.throws(() => assertRegression(check(124, p.assertion), p, 'red'), /RED/);
  assert.throws(() => regressionPlan({ ...p, estimatedProductionLines: 101 }), /bounded/);
  assert.throws(() => regressionPlan({ ...p, command: ['node', 'bad\ncommand'] }), /bounded/);
});

test('interrupted assertion output never establishes RED', async () => {
  for (const reason of ['timeout', 'cancelled', 'out-of-memory', 'process-limit', 'aborted']) {
    const receipt = check(1, plan().assertion);
    receipt.checks[0].execution = await executionReceipt('/nonexistent/command-receipt', { code: null, signal: 'SIGTERM' }, reason);
    assert.throws(() => assertRegression(receipt, plan(), 'red'), /RED/);
  }
  const genuine = check(1, plan().assertion);
  genuine.checks[0].execution = await executionReceipt('/nonexistent/command-receipt', { code: 1, signal: null });
  assertRegression(genuine, plan(), 'red');
});

test('unattended implementation keeps its assessment identity and rejects invented gates', () => {
  const request = { stage: 'implement', runId: 'a'.repeat(64) };
  const context = stageContext(request, {}), envelope = context.contract.envelope;
  assert.equal(envelope.result.gate, 'done');
  assert.deepEqual(validateStageEnvelope(envelope, request), []);
  assert.ok(validateStageEnvelope({ ...envelope, result: { ...envelope.result, gate: 'pending-review' } }, request).length);
  assert.match(context.contract.rules, /Copy result\.runId, result\.stage and result\.gate exactly/);
});

test('independent review binds separate execution and model to the candidate', () => {
  const result = stageContext({ stage: 'integrate', runId: 'review' }, {}).contract.envelope.result;
  result.output.review = { binding: 'candidate', verdict: 'accept', findings: [] };
  const author = { runId: 'author', model: 'openai/author' }, reviewer = { runId: 'review', model: 'openai/reviewer' };
  assertIndependentReview(result, 'candidate', author, reviewer);
  assert.throws(() => assertIndependentReview(result, 'changed', author, reviewer), /stale/);
  assert.throws(() => assertIndependentReview(result, 'candidate', author, { ...reviewer, model: author.model }), /distinct/);
  assert.throws(() => assertIndependentReview(result, 'candidate', author, { ...reviewer, runId: author.runId }), /separate/);
  result.pendingReview.push('Product decision required');
  assert.throws(() => assertIndependentReview(result, 'candidate', author, reviewer), /blocked/);
});

function fixture(overrides = {}) {
  const events = [];
  const host = {
    recheck: async () => { events.push('recheck'); },
    refine: async () => ({ eligibility: eligible(), hotfix: plan() }),
    propose: async () => ({ files: [] }),
    reviewPlan: async () => { events.push('review-plan'); },
    reproduce: async () => ({ files: [file('tests/edge.test.mjs')], tests: { edge: 'original assertion' }, receipt: check(1, plan().assertion) }),
    implement: async () => ({ eligibility: eligible(), files: [file(), file('tests/edge.test.mjs')], tests: { edge: 'original assertion' }, receipt: check() }),
    reviewCandidate: async () => { events.push('review-candidate'); return { accepted: true }; },
    publish: async () => { events.push('publish'); return { number: 1 }; },
    integrate: async () => { events.push('integrate'); return { state: 'merged', sha: 'verified-merge' }; },
    stop: async reason => { events.push('stop:' + reason); },
    ...overrides,
  };
  return { host, events };
}

test('both compositions complete through current independent evidence and delegated integration', async () => {
  for (const route of ['ff', 'hotfix']) {
    const { host, events } = fixture();
    const outcome = await runUnattended({ route, policy: policy(), host });
    assert.equal(outcome.status, 'passed'); assert.equal(outcome.integrated.state, 'merged');
    assert.ok(events.indexOf('review-candidate') < events.indexOf('publish'));
    assert.ok(events.indexOf('publish') < events.indexOf('integrate'));
  }
});

test('lack of merge delegation publishes the candidate and retains the human decision', async () => {
  const { host, events } = fixture();
  const outcome = await runUnattended({ route: 'ff', policy: { ...policy(), merge: false }, host });
  assert.equal(outcome.status, 'waiting-human'); assert.ok(events.includes('publish')); assert.ok(!events.includes('integrate'));
});

test('bounded correction permits repair, then requires fresh review', async () => {
  let repairs = 0, reviews = 0;
  const { host } = fixture({
    implement: async ({ previous, round }) => {
      repairs++; if (round) assert.ok(previous.feedback.length);
      return { eligibility: eligible(), receipt: check() };
    },
    reviewCandidate: async () => ++reviews === 1 ? { accepted: false, verdict: 'request-changes', findings: ['Boundary still excludes the equality case'] } : { accepted: true },
  });
  assert.equal((await runUnattended({ route: 'ff', policy: policy(), host })).status, 'passed');
  assert.equal(repairs, 2); assert.equal(reviews, 2);
});

test('failed host checks can be repaired but cannot be overridden by review', async () => {
  let attempts = 0, reviews = 0;
  const { host } = fixture({
    implement: async () => ({ eligibility: eligible(), receipt: check(++attempts === 1 ? 1 : 0) }),
    reviewCandidate: async () => { reviews++; return { accepted: true }; },
  });
  assert.equal((await runUnattended({ route: 'ff', policy: policy(), host })).status, 'passed');
  assert.equal(attempts, 2); assert.equal(reviews, 1);
});

test('exhausted reviews, changed authority and altered regression assertions stop publication', async () => {
  const cases = [
    { reviewCandidate: async () => ({ accepted: false, verdict: 'request-changes', findings: ['Still incorrect'] }) },
    { reviewCandidate: async () => { throw Error('Authorization revoked'); } },
    { implement: async () => ({ eligibility: eligible(), files: [file()], tests: { edge: 'weakened assertion' }, receipt: check() }) },
    { reproduce: async () => ({ files: [file()], tests: {}, receipt: check(1, plan().assertion) }) },
  ];
  for (const overrides of cases) {
    const { host, events } = fixture(overrides);
    const result = await runUnattended({ route: 'hotfix', policy: policy(), host });
    assert.equal(result.status, 'blocked'); assert.ok(!events.includes('publish')); assert.ok(!events.includes('integrate'));
  }
});

test('cancellation preserves a blocked assessment before any effect', async () => {
  const controller = new AbortController(); controller.abort();
  const { host, events } = fixture();
  const result = await runUnattended({ route: 'ff', policy: policy(), host, signal: controller.signal });
  assert.equal(result.status, 'blocked'); assert.ok(!events.includes('publish'));
});

test('actual diff measurement includes deletions and exposes ineffective regression tests', async () => {
  const before = new Map([['src/feature/rule.mjs', { content: Buffer.from('export const rule = x => x > 2;\n'), mode: '100644' }]]);
  const change = { path: 'src/feature/rule.mjs', mode: '100644', content: Buffer.from('export const rule = x => x >= 2;\n').toString('base64') };
  const after = applyCandidate(before, [change]);
  const actual = await candidateInventory(before, after, { paths: ['src/feature/'] });
  assert.deepEqual(actual.files, [file()]);
  // The same real behavioral assertion exposes RED on the original source and GREEN on the repair.
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-hotfix-proof-'));
  try {
    for (const [source, expected] of [[before, 1], [after, 0]]) {
      const expression = source.get('src/feature/rule.mjs').content.toString().replace('export const rule', 'const rule');
      try { execFileSync(process.execPath, ['--input-type=module', '-e', expression + '\nimport assert from "node:assert/strict"; assert.equal(rule(2), true, "Expected inclusive boundary");'], { stdio: 'pipe' }); assert.equal(expected, 0); }
      catch (error) { assert.equal(expected, 1); assert.equal(error.status, 1); assert.match(error.stderr.toString(), /Expected inclusive boundary/); }
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('hotfix omits only the provider-added feature-plan check while keeping application checks', async () => {
  const api = async path => path.startsWith('contents/.lighthouse/implement.json') ? { content: Buffer.from(JSON.stringify({ defaults: { scope: 'Fix the defect', paths: ['src/feature/'], reviewRequired: false, checks: [['node', '--test']] } })).toString('base64') } : null;
  const regular = await loadImplementation(api, 1, 'owner', 'revision', 'main');
  const expedited = await loadImplementation(api, 1, 'owner', 'revision', 'main', 'hotfix');
  assert.equal(regular.policy.checks.length, 2); assert.deepEqual(expedited.policy.checks, [['node', '--test']]);
});

test('retained delegated integration needs owner workflow identity and unchanged merge policy', async () => {
  const p = policy(), review = { binding: 'review-binding', execution: { status: 'passed' }, result: { stage: 'integrate', status: 'passed', output: { review: { binding: 'review-binding', verdict: 'accept', findings: [] } } } };
  const authorization = { unattended: { owner: 'owner', route: 'ff', policyDigest: unattendedDigest(p), review } };
  const run = { event: 'workflow_dispatch', actor: { login: 'owner' }, triggering_actor: { login: 'owner' }, path: '.github/workflows/lighthouse-sdlc-unattended.yml', head_sha: 'base' };
  const binding = { repository: 'owner/repo', base: 'base' };
  const api = async () => ({ content: Buffer.from(JSON.stringify(p)).toString('base64') });
  assert.equal(await verifyUnattendedIntegration(api, authorization, run, binding), true);
  assert.equal(await verifyUnattendedIntegration(api, authorization, { ...run, actor: { login: 'bot' } }, binding), false);
  p.merge = false;
  assert.equal(await verifyUnattendedIntegration(api, authorization, run, binding), false);
});

test('native entry rejects unauthenticated requests before spending an agent budget', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-unattended-entry-'));
  const { writeFile } = await import('node:fs/promises');
  const event = join(directory, 'event.json'); await writeFile(event, JSON.stringify({ inputs: { issue: '1', route: 'ff' } }));
  try {
    await assert.rejects(runGithubUnattended({ env: { GITHUB_EVENT_PATH: event, GITHUB_EVENT_NAME: 'issue_comment', GITHUB_ACTOR: 'external' },
      api: async () => { throw Error('API must not be called'); }, execute: async () => { throw Error('Engine must not start'); } }), /authenticated owner/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
