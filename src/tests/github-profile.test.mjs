import test from 'node:test';
import { github, config } from './fixtures/github-profile/provider.mjs';
import assert from 'node:assert/strict';
import { applyGithubProfile, buildGithubProfilePlan, githubProfilePlanHash, readGithubProfile, validateGithubProfile } from '../packages/sdlc/src/github-profile.mjs';

const clone = (value) => structuredClone(value);


test('plans are read-only, applications preserve unrelated work and retries do not duplicate rules', async () => {
  const api = github(); const plan = await api.plan();
  assert.equal(plan.status, 'drift'); assert.equal(plan.canApply, true); assert.equal(api.state.writes.length, 0);
  assert.equal(plan.controls.find((c) => c.id === 'releases.immutable').status, 'excepted');
  const result = await applyGithubProfile(plan, plan.authorization.planHash, { request: api.request });
  assert.equal(result.status, 'passed'); assert.equal(api.state.repo.has_wiki, true); assert.equal(api.state.policies.length, 2);
  const count = api.state.writes.length;
  await applyGithubProfile(plan, plan.authorization.planHash, { request: api.request });
  assert.equal(api.state.writes.length, count); assert.equal((await api.plan()).status, 'passed');
});

test('bad authorization, forged operations and unknown configuration cannot mutate GitHub', async () => {
  const api = github(); const plan = await api.plan();
  await assert.rejects(applyGithubProfile(plan, 'wrong', { request: api.request }), /authorization/);
  const forged = clone(plan); forged.changes.push('repository.visibility'); forged.authorization.planHash = githubProfilePlanHash(forged);
  await assert.rejects(applyGithubProfile(forged, forged.authorization.planHash, { request: api.request }), /valid projection/);
  for (const invalid of [{ ...config(), repository: '../secret' }, { ...config(), visibility: 'public' }, { ...config(), requiredChecks: [] }, { ...config(), overrides: { 'repository.visibility': { value: 'public', reason: 'bad' } } }, { ...config(), overrides: { 'security.alerts': { value: false, reason: 'bad' } } }]) assert.ok(validateGithubProfile(invalid).length);
  assert.equal(api.state.writes.length, 0);
});

test('stale identity and formerly compliant controls stop apply before writes', async () => {
  for (const change of [(s) => { s.repo.id = 99; }, (s) => { s.repo.default_branch = 'other'; }, (s) => { s.workflow.default_workflow_permissions = 'write'; }]) {
    const api = github(); const plan = await api.plan(); change(api.state);
    await assert.rejects(applyGithubProfile(plan, plan.authorization.planHash, { request: api.request }), /changed/);
    assert.equal(api.state.writes.length, 0);
  }
});

test('provider failures are unavailable rather than compliant and never lead to writes', async () => {
  const api = github(); api.state.failures['GET repos/example/project/actions/permissions/workflow'] = 403;
  const plan = await api.plan(); assert.equal(plan.canApply, false); assert.equal(plan.status, 'blocked');
  assert.equal(plan.controls.find((c) => c.id === 'actions.workflow').status, 'unavailable');
  await assert.rejects(applyGithubProfile(plan, plan.authorization.planHash, { request: api.request }), /blocked/);
  assert.equal(api.state.writes.length, 0);
});

test('a reasoned protection exception remains visible when the provider cannot enforce it', async () => {
  const api = github();
  api.state.failures['GET repos/example/project/rules/branches/main?per_page=100&page=1'] = 403;
  const c = config(); c.overrides['rules.main'] = { value: null, reason: 'The current hosting plan cannot enforce branch protection; adoption excludes it.' };
  const plan = await api.plan(c);
  assert.equal(plan.canApply, true);
  const control = plan.controls.find((item) => item.id === 'rules.main');
  assert.equal(control.status, 'excepted'); assert.equal(control.observed.available, false);
  assert.equal(plan.changes.includes('rules.main'), false);
});

test('partial failure reports completed writes and can retry without stored receipts', async () => {
  const api = github(); const plan = await api.plan(); api.state.failures['PATCH repos/example/project'] = 403;
  await assert.rejects(applyGithubProfile(plan, plan.authorization.planHash, { request: api.request }), (error) => {
    assert.match(error.message, /rejected/);
    assert.equal(error.result.status, 'failed');
    assert.deepEqual(error.result.completed, ['rules.main', 'rules.evidence']);
    return true;
  });
  assert.equal(api.state.policies.length, 2);
  delete api.state.failures['PATCH repos/example/project'];
  await applyGithubProfile(plan, plan.authorization.planHash, { request: api.request });
  assert.equal(api.state.policies.length, 2); assert.equal((await api.plan()).status, 'passed');
});

test('stricter existing rules satisfy the minimum and are never replaced', async () => {
  const api = github(); const first = await api.plan(); await applyGithubProfile(first, first.authorization.planHash, { request: api.request });
  const main = api.state.policies[0]; main.name = 'Organization-owned policy';
  main.rules.find((r) => r.type === 'pull_request').parameters.required_approving_review_count = 2;
  main.rules.push({ type: 'required_signatures' });
  main.rules.find((r) => r.type === 'required_status_checks').parameters.required_status_checks.push({ context: 'security', integration_id: 15368 });
  const plan = await api.plan(); assert.equal(plan.status, 'passed');
  const before = clone(api.state.policies); await applyGithubProfile(plan, plan.authorization.planHash, { request: api.request }); assert.deepEqual(api.state.policies, before);
});

test('bypass and wrong check issuers cannot satisfy required protection', async () => {
  const api = github(); const plan = await api.plan(); await applyGithubProfile(plan, plan.authorization.planHash, { request: api.request });
  api.state.policies[0].bypass_actors = [{ actor_type: 'RepositoryRole', actor_id: 5, bypass_mode: 'always' }];
  assert.ok((await api.plan()).changes.includes('rules.main'));
  api.state.policies[0].bypass_actors = [];
  api.state.policies[0].rules.find((r) => r.type === 'required_status_checks').parameters.required_status_checks[0].integration_id = 1;
  assert.ok((await api.plan()).changes.includes('rules.main'));
});

test('release immutability needs explicit workflow readiness and private repositories remain private', async () => {
  const api = github(); const c = config(); delete c.overrides;
  assert.equal((await api.plan(c)).controls.find((item) => item.id === 'releases.immutable').status, 'blocked');
  c.releaseWorkflowReady = true; const plan = await api.plan(c); await applyGithubProfile(plan, plan.authorization.planHash, { request: api.request }); assert.equal(api.state.immutable, true);
  api.state.repo.visibility = 'private'; api.state.failures['GET repos/example/project/actions/permissions/fork-pr-contributor-approval'] = 422;
  const privatePlan = await api.plan(c); assert.equal(privatePlan.controls.find((item) => item.id === 'actions.forkApproval').status, 'not-applicable');
  assert.equal(api.state.repo.visibility, 'private');
});

test('custom merge policy and contribution policy are explicit reusable choices', async () => {
  const api = github(); const c = config(); c.intake = 'public'; c.overrides['repository.allow_merge_commit'] = { value: true, reason: 'Preserve release branch ancestry.' };
  const plan = await api.plan(c); await applyGithubProfile(plan, plan.authorization.planHash, { request: api.request });
  assert.equal(api.state.repo.allow_merge_commit, true); assert.equal(api.state.intake.issueCreationPolicy, 'ALL');
  assert.equal(api.state.intake.pullRequestCreationPolicy, 'ALL');
});
