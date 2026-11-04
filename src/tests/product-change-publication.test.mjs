import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { publishProductChangePullRequest, loadProductApproval, publishProductApply, checkCurrentProductDecision } from '../packages/sdlc/src/product-change-actions.mjs';
import { validateProductChangeFiles, authorizeProductApply, createProductApplyReceipt } from '../packages/sdlc/src/product-change.mjs';
import { isProductOnlyPullRequest } from '../packages/sdlc/src/pr-state.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');

test('product proposal checkpoints wait for the actual published head on an existing PR', async () => {
  for (const scenario of ['lag', 'lost-ack', 'never-visible', 'closed', 'base-changed']) {
    const repository = 'owner/repo', parent = 'a'.repeat(40), head = 'b'.repeat(40), root = 'openspec/changes/example';
    const files = [{ path: `${root}/.openspec.yaml`, content: 'schema: product-change\n' }, { path: `${root}/product-change/change.md`, content: '---\nid: CHG-EXAMPLE\nstatus: draft\n---\n' }, { path: `${root}/product-change/proposed/example.md`, content: 'Proposed artifact' }];
    const candidate = { changeName: 'example', changeId: 'CHG-EXAMPLE', files, proposalDigest: validateProductChangeFiles(files, { changeName: 'example' }).digest, baselineDigest: 'c'.repeat(64), affectedAreas: [], decisions: [] };
    const snapshot = { issue: 18, stage: 'propose', title: 'Example', defaultBranch: 'main', sourceRevision: parent, runId: 'd'.repeat(64), workflowRunId: '100', workflowRevision: parent, authorizationDigest: 'e'.repeat(64), policyDigest: 'f'.repeat(64), taskDigest: '1'.repeat(64) };
    const original = { number: 7, state: 'open', merged: false, draft: true, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { ref: 'lighthouse/implement-18-previous', sha: parent, repo: { full_name: repository } }, base: { ref: 'main' }, html_url: 'https://example.test/pr/7', body: 'Preserve existing work.\n<!-- lighthouse-product-change:{} -->' };
    let updated = false, polls = 0, writes = 0, refWrites = 0, publishedBody;
    const api = async (path, method = 'GET', body) => {
      if (path === 'pulls?state=open&per_page=100') return [structuredClone(original)];
      if (path === 'pulls/7' && method === 'GET') {
        const current = structuredClone(original);
        if (updated) {
          if (scenario === 'closed') current.state = 'closed';
          if (++polls >= 3 && scenario !== 'never-visible') current.head.sha = head;
          if (scenario === 'base-changed') current.base.ref = 'other';
        }
        return current;
      }
      if (path === `git/commits/${parent}`) return { tree: { sha: 'tree' } };
      if (path === 'git/trees') return { sha: 'tree2' };
      if (path === 'git/commits' && method === 'POST') return { sha: head };
      if (path.startsWith('git/refs/heads/') && method === 'PATCH') { updated = true; refWrites++; if (scenario === 'lost-ack') throw Error('Lost ref response'); return {}; }
      if (path.startsWith('git/ref/heads/')) return { object: { sha: head } };
      if (path === '') return { default_branch: 'main' };
      if (path === 'pulls/7' && method === 'PATCH') { writes++; publishedBody = body.body; return {}; }
      if (path === 'issues/18/comments' && method === 'POST') return {};
      throw Error(`Unexpected request: ${method} ${path}`);
    };
    const publish = () => publishProductChangePullRequest(api, repository, snapshot, candidate, { validation: { provider: 'passed', openSpec: 'passed' }, runUrl: 'https://example.test/run', beforeWrite: async () => {}, wait: async () => {} });
    if (['never-visible', 'closed', 'base-changed'].includes(scenario)) {
      await assert.rejects(publish(), /head update|closed|identity/); assert.equal(writes, 0);
    } else {
      const result = await publish();
      assert.equal(result.binding.head, head); assert.equal(result.checkpoint.identity.head, head);
      assert.deepEqual(result.checkpoint.effectIds, [`pr:7:${head}`]); assert.match(publishedBody, /Preserve existing work/);
      assert.equal(result.pullRequest.head.sha, head);
    }
    assert.equal(refWrites, 1);
  }
});

test('product review and approval use the same markers, including legacy published PRs', async () => {
  const repository = 'owner/repo', issue = 18, head = 'a'.repeat(40), base = 'b'.repeat(40), root = 'openspec/changes/example';
  const files = [{ path: `${root}/.openspec.yaml`, content: 'schema: product-change\n' }, { path: `${root}/product-change/change.md`, content: '---\nid: CHG-EXAMPLE\nstatus: draft\n---\n' }, { path: `${root}/product-change/proposed/example.md`, content: 'Proposed artifact' }];
  const model = 'Accepted model\n', baselineDigest = hash(`example.md\0${hash(model)}\n`);
  const candidate = { changeName: 'example', changeId: 'CHG-EXAMPLE', files, proposalDigest: validateProductChangeFiles(files, { changeName: 'example' }).digest, baselineDigest, affectedAreas: [], decisions: [] };
  const snapshot = { issue, stage: 'propose', title: 'Example', defaultBranch: 'main', sourceRevision: base, runId: 'c'.repeat(64), workflowRunId: '100', workflowRevision: base, authorizationDigest: 'd'.repeat(64), policyDigest: 'e'.repeat(64), taskDigest: 'f'.repeat(64) };
  let pr, writes = 0, appliedTree, decisionComment, laterDecisions = [], reviews = [], issueLabels = [{ name: 'future' }];
  const api = async (path, method = 'GET', body, optional = false) => {
    if (method !== 'GET') writes++;
    if (path === 'pulls?state=open&per_page=100') return [];
    if (path === `git/commits/${base}`) return { tree: { sha: 'tree' } };
    if (path === `git/commits/${head}`) return { tree: { sha: 'tree2' } };
    if (path === 'git/trees' && method === 'POST') { if (pr) appliedTree = body.tree; return { sha: 'tree2' }; }
    if (path === 'git/commits' && method === 'POST') return { sha: pr ? 'c'.repeat(40) : head };
    if (path.startsWith('git/ref/heads/')) return null;
    if (path === 'git/refs') return {};
    if (path === 'pulls' && method === 'POST') return pr = { number: 7, state: 'open', merged: false, draft: true, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: body.head, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: body.body, html_url: 'https://example.test/pr/7' };
    if (path === 'pulls/7' && method === 'PATCH') { pr.body = body.body; return pr; }
    if (path === 'pulls/7') return pr;
    if (path.startsWith('git/refs/heads/') && method === 'PATCH') { pr.head.sha = body.sha; return {}; }
    if (path === '') return { default_branch: 'main' };
    if (path === 'pulls/7/files?per_page=100') return files.map(file => ({ filename: file.path, status: 'added' }));
    if (path.startsWith('contents/openspec/')) { const file = files.find(item => path === `contents/${item.path}?ref=${head}`); return { type: 'file', encoding: 'base64', size: Buffer.byteLength(file.content), content: Buffer.from(file.content).toString('base64') }; }
    if (path === 'commits/main') return { sha: base };
    if (path === `git/trees/${base}?recursive=1`) return { truncated: false, tree: [{ path: 'docs/product/model/example.md', type: 'blob', mode: '100644', size: Buffer.byteLength(model), sha: 'blob' }] };
    if (path === `git/trees/${head}?recursive=1`) return { truncated: false, tree: [{ path: 'docs/product/model/example.md', type: 'blob', mode: '100644', size: Buffer.byteLength(model), sha: 'blob' }] };
    if (path === `contents/.product/config.yaml?ref=${base}` && optional) return null;
    if (path === `contents/.product/config.yaml?ref=${head}` && optional) return null;
    if (path === 'git/blobs/blob') return { encoding: 'base64', size: Buffer.byteLength(model), content: Buffer.from(model).toString('base64') };
    if (path === 'issues/18') return { number: 18, state: 'open', labels: issueLabels };
    if (path === 'issues/comments/9') return decisionComment;
    if (path === 'issues/7/comments?per_page=100&page=1') return laterDecisions;
    if (path === 'pulls/7/reviews?per_page=100&page=1') return reviews;
    if (path === 'issues/18/comments?per_page=100') return [];
    if (path === 'issues/18/comments' && method === 'POST') return {};
    throw Error(`Unexpected request: ${method} ${path}`);
  };
  const published = await publishProductChangePullRequest(api, repository, snapshot, candidate, { validation: { provider: 'passed', openSpec: 'passed' }, runUrl: 'https://example.test/run', beforeWrite: async () => {} });
  assert.match(pr.body, /<!-- lighthouse-product-change-review:/);
  assert.match(pr.body, /<!-- lighthouse-product-change-checkpoint:/);
  assert.equal(isProductOnlyPullRequest(pr), true);
  const event = { action: 'created', issue: { number: 7, pull_request: {} }, comment: { id: 9, user: { login: 'owner', type: 'User' }, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', issue_url: 'https://api.github.com/repos/owner/repo/issues/7', body: `/product-change approve example ${published.binding.key}` } };
  decisionComment = structuredClone(event.comment);
  const before = writes;
  assert.equal((await loadProductApproval(api, { eventName: 'issue_comment', event, owner: 'owner', repository })).approval.reviewKey, published.binding.key);
  const replay = { eventName: 'workflow_dispatch', event: { inputs: { pull_request: '7', product_decision_comment: '9' } }, owner: 'owner', repository };
  assert.equal((await loadProductApproval(api, replay)).approval.decisionId, '9');
  for (const name of ['human-working', 'agent-working']) {
    issueLabels = [{ name }];
    await assert.rejects(loadProductApproval(api, replay), /blocked/);
  }
  issueLabels = [{ name: 'future' }];
  decisionComment = { ...event.comment, updated_at: '2026-01-02T00:00:00Z' };
  await assert.rejects(loadProductApproval(api, replay), /unedited/);
  decisionComment = { ...event.comment, issue_url: 'https://api.github.com/repos/owner/repo/issues/8' };
  await assert.rejects(loadProductApproval(api, replay), /unedited/);
  decisionComment = structuredClone(event.comment);
  await assert.rejects(loadProductApproval(api, { ...replay, eventName: 'issue_comment', event: { ...event, comment: { ...event.comment, body: event.comment.body.slice(0, -2) } } }), /all 64 review-key characters/);
  for (const changed of [{ body: 'Approval withdrawn' }, { updated_at: '2026-01-02T00:00:00Z' }, { user: { login: 'other', type: 'User' } }, { issue_url: 'https://api.github.com/repos/owner/repo/issues/8' }]) {
    decisionComment = { ...event.comment, ...changed };
    await assert.rejects(loadProductApproval(api, { eventName: 'issue_comment', event, owner: 'owner', repository }), /decision.*(edited|changed)/i);
  }
  decisionComment = structuredClone(event.comment);
  laterDecisions = [{ user: { login: 'owner', type: 'User' }, created_at: '2026-01-02T00:00:00Z', body: `/product-change request-changes example ${published.binding.key}\nPlease revise.` }];
  await assert.rejects(loadProductApproval(api, replay), /later owner decision/);
  await assert.rejects(loadProductApproval(api, { eventName: 'issue_comment', event, owner: 'owner', repository }), /later owner decision/);
  laterDecisions = []; reviews = [{ user: { login: 'owner', type: 'User' }, submitted_at: '2026-01-02T00:00:00Z', body: `/product-change request-changes example ${published.binding.key}\nPlease revise.` }];
  await assert.rejects(loadProductApproval(api, { eventName: 'issue_comment', event, owner: 'owner', repository }), /later owner decision/);
  reviews = [];
  pr.body = pr.body.replace('lighthouse-product-change-review:', 'lighthouse-product-change:review:').replace('lighthouse-product-change-checkpoint:', 'lighthouse-product-change:checkpoint:');
  assert.equal(isProductOnlyPullRequest(pr), true);
  assert.equal((await loadProductApproval(api, { eventName: 'issue_comment', event, owner: 'owner', repository })).approval.reviewKey, published.binding.key);
  const validBody = pr.body;
  pr.body += `\n<!-- lighthouse-product-change-review:${JSON.stringify(published.binding)} -->`;
  await assert.rejects(loadProductApproval(api, { eventName: 'issue_comment', event, owner: 'owner', repository }), /unique Product Change review/);
  assert.equal(writes, before, 'Reading an approval does not publish any effect');
  pr.body = validBody;
  const added = 'New requirement\n', resultDigest = hash(`example.md\0${hash(model)}\nnew.md\0${hash(added)}\n`);
  const dispatch = { request: { worker: 'apply-product-change', stage: 'propose', eventName: 'issue_comment', event, productApproval: { head, pullRequest: 7, changeName: 'example', reviewKey: published.binding.key } } };
  const current = await loadProductApproval(api, { eventName: 'issue_comment', event, owner: 'owner', repository });
  const applyRequest = { repository, owner: 'owner', issue, pullRequest: 7, head, changeName: 'example', checkpoint: current.checkpoint, binding: current.binding, approval: current.approval };
  const intent = authorizeProductApply({ checkpoint: current.checkpoint, approval: current.approval, currentBinding: current.binding, currentIdentity: current.checkpoint.identity });
  const receipt = createProductApplyReceipt({ intent, approval: current.approval, checkpoint: current.checkpoint, headAfter: head, resultingModelDigest: resultDigest, validated: true });
  const result = { head, modelRoot: 'docs/product/model', providerOutcome: 'applied', resultingModelDigest: resultDigest, receipt, files: [{ path: `${root}/product-change/change.md`, content: '---\nid: CHG-EXAMPLE\nstatus: applied\n---\n' }, { path: 'docs/product/model/new.md', content: added }] };
  const beforeApply = writes;
  await assert.rejects(publishProductApply(api, repository, 'owner', dispatch, { ...result, receipt: { ...receipt, intentId: '0'.repeat(64) } }, async () => {}, applyRequest), /receipt does not match/);
  await assert.rejects(publishProductApply(api, repository, 'owner', dispatch, { ...result, receipt: { ...receipt, approvalDigest: '0'.repeat(64) } }, async () => {}, applyRequest), /receipt does not match/);
  await assert.rejects(publishProductApply(api, repository, 'owner', dispatch, result, async () => {}, { ...applyRequest, approval: { ...applyRequest.approval, actor: 'other' } }), /no longer matches authenticated approval/);
  await assert.rejects(publishProductApply(api, repository, 'owner', dispatch, { ...result, providerOutcome: 'blocked' }, async () => {}, applyRequest), /receipt does not match/);
  await assert.rejects(publishProductApply(api, repository, 'owner', dispatch, { ...result, files: result.files.slice(0, 1) }, async () => {}, applyRequest), /do not reproduce/);
  assert.equal(writes, beforeApply, 'An incomplete model is rejected before any write');
  const applied = await publishProductApply(api, repository, 'owner', dispatch, result, async () => {}, applyRequest);
  assert.equal(applied.checkpoint.state, 'applied');
  assert.ok(appliedTree.some(file => file.path === 'docs/product/model/new.md' && file.content === added));
});

test('a dismissed or changed product review cannot authorize apply', () => {
  const review = { id: 9, body: '/product-change approve example key', user: { login: 'owner', type: 'User' }, state: 'APPROVED', submitted_at: '2026-01-01T00:00:00Z', pull_request_url: 'https://api.github.com/repos/owner/repo/pulls/7' };
  const input = { eventName: 'pull_request_review', event: { review }, current: review, repository: 'owner/repo', number: 7 };
  assert.doesNotThrow(() => checkCurrentProductDecision(input));
  assert.doesNotThrow(() => checkCurrentProductDecision({ ...input, event: { review: { ...review, state: 'approved' } } }));
  for (const patch of [{ state: 'DISMISSED' }, { body: 'withdrawn' }, { pull_request_url: 'https://api.github.com/repos/owner/repo/pulls/8' }]) assert.throws(() => checkCurrentProductDecision({ ...input, current: { ...review, ...patch } }), /decision/i);
});
