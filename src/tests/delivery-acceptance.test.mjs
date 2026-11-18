import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const { prepareAcceptance, produceAcceptance, verifyAcceptance, decisionComment } = await import(process.env.LIGHTHOUSE_TEST_ACCEPTANCE_MODULE ?? '../packages/sdlc/src/delivery-acceptance.mjs');

const ref = 'a'.repeat(40), head = 'b'.repeat(40), repo = 'example/project';
const hash = (algorithm, text) => createHash(algorithm).update(text).digest('hex');
function file(content) { return { type: 'file', size: Buffer.byteLength(content), encoding: 'base64', content: Buffer.from(content).toString('base64'), sha: hash('sha1', `blob ${Buffer.byteLength(content)}\0${content}`) }; }
export async function fixture() {
  const workflow = file('reviewed non-agent workflow'), scope = file('bounded scope and criteria');
  const policy = file(JSON.stringify({ schemaVersion: 1, enabled: true, route: 'repository-owner', repositoryId: 1, ownerId: 2, producer: { workflow: '.github/workflows/lighthouse-delivery-acceptance.yml', workflowBlob: workflow.sha, operator: 'repository-owner' } }));
  const comments = [], artifacts = new Map(), requests = [];
  const run = { id: 100, run_attempt: 1, repository: { id: 1 }, event: 'workflow_dispatch', actor: { id: 2 }, triggering_actor: { id: 2 }, path: '.github/workflows/lighthouse-delivery-acceptance.yml', head_sha: ref, status: 'in_progress', conclusion: null };
  const pr = { id: 4, number: 4, html_url: 'https://github.com/example/project/pull/4', base: { repo: { id: 1 } }, head: { repo: { id: 1 }, sha: head } };
  const api = async (path, method = 'GET') => {
    requests.push({ path, method });
    assert.equal(method, 'GET');
    if (path === '') return { id: 1, full_name: repo, default_branch: 'main', owner: { id: 2, type: 'User' } };
    if (path === 'commits/main') return { sha: ref };
    if (path.startsWith('contents/.lighthouse/delivery-acceptance.json?ref=')) return policy;
    if (path.startsWith('contents/.github/workflows/lighthouse-delivery-acceptance.yml?ref=')) return workflow;
    if (path.startsWith('contents/scope.md?ref=')) return scope;
    if (path === 'actions/workflows/lighthouse-delivery-acceptance.yml') return { state: 'active', path: run.path };
    if (path === 'issues/3') return { id: 3, number: 3, html_url: 'https://github.com/example/project/issues/3' };
    if (path === 'pulls/4') return pr;
    if (path === 'issues/3/comments?per_page=100&page=1') return structuredClone(comments);
    if (path.startsWith('issues/comments/')) { const comment = comments.find(c => c.id === Number(path.split('/').at(-1))); if (comment) return structuredClone(comment); throw Error('Source missing'); }
    if (path === 'actions/workflows/lighthouse-delivery-acceptance.yml/runs?event=workflow_dispatch&per_page=100&page=1') return { total_count: artifacts.size ? 1 : 0, workflow_runs: artifacts.size ? [structuredClone(run)] : [] };
    if (path === 'actions/runs/100/artifacts?per_page=100') return { total_count: artifacts.size, artifacts: [...artifacts.keys()].map(name => ({ name, expired: false })) };
    if (path === 'actions/runs/100/attempts/1') return structuredClone(run);
    throw Error(`Unexpected fixture read ${path}`);
  };
  const prepared = await prepareAcceptance(api, repo, { policyRevision: ref, issue: 3, pullRequest: 4, scope: { path: 'scope.md', revision: ref }, criteria: { path: 'scope.md', revision: ref } });
  const readArtifact = async (_api, _repo, _run, name) => { if (!artifacts.has(name)) throw Error('Artifact expired'); return artifacts.get(name); };
  async function decision(outcome = 'accepted', corrects = [], replacement = null, binding = prepared.binding) {
    const value = { schemaVersion: 1, route: 'repository-owner', binding, outcome, corrects, replacement, reason: 'Fixture owner decision; not live acceptance.' };
    const id = 10 + comments.length;
    comments.push({ id, issue_url: `https://api.github.com/repos/${repo}/issues/3`, html_url: `https://github.com/${repo}/issues/3#issuecomment-${id}`, user: { id: 2, type: 'User', login: 'example' }, body: decisionComment(value), created_at: `2026-01-01T00:00:${String(id).padStart(2, '0')}Z`, updated_at: `2026-01-01T00:00:${String(id).padStart(2, '0')}Z` });
    run.status = 'in_progress'; run.conclusion = null;
    const receipt = await produceAcceptance(api, repo, id, { runId: 100, attempt: 1, revision: ref });
    artifacts.set(`lighthouse-delivery-acceptance-${id}-1`, structuredClone(receipt));
    run.status = 'completed'; run.conclusion = 'success';
    return receipt;
  }
  const verify = receipts => verifyAcceptance(api, repo, { binding: prepared.binding, receipts }, { readArtifact, now: () => '2026-01-02T00:00:00Z' });
  return { api, prepared, comments, run, pr, decision, verify, artifacts, requests, policy, workflow };
}

test('explicit adopted owner source verifies independently and duplicates do not multiply decisions', async () => {
  const f = await fixture(), receipt = await f.decision();
  assert.equal((await f.verify([receipt])).status, 'accepted');
  assert.deepEqual((await f.verify([receipt, receipt])).decisionIds, [receipt.id]);
  assert.ok(f.requests.every(r => r.method === 'GET'));
});
test('green execution and merged candidate without a decision are pending', async () => {
  const f = await fixture(); f.run.status = 'completed'; f.run.conclusion = 'success'; f.pr.merged = true;
  assert.equal((await f.verify([])).status, 'pending');
});
for (const outcome of ['rejected', 'revoked']) test(`explicit ${outcome} preserves historical acceptance`, async () => {
  const f = await fixture(), original = await f.decision(), correction = await f.decision(outcome, [original.id]);
  assert.equal((await f.verify([original, correction])).status, outcome);
  assert.equal(original.decision.outcome, 'accepted');
});
test('supersession preserves source reference without accepting an unverified replacement', async () => {
  const f = await fixture(), original = await f.decision();
  const replacementBinding = structuredClone(f.prepared.binding); replacementBinding.scope.revision = 'c'.repeat(40);
  const replacement = await f.decision('accepted', [], null, replacementBinding), correction = await f.decision('superseded', [original.id], replacement.id);
  assert.equal((await f.verify([original, correction])).status, 'superseded');
});
for (const kind of ['head', 'criteria', 'policy', 'edited', 'missing', 'actor', 'producer', 'attempt', 'artifact', 'route', 'version', 'contradiction', 'missing-receipt']) test(`unavailable for ${kind}`, async () => {
  const f = await fixture(), receipt = await f.decision();
  if (kind === 'head') f.pr.head.sha = 'c'.repeat(40);
  if (kind === 'criteria') receipt.decision.binding.criteria.sha256 = 'c'.repeat(64);
  if (kind === 'policy') receipt.decision.binding.policy.sha256 = 'c'.repeat(64);
  if (kind === 'edited') f.comments[0].updated_at = '2026-01-02T00:00:00Z';
  if (kind === 'missing') f.comments.length = 0;
  if (kind === 'actor') f.comments[0].user.id = 999;
  if (kind === 'producer') f.run.actor.id = 999;
  if (kind === 'attempt') receipt.producer.attempt = 2;
  if (kind === 'artifact') f.artifacts.clear();
  if (kind === 'route') receipt.route = 'worker';
  if (kind === 'version') receipt.schemaVersion = 99;
  const receipts = kind === 'missing-receipt' ? [] : [receipt];
  if (kind === 'contradiction') receipts.push(await f.decision('rejected'));
  assert.equal((await f.verify(receipts)).status, 'unavailable');
});
test('forged self-authored source cannot be produced', async () => {
  const f = await fixture(); await f.decision(); f.comments[0].user.id = 999;
  await assert.rejects(produceAcceptance(f.api, repo, 10, { runId: 100, attempt: 1, revision: ref }), /owner decision/);
});
test('malformed bindings fail closed and omitted historical correction receipts cannot hide revocation', async () => {
  const f = await fixture(), original = await f.decision(); await f.decision('revoked', [original.id]);
  assert.equal((await f.verify([original])).status, 'unavailable');
  assert.equal((await verifyAcceptance(f.api, repo, { receipts: [] })).status, 'unavailable');
});

test('deleted revocation remains visible through independent producer history', async () => {
  const f = await fixture(), original = await f.decision(); await f.decision('revoked', [original.id]); f.comments.pop();
  assert.equal((await f.verify([original])).status, 'unavailable');
});
