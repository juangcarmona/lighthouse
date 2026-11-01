import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { publishProductChangePullRequest, loadProductApproval, publishProductApply } from '../packages/sdlc/src/product-change-actions.mjs';
import { validateProductChangeFiles } from '../packages/sdlc/src/product-change.mjs';
import { isProductOnlyPullRequest } from '../packages/sdlc/src/pr-state.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');

test('product review and approval use the same markers, including legacy published PRs', async () => {
  const repository = 'owner/repo', issue = 18, head = 'a'.repeat(40), base = 'b'.repeat(40), root = 'openspec/changes/example';
  const files = [{ path: `${root}/.openspec.yaml`, content: 'schema: product-change\n' }, { path: `${root}/product-change/change.md`, content: '---\nid: CHG-EXAMPLE\nstatus: draft\n---\n' }, { path: `${root}/product-change/proposed/example.md`, content: 'Proposed artifact' }];
  const model = 'Accepted model\n', baselineDigest = hash(`example.md\0${hash(model)}\n`);
  const candidate = { changeName: 'example', changeId: 'CHG-EXAMPLE', files, proposalDigest: validateProductChangeFiles(files, { changeName: 'example' }).digest, baselineDigest, affectedAreas: [], decisions: [] };
  const snapshot = { issue, stage: 'propose', title: 'Example', defaultBranch: 'main', sourceRevision: base, runId: 'c'.repeat(64), workflowRunId: '100', workflowRevision: base, authorizationDigest: 'd'.repeat(64), policyDigest: 'e'.repeat(64), taskDigest: 'f'.repeat(64) };
  let pr, writes = 0, appliedTree;
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
    if (path === 'issues/18') return { number: 18, state: 'open', labels: [] };
    if (path === 'issues/18/comments?per_page=100') return [];
    if (path === 'issues/18/comments' && method === 'POST') return {};
    throw Error(`Unexpected request: ${method} ${path}`);
  };
  const published = await publishProductChangePullRequest(api, repository, snapshot, candidate, { validation: { provider: 'passed', openSpec: 'passed' }, runUrl: 'https://example.test/run', beforeWrite: async () => {} });
  assert.match(pr.body, /<!-- lighthouse-product-change-review:/);
  assert.match(pr.body, /<!-- lighthouse-product-change-checkpoint:/);
  assert.equal(isProductOnlyPullRequest(pr), true);
  const event = { action: 'created', issue: { number: 7, pull_request: {} }, comment: { id: 9, user: { login: 'owner', type: 'User' }, body: `/product-change approve example ${published.binding.key}` } };
  const before = writes;
  assert.equal((await loadProductApproval(api, { eventName: 'issue_comment', event, owner: 'owner', repository })).approval.reviewKey, published.binding.key);
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
  const result = { head, modelRoot: 'docs/product/model', resultingModelDigest: resultDigest, receipt: { changeId: 'CHG-EXAMPLE', intentId: 'intent', baselineDigest, proposalDigest: candidate.proposalDigest, resultingModelDigest: resultDigest }, files: [{ path: `${root}/product-change/change.md`, content: '---\nid: CHG-EXAMPLE\nstatus: applied\n---\n' }, { path: 'docs/product/model/new.md', content: added }] };
  const beforeApply = writes;
  await assert.rejects(publishProductApply(api, repository, 'owner', dispatch, { ...result, files: result.files.slice(0, 1) }, async () => {}), /do not reproduce/);
  assert.equal(writes, beforeApply, 'An incomplete model is rejected before any write');
  const applied = await publishProductApply(api, repository, 'owner', dispatch, result, async () => {});
  assert.equal(applied.checkpoint.state, 'applied');
  assert.ok(appliedTree.some(file => file.path === 'docs/product/model/new.md' && file.content === added));
});
