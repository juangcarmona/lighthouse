import test from 'node:test';
import assert from 'node:assert/strict';
import { assessDelegation, validateDelegationPolicy } from '../packages/sdlc/src/risk-delegation.mjs';
import { runUnattended, unattendedDigest, validateUnattendedPolicy } from '../packages/sdlc/src/unattended.mjs';
import { riskAssessment, riskPolicy } from './helpers/risk-delegation-fixture.mjs';

function fixture() {
  const policy = { schemaVersion: 1, enabled: true, routes: ['ff'], paths: ['src/feature/', 'tests/'], reviewerProfile: 'plan', allowFivePoint: false, merge: false, maxCorrections: 1, timeoutSeconds: 60, delegation: riskPolicy() };
  const binding = { repository: 'owner/repo', issue: 1, sourceRevision: 'a'.repeat(40), taskDigest: 'b'.repeat(64), policyDigest: unattendedDigest(policy), route: 'ff' };
  const assessment = riskAssessment(), events = [];
  const eligibility = { points: 2, risk: 'low', reversible: true, dependenciesResolved: true, scopeKnown: true, productChangeNeeded: false, humanDecisionRequired: false, reason: 'A known comparison with unchanged callers' };
  const candidate = { eligibility, delegation: riskAssessment(), files: [{ path: 'src/feature/rule.mjs' }, { path: 'tests/edge.test.mjs' }], receipt: { checks: [{ command: ['node', '--test'], exitCode: 0, execution: { status: 'passed', exitCode: 0, signal: null } }] } };
  const host = { binding, recheck: async () => {}, refine: async () => ({ eligibility, delegation: assessment }), propose: async () => ({}), reviewPlan: async () => ({ accepted: true }),
    implement: async () => { events.push('implement'); return candidate; }, reviewCandidate: async () => { events.push('review'); return { accepted: true }; },
    publish: async (_candidate, decisions) => { events.push('publish'); assert.equal(decisions.at(-1).phase, 'publication'); return { number: 2 }; },
    integrate: async () => { events.push('merge'); }, stop: async () => { events.push('stop'); } };
  return { policy, binding, assessment, candidate, host, events };
}

test('routine continuation keeps risk, defects, evidence and actual checks separate, with no merge grant', async () => {
  const f = fixture();
  const result = await runUnattended({ route: 'ff', ...f });
  assert.equal(result.status, 'waiting-human');
  assert.deepEqual(f.events, ['implement', 'review', 'publish']);
  const decisions = result.evidence.filter(e => e.kind === 'delegation').map(e => e.decision);
  assert.deepEqual(decisions.map(d => [d.phase, d.status]), [['admission', 'continue'], ['candidate', 'continue'], ['publication', 'continue']]);
  assert.equal(decisions[0].binding.taskDigest, f.binding.taskDigest);
  assert.equal(decisions[0].assessment.inherentRisk.level, 'routine');
  assert.equal(decisions[0].assessment.defects.status, 'none');
  assert.equal(decisions[0].assessment.evidence.confidence, 'sufficient');
});

test('sensitive risk, irreversibility, unknown defects and insufficient evidence stop before implementation', async () => {
  const cases = [a => { a.inherentRisk.level = 'sensitive'; }, a => { a.inherentRisk.reversible = false; }, a => { a.defects.status = 'unknown'; }, a => { a.evidence.confidence = 'unavailable'; }, a => { a.evidence.confidence = 'uncertain'; }, a => { a.scope.push({ path: 'src/feature/auth/session.mjs', reason: 'Change a sensitive authentication boundary' }); }];
  for (const change of cases) {
    const f = fixture(); change(f.assessment);
    const result = await runUnattended({ route: 'ff', ...f });
    assert.equal(result.status, 'blocked'); assert.deepEqual(f.events, ['stop']);
    assert.equal(result.evidence[0].decision.status, 'blocked');
  }
});

test('scope growth inside broadly authorized project paths still needs fresh refinement', async () => {
  for (const reported of [false, true]) {
    const f = fixture(); f.candidate.files.push({ path: 'src/feature/other.mjs' });
    if (reported) f.candidate.delegation.scope.push({ path: 'src/feature/other.mjs', reason: 'An unreviewed extra change' });
    const result = await runUnattended({ route: 'ff', ...f });
    assert.equal(result.status, 'blocked'); assert.ok(!f.events.includes('publish')); assert.ok(!f.events.includes('review'));
    assert.match(result.reason, /scope|files/);
  }
});

test('green exit without executed host evidence cannot publish and failed checks exhaust the existing budget', async () => {
  for (const unavailable of [true, false]) {
    const f = fixture();
    if (unavailable) delete f.candidate.receipt.checks[0].execution;
    else f.candidate.receipt.checks[0].exitCode = 1;
    const result = await runUnattended({ route: 'ff', ...f });
    assert.equal(result.status, 'blocked'); assert.ok(!f.events.includes('publish'));
    assert.match(result.reason, unavailable ? /verification.*unavailable/ : /correction limit exhausted/);
    assert.equal(f.events.filter(e => e === 'implement').length, unavailable ? 1 : 2);
  }
});

test('authority revocation after review stops publication without a renewed budget', async () => {
  const f = fixture(); let revoked = false;
  f.host.reviewCandidate = async () => { revoked = true; return { accepted: true }; };
  f.host.recheck = async () => { if (revoked) throw Error('Owner revoked the scope'); };
  const result = await runUnattended({ route: 'ff', ...f });
  assert.equal(result.status, 'blocked'); assert.match(result.reason, /revoked/); assert.ok(!f.events.includes('publish'));
});

test('closed policy/report contracts reject malformed paths, extra authority fields and missing bindings', () => {
  for (const stopPaths of [['../secret'], ['src//auth/'], ['*'], [null], ['src/feature/', 'src/feature/']]) assert.throws(() => validateDelegationPolicy({ ...riskPolicy(), stopPaths }));
  const f = fixture(); assert.equal(validateUnattendedPolicy(f.policy, 'ff'), f.policy);
  assert.throws(() => assessDelegation({ ...f, phase: 'admission', binding: { ...f.binding, policyDigest: 'c'.repeat(64) } }), /bindings/);
  for (const change of [a => { a.merge = true; }, a => { a.scope[0].path = '../escape'; }, a => { a.scope.push(a.scope[0]); }, a => { a.defects = null; }]) {
    const assessment = riskAssessment(); change(assessment);
    assert.equal(assessDelegation({ ...f, assessment, phase: 'admission' }).status, 'blocked');
  }
});

test('stale admission, missing review and hotfix planning-path exceptions cannot grant continuation', () => {
  const f = fixture(), admitted = assessDelegation({ ...f, phase: 'admission' });
  for (const change of [a => { a.binding.taskDigest = 'f'.repeat(64); }, a => { a.assessment.scope.push({ path: 'src/feature/other.mjs', reason: 'Tampered scope' }); }]) {
    const stale = structuredClone(admitted); change(stale);
    assert.equal(assessDelegation({ ...f, admitted: stale, phase: 'candidate', files: f.candidate.files }).status, 'blocked');
  }
  assert.equal(assessDelegation({ ...f, admitted, phase: 'publication', files: f.candidate.files, checks: f.candidate.receipt.checks }).status, 'blocked');
  const ffFiles = [...f.candidate.files, { path: 'openspec/changes/issue-1-proposal/tasks.md' }];
  assert.equal(assessDelegation({ ...f, admitted, phase: 'candidate', files: ffFiles }).status, 'continue');
  const binding = { ...f.binding, route: 'hotfix' }, hotfixAdmission = assessDelegation({ ...f, binding, phase: 'admission' });
  assert.equal(assessDelegation({ ...f, binding, admitted: hotfixAdmission, phase: 'candidate', files: ffFiles }).status, 'blocked');
});


test('sensitive-path stops apply to actual planning files and frozen admission survives caller mutation', () => {
  const f = fixture(); f.policy.delegation.stopPaths.push('openspec/changes/issue-1-proposal/tasks.md');
  f.binding.policyDigest = unattendedDigest(f.policy);
  const admitted = assessDelegation({ ...f, phase: 'admission' });
  f.assessment.scope[0].reason = 'Changed after admission';
  assert.notEqual(admitted.assessment.scope[0].reason, f.assessment.scope[0].reason);
  const files = [...f.candidate.files, { path: 'openspec/changes/issue-1-proposal/tasks.md' }];
  const result = assessDelegation({ ...f, phase: 'candidate', admitted, files });
  assert.equal(result.status, 'blocked'); assert.ok(result.reasons.some(r => r.includes('Actual diff touches')));
});

test('oversized risk receipts stop before publication and the guide/export ship in the package', async () => {
  const f = fixture();
  for (const a of [f.assessment, f.candidate.delegation]) a.inherentRisk.dependents = Array(40).fill('x'.repeat(4000));
  const result = await runUnattended({ route: 'ff', ...f });
  assert.equal(result.status, 'blocked'); assert.match(result.reason, /evidence budget/); assert.ok(!f.events.includes('publish'));
  const { readFile } = await import('node:fs/promises');
  const pkg = JSON.parse(await readFile(new URL('../packages/sdlc/package.json', import.meta.url)));
  assert.ok(pkg.files.includes('risk-delegation.md'));
  assert.equal(pkg.exports['./risk-delegation'], './src/risk-delegation.mjs');
});
