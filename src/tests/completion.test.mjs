import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { authorizeCompletion, assertFresh, assertChecks, mergeAccepted, checkCommit, evidenceProtection, postMergeRuns, requiredPolicy } from '../packages/sdlc/src/completion.mjs';
import { validatePublishable, publishProcessBundle, completionBundle } from '../packages/sdlc/src/process-publication.mjs';
import { validateGithubProfile } from '../packages/sdlc/src/github-profile.mjs';
const head = 'a'.repeat(40), base = 'b'.repeat(40), merged = 'c'.repeat(40);
const env = { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_ACTOR: 'owner', GITHUB_TRIGGERING_ACTOR: 'owner', GITHUB_REPOSITORY_OWNER: 'owner' };
const event = { inputs: { stage: 'integrate', issue: '42', pull_request: '50', head } };
const observation = { binding: { repository: 'owner/repo', issue: 42, pr: 50, head, base, branch: 'main', intent: 'intent', policy: 'policy', reviews: 'reviews' }, merged: false, merge: null, mergeable: true, profile: { evidenceBranch: 'process/retrospectives', completion: { postMergeWorkflows: ['verify.yml'] } }, checks: [{ context: 'test', status: 'passed', revision: head }], issueUrl: 'https://github.com/owner/repo/issues/42', prUrl: 'https://github.com/owner/repo/pull/50' };
const request = { issue: 42, title: 'A change', stage: 'review', runId: 'r1', workflowRunId: '123', attempt: '1', observedAt: '2026-10-25T12:00:00.000Z', runUrl: 'https://github.com/owner/repo/actions/runs/123', harnessRevision: head, completion: { ...observation, merged: true }, authorization: { merge: false } };
const envelope = { effect: { body: 'Reviewed the delivery.' }, result: { status: 'passed', nextAction: 'No further delivery action', output: { retrospective: '# Retrospective\n\nNo repeated pattern established.\n' } } };
test('completion authorization binds an owner dispatch to a full head; merge is opt-in', () => {
  assert.equal(authorizeCompletion(event, env, 'integrate').merge, false);
  assert.equal(authorizeCompletion({ inputs: { ...event.inputs, merge: 'true' } }, env, 'integrate').merge, true);
  for (const changes of [{ GITHUB_ACTOR: 'outsider' }, { GITHUB_TRIGGERING_ACTOR: 'outsider' }, { GITHUB_EVENT_NAME: 'issue_comment' }]) assert.throws(() => authorizeCompletion(event, { ...env, ...changes }, 'integrate'), /owner dispatch/);
  assert.throws(() => authorizeCompletion({ inputs: { ...event.inputs, head: 'abc' } }, env, 'integrate'), /head SHA/);
  assert.throws(() => authorizeCompletion({ inputs: { ...event.inputs, stage: 'review', merge: true } }, env, 'review'), /cannot authorize/);
});
test('freshness rejects changed code, base, intent, policy, review and scope', () => {
  assert.doesNotThrow(() => assertFresh(observation, structuredClone(observation)));
  for (const field of ['head', 'base', 'intent', 'policy', 'reviews', 'files']) assert.throws(() => assertFresh(observation, { ...observation, binding: { ...observation.binding, [field]: 'changed' } }), /stale/);
});
test('required checks fail closed for absent, pending and failed evidence', () => {
  assert.doesNotThrow(() => assertChecks(observation));
  for (const checks of [[], [{ status: 'failed' }], [{ status: 'unavailable' }]]) assert.throws(() => assertChecks({ checks }), /Required checks/);
});
test('the host accepts authenticated current checks, not an unrelated maintenance failure', async () => {
  const api = async path => path.includes('check-runs') ? { check_runs: [{ id: 1, name: 'test', app: { id: 7 }, head_sha: head, status: 'completed', conclusion: 'success' }, { name: 'maintenance', conclusion: 'failure' }] } : [];
  assert.equal((await checkCommit(api, head, [{ context: 'test', app: 7 }]))[0].status, 'passed');
  assert.notEqual((await checkCommit(api, base, [{ context: 'test', app: 7 }]))[0].status, 'passed');
  assert.notEqual((await checkCommit(api, head, [{ context: 'test', app: 8 }]))[0].status, 'passed');
});
test('live rules must enforce configured checks and merge queues fail closed', async () => {
  const api = async path => path.startsWith('rules/') ? [{ type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'test', integration_id: 7 }] } }] : null;
  assert.equal((await requiredPolicy(api, 'main', { requiredChecks: [{ context: 'test', integrationId: 7 }] })).checks.length, 1);
  await assert.rejects(requiredPolicy(api, 'main', { requiredChecks: [{ context: 'missing', integrationId: 7 }] }), /not enforced/);
  await assert.rejects(requiredPolicy(async p => p.startsWith('rules/') ? [{ type: 'merge_queue' }] : null, 'main', {}), /queue-aware/);
});
test('merge rechecks evidence immediately, binds head and reconciles lost responses without retrying', async () => {
  let mutations = 0;
  const api = async (path, method, body) => {
    if (method === 'PUT') { mutations++; assert.equal(body.sha, head); throw Error('connection lost'); }
    return { merged: true, head: { sha: head }, merge_commit_sha: merged };
  };
  const result = await mergeAccepted(api, observation, async () => observation);
  assert.equal(result.sha, merged); assert.equal(result.recovered, true); assert.equal(mutations, 1);
  await assert.rejects(mergeAccepted(api, observation, async () => ({ ...observation, binding: { ...observation.binding, base: merged } })), /stale/);
  assert.equal(mutations, 1);
  await mergeAccepted(api, observation, async () => ({ ...observation, merged: true, merge: merged }));
  assert.equal(mutations, 1);
});
test('an unconfirmed merge failure is not retried or reported successful', async () => {
  let puts = 0;
  await assert.rejects(mergeAccepted(async (p, m) => { if (m === 'PUT') { puts++; throw Error('denied'); } return { merged: false }; }, observation, async () => observation), /denied/);
  assert.equal(puts, 1);
});
test('post-merge verification rejects mismatched runs and dispatches only at the merged tip', async () => {
  const calls = [];
  const api = async (p, m, b) => { calls.push({ p, m, b }); if (p.includes('/runs?')) return { workflow_runs: [{ id: 1, head_sha: base, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' }] }; if (p.startsWith('commits/')) return { sha: merged }; return null; };
  const results = await postMergeRuns(api, observation, merged, true);
  assert.equal(results[0].status, 'unavailable'); assert.equal(calls.filter(c => c.m === 'POST').length, 1);
  await assert.rejects(postMergeRuns(async (p, m, b) => p.startsWith('commits/') ? { sha: base } : api(p, m, b), observation, merged, true), /advanced/);
});
test('evidence protection rejects missing rules, inactive protection and bypass actors', async () => {
  const rules = ['deletion', 'non_fast_forward'].map(type => ({ type, ruleset_source_type: 'Repository', ruleset_id: 1 }));
  for (const config of [{ enforcement: 'disabled', bypass_actors: [] }, { enforcement: 'active', bypass_actors: [{ actor_id: 1 }] }]) await assert.rejects(evidenceProtection(async p => p.startsWith('rules/') ? rules : config, 'process/retrospectives'), /protection/);
  await assert.rejects(evidenceProtection(async () => [], 'process/retrospectives'), /protection/);
});
test('publication rejects path escapes, credential-shaped payloads and unbounded data', () => {
  for (const path of ['../a', '/a', 'a//b', 'a/../b', 'a\\b']) assert.throws(() => validatePublishable({ [path]: 'text' }), /Unsafe/);
  for (const content of ['ghp_' + 'x'.repeat(20), 'Bearer ' + 'x'.repeat(20), 'https://store.example/a?token=secret']) assert.throws(() => validatePublishable({ 'report.md': content }), /publishable/);
  assert.throws(() => validatePublishable({ 'report.md': 'x'.repeat(1024 * 1024 + 1) }), /bounds/);
});
test('retained report indexes the exact record bytes and keeps source and evidence identities separate', () => {
  const files = completionBundle(request, envelope, { state: 'merged', sha: merged });
  const index = JSON.parse(files['evidence-index.json']);
  assert.equal(index.records[0].sha256, createHash('sha256').update(files['evidence-record.json']).digest('hex'));
  assert.equal(index.revision, merged);
  assert.match(files['report.md'], new RegExp(head));
  for (const artifact of JSON.parse(files['evidence-record.json']).artifacts) assert.equal(artifact.sha256, createHash('sha256').update(files[artifact.path]).digest('hex'));
});
function store({ conflictOnce = false, loseResponse = false, symlink = false } = {}) {
  let tip = 'original', serial = 0, attempts = 0;
  const trees = new Map([['original', new Map()]]), blobs = new Map(), commits = new Map();
  const api = async (path, method = 'GET', body) => {
    if (path.startsWith('rules/')) return ['deletion', 'non_fast_forward'].map(type => ({ type, ruleset_id: 1, ruleset_source_type: 'Repository' }));
    if (path === 'rulesets/1') return { enforcement: 'active', bypass_actors: [] };
    if (path.startsWith('git/ref/')) return { object: { sha: tip } };
    if (path.startsWith('git/trees/') && method === 'GET') {
      const key = path.slice(10).split('?')[0], tree = trees.get(key);
      const entries = [...tree].map(([path, sha]) => ({ path, sha, mode: '100644', type: 'blob' }));
      const roots = [...new Set([...tree.keys()].map(p => p.split('/').slice(0, 3).join('/')))];
      entries.push(...roots.map(path => ({ path, type: 'tree' })));
      if (symlink) entries.push({ path: 'docs/process/20261025-42-a-change/README.md', type: 'blob', mode: '120000', sha: 'link' });
      return { sha: key, tree: entries, truncated: false };
    }
    if (path === 'git/blobs') { const sha = createHash('sha1').update(`blob ${Buffer.byteLength(body.content)}\0`).update(body.content).digest('hex'); blobs.set(sha, body.content); return { sha }; }
    if (path.startsWith('git/blobs/')) { const content = blobs.get(path.slice(10)); return { content: Buffer.from(content).toString('base64'), size: Buffer.byteLength(content), encoding: 'base64' }; }
    if (path === 'git/trees') { const key = 'tree' + serial++, tree = new Map(trees.get(body.base_tree)); for (const f of body.tree) tree.set(f.path, f.sha); trees.set(key, tree); return { sha: key }; }
    if (path === 'git/commits') { const key = 'commit' + serial++; trees.set(key, trees.get(body.tree)); commits.set(key, body); return { sha: key }; }
    if (path.startsWith('git/refs/')) {
      attempts++; assert.equal(body.force, false);
      if (conflictOnce && attempts === 1) { const concurrent = new Map(trees.get(tip)); concurrent.set('unrelated.txt', 'other'); trees.set('concurrent', concurrent); tip = 'concurrent'; throw Error('conflict'); }
      assert.equal(commits.get(body.sha).parents[0], tip); tip = body.sha;
      if (loseResponse && attempts === 1) throw Error('lost response');
      return {};
    }
    throw Error(`Unexpected API ${path}`);
  };
  return { api, contents: () => trees.get(tip), attempts: () => attempts };
}
test('concurrent evidence updates preserve other files; exact duplicates do not write', async () => {
  const db = store({ conflictOnce: true }), files = { 'report.md': 'Report' };
  const receipt = await publishProcessBundle(db.api, request, files);
  assert.equal(receipt.duplicate, false); assert.equal(db.contents().get('unrelated.txt'), 'other');
  const duplicate = await publishProcessBundle(db.api, request, files);
  assert.equal(duplicate.duplicate, true); assert.equal(db.attempts(), 2);
  await assert.rejects(publishProcessBundle(db.api, request, { 'report.md': 'different' }), /Conflicting/);
});
test('uncertain evidence writes reconcile the confirmed bundle without duplicate commits', async () => {
  const db = store({ loseResponse: true });
  const receipt = await publishProcessBundle(db.api, request, { 'report.md': 'Report' });
  assert.equal(receipt.duplicate, true); assert.equal(db.attempts(), 1);
});
test('publisher refuses a symlink index and calls the live authority check before writing', async () => {
  await assert.rejects(publishProcessBundle(store({ symlink: true }).api, request, { 'report.md': 'Report' }), /regular file/);
  const db = store();
  await assert.rejects(publishProcessBundle(db.api, request, { 'report.md': 'Report' }, async () => { throw Error('revoked'); }), /revoked/);
  assert.equal(db.attempts(), 0);
});
test('completion opt-in has a bounded workflow allowlist', () => {
  const profile = { schemaVersion: 1, profileVersion: 1, repository: 'owner/repo', intake: 'collaborators', requiredChecks: [{ context: 'test', integrationId: 7 }], requiredApprovals: 0, completion: { publishEvidence: true, postMergeWorkflows: ['verify.yml'] } };
  assert.deepEqual(validateGithubProfile(profile), []);
  assert.ok(validateGithubProfile({ ...profile, completion: { ...profile.completion, postMergeWorkflows: ['../run.yml'] } }).length);
});

test('an owner-observed unchanged ruleset can be checked when GitHub redacts bypass actors', async () => {
  const source = { id: 1, source: 'owner/repo', source_type: 'Repository', target: 'branch', enforcement: 'active', updated_at: '2026-10-20T00:00:00Z', conditions: { ref_name: { include: ['refs/heads/process/retrospectives'], exclude: [] } }, rules: [{ type: 'deletion' }, { type: 'non_fast_forward' }] };
  const revision = createHash('sha256').update(JSON.stringify(source)).digest('hex');
  const rules = ['deletion', 'non_fast_forward'].map(type => ({ type, ruleset_source_type: 'Repository', ruleset_id: 1 }));
  const api = async p => p.startsWith('rules/') ? rules : source;
  await evidenceProtection(api, 'process/retrospectives', [{ id: 1, revision }]);
  await assert.rejects(evidenceProtection(api, 'process/retrospectives'), /protection/);
  await assert.rejects(evidenceProtection(async p => p.startsWith('rules/') ? rules : { ...source, updated_at: '2026-10-21T00:00:00Z' }, 'process/retrospectives', [{ id: 1, revision }]), /protection/);
  await assert.rejects(evidenceProtection(async p => p.startsWith('rules/') ? rules : { ...source, bypass_actors: [{ actor_id: 1 }] }, 'process/retrospectives', [{ id: 1, revision }]), /protection/);
});

test('protection observations require owner visibility and a stable provider timestamp', async () => {
  const { observeProtection } = await import('../packages/sdlc/src/observe-protection.mjs');
  const rules = ['deletion', 'non_fast_forward'].map(type => ({ type, ruleset_source_type: 'Repository', ruleset_id: 1 }));
  const source = { id: 1, enforcement: 'active', bypass_actors: [], updated_at: '2026-10-25T12:00:00Z' };
  const api = async p => p.startsWith('rules/') ? rules : source;
  assert.equal((await observeProtection(api, 'process/retrospectives', Date.parse(source.updated_at) + 3000)).length, 1);
  await assert.rejects(observeProtection(api, 'process/retrospectives', Date.parse(source.updated_at) + 1000), /two seconds/);
  await assert.rejects(observeProtection(async p => p.startsWith('rules/') ? rules : { ...source, bypass_actors: undefined }, 'process/retrospectives'), /protection/);
});

test('finalization declares future host effects instead of requiring final labels before review', async () => {
  const { completionEffects } = await import('../packages/sdlc/src/completion.mjs');
  assert.deepEqual(completionEffects('review', 'passed'), { add: [], remove: ['waiting-review', 'ready', 'integrate', 'review'], closeIssue: true });
  assert.deepEqual(completionEffects('review', 'blocked'), { add: ['waiting-review'], remove: [], closeIssue: false });
  assert.equal(completionEffects('integrate', 'passed').closeIssue, false);
});
test('pending checks remain unavailable with an explicit pending state, not failed', async () => {
  const required = [{ context: 'test', app: 7 }];
  const api = async p => p.includes('check-runs') ? { check_runs: [{ name: 'test', app: { id: 7 }, head_sha: head, status: 'in_progress', conclusion: null }] } : [];
  const result = (await checkCommit(api, head, required))[0];
  assert.equal(result.status, 'unavailable'); assert.equal(result.state, 'pending');
  const runs = await postMergeRuns(async () => ({ workflow_runs: [{ id: 1, head_sha: merged, head_branch: 'main', event: 'workflow_dispatch', status: 'in_progress', conclusion: null }] }), observation, merged);
  assert.equal(runs[0].status, 'unavailable'); assert.equal(runs[0].state, 'pending');
});

test('additional check observations can support review without silently changing required policy', async () => {
  const { observeChecks, assertCitedChecks } = await import('../packages/sdlc/src/completion.mjs');
  const api = async p => p.includes('check-runs') ? { check_runs: [{ id: 10, name: 'foundation', app: { id: 7 }, head_sha: head, status: 'completed', conclusion: 'success', html_url: 'https://github.com/owner/repo/actions/runs/1/job/10' }] } : [];
  const observedChecks = await observeChecks(api, head);
  assert.equal(observedChecks[0].status, 'passed');
  const e = { result: { evidence: [{ id: observedChecks[0].evidenceId, source: observedChecks[0].url, status: 'passed' }] } };
  assert.doesNotThrow(() => assertCitedChecks(e, { observedChecks }, { observedChecks }));
  assert.throws(() => assertCitedChecks(e, { observedChecks }, { observedChecks: [] }), /Cited CI/);
  assert.throws(() => assertCitedChecks(e, { observedChecks }, { observedChecks: [{ ...observedChecks[0], status: 'failed' }] }), /Cited CI/);
  assert.doesNotThrow(() => assertCitedChecks({ result: { evidence: [] } }, { observedChecks }, { observedChecks: [{ ...observedChecks[0], status: 'failed' }] }));
});

test('current completion jobs cannot become external acceptance evidence or erase required gates', async () => {
  const { observeChecks } = await import('../packages/sdlc/src/completion.mjs');
  const checks = [
    { id: 10, name: 'review / prepare', status: 'in_progress', conclusion: null },
    { id: 11, name: 'independent verification', status: 'in_progress', conclusion: null },
    { id: 12, name: 'catalog', status: 'completed', conclusion: 'success' },
  ].map(c => ({ ...c, app: { id: 7 }, head_sha: head }));
  const api = async p => p.startsWith('actions/runs/99/jobs?') ? { jobs: [{ check_run_url: 'https://api.github.com/repos/owner/repo/check-runs/10' }] } : p.includes('check-runs') ? { check_runs: checks } : [];
  const observed = await observeChecks(api, head, '99');
  assert.deepEqual(observed.map(c => c.evidenceId), ['github-check:11', 'github-check:12']);
  assert.equal(observed[0].state, 'pending');
  assert.equal((await checkCommit(api, head, [{ context: 'review / prepare', app: 7 }]))[0].state, 'pending');
  await assert.rejects(observeChecks(api, head, '../other'), /workflow run/);
  await assert.rejects(observeChecks(async p => p.startsWith('actions/') ? { jobs: [{}] } : api(p), head, '99'), /check identity/);
});
