import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { replayEpicProduct, verifyAppliedEpicProduct, adoptEpicProductSource, checkEpicProductApproval, loadEpicProductSource } from '../packages/sdlc/src/epic-product-source.mjs';
import { checkEpicProductReceipt } from '../packages/sdlc/src/epic-journal.mjs';
import { collectChanges } from '../packages/sdlc/src/implementation.mjs';
import { dispatchIntent } from '../packages/sdlc/src/stage-dispatch.mjs';
import { epicCorrelation, epicJournalKey } from '../packages/sdlc/src/epic-github.mjs';

const repository = 'owner/repo', owner = 'owner', child = 18, head = 'b'.repeat(40);
const hash = value => createHash('sha256').update(value).digest('hex');
const file = (path, content) => ({ path, mode: '100644', content: Buffer.from(content).toString('base64') });

async function productFixture() {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-product-replay-test-'));
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git(['init', '--quiet']); git(['config', 'user.name', 'Synthetic owner']); git(['config', 'user.email', 'synthetic@example.test']);
  await mkdir(join(root, '.product')); await mkdir(join(root, 'docs/product/model/actors'), { recursive: true });
  await writeFile(join(root, '.product/config.yaml'), 'version: v1alpha2\nproduct-root: docs/product\n');
  const path = 'docs/product/model/actors/act-example.md';
  const old = '---\nid: ACT-EXAMPLE\ntype: actor\ntitle: Example owner\nstatus: active\nactor-kind: human\n---\n\n## Purpose\n\nReview the example.\n\n## Goals\n\nRetain explicit authority.\n\n## Responsibilities\n\nApprove product intent.\n\n## Boundaries\n\nMerge remains separate.\n';
  await writeFile(join(root, path), old); git(['add', '.']); git(['commit', '--quiet', '-m', 'Synthetic baseline']);
  const base = git(['rev-parse', 'HEAD']).trim();
  const manifest = `---\nid: CHG-EXAMPLE\ntype: product-change\ntitle: Clarify the example review\nstatus: applied\nbase-revision: '${base}'\noperations:\n  add: []\n  modify: [ACT-EXAMPLE]\n  remove: []\n---\n\n## Problem\n\nClarify the example review.\n\n## Intended Product Outcome\n\nReview the complete example.\n\n## Rationale\n\nThe owner approved this exact delta.\n\n## Affected Product Areas\n\nExample actor.\n\n## Open Questions\n\nNone.\n\n## Product Acceptance\n\nThe complete example is reviewed.\n\n## Out of Scope\n\nMerge and deployment.\n`;
  const files = [file('docs/product/changes/completed/example/change.md', manifest), file(path, old.replace('Review the example.', 'Review the complete example.'))];
  return { root, base, files, git, options: { root, base, changeName: 'example', files } };
}

test('trusted ProductShape replay reproduces the complete applied patch without changing its source checkout', async () => {
  const f = await productFixture();
  try {
    const result = await verifyAppliedEpicProduct(f.options);
    assert.equal(result.changeId, 'CHG-EXAMPLE'); assert.equal(result.validated, true);
    assert.equal(result.filesDigest, hash(JSON.stringify(f.files))); assert.equal(result.version, '0.25.0');
    assert.equal(f.git(['status', '--porcelain']), ''); assert.equal(f.git(['rev-parse', 'HEAD']).trim(), f.base);
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

test('product replay refuses unsafe scope, malformed content, false applied manifests and missing provider operations', async () => {
  const f = await productFixture();
  try {
    for (const files of [
      [...f.files, file('src/unauthorized.mjs', 'unapproved code')],
      [...f.files, file('docs/product/model/../escape.md', 'escape')],
      [...f.files, f.files[1]],
      f.files.map((value, i) => i ? { ...value, mode: '100755' } : value),
      f.files.map((value, i) => i ? { ...value, content: 'invalid!' } : value),
      f.files.map((value, i) => i ? value : file(value.path, Buffer.from(value.content, 'base64').toString().replace('status: applied', 'status: proposed'))),
      f.files.map((value, i) => i ? value : file(value.path, Buffer.from(value.content, 'base64').toString().replace(f.base, 'a'.repeat(40)))),
      f.files.map((value, i) => i ? value : file(value.path, Buffer.from(value.content, 'base64').toString().replace('modify: [ACT-EXAMPLE]', 'modify: [ACT-MISSING]'))),
      [...f.files, file('docs/product/model/actors/act-unapproved.md', 'unapproved artifact')],
    ]) await assert.rejects(verifyAppliedEpicProduct({ ...f.options, files }));
    await assert.rejects(verifyAppliedEpicProduct({ ...f.options, base: 'a'.repeat(40) }), /checkout/);
    assert.equal(f.git(['status', '--porcelain']), '');
  } finally { await rm(f.root, { recursive: true, force: true }); }
});

function adoptionFixture() {
  const base = 'a'.repeat(40), source = 'c'.repeat(40);
  const content = Buffer.from('synthetic provider fixture');
  const blob = createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
  const current = { parent: 146, slice: 'B', planDigest: 'e'.repeat(64), base: 'lighthouse/epic-146', sourceRevision: source };
  const files = [file('docs/product/changes/completed/example/change.md', 'synthetic provider fixture')];
  const product = { child, approval: 40, base, head, changeName: 'example', changeId: 'CHG-EXAMPLE', filesDigest: hash(JSON.stringify(files)), provider: '@prodshape/core', version: '0.25.0' };
  const approval = { id: 40, user: { login: owner, type: 'User' }, created_at: '2026-11-17T00:00:00Z', updated_at: '2026-11-17T00:00:00Z', body: `/epic-product approve ${child} example ${head} ${base}`, issue_url: `https://api.github.com/repos/${repository}/issues/22` };
  const pr = { id: 220, number: 22, state: 'open', merged: false, user: { login: owner, type: 'User' }, head: { sha: head, repo: { full_name: repository } }, base: { ref: current.base, repo: { full_name: repository } } };
  const writes = []; let receipt = null;
  const state = { base, pr, comments: [approval], tree: { tree: [{ path: files[0].path, type: 'blob', mode: '100644', sha: blob }], truncated: false } };
  const api = async path => {
    if (path === `git/ref/heads/${current.base}`) return { object: { sha: state.base } };
    if (path === 'pulls/22') return state.pr;
    if (path === `compare/${base}...${head}`) return { status: 'ahead', merge_base_commit: { sha: base }, total_commits: 1, files: [{ filename: files[0].path, status: 'added' }] };
    if (path === `git/trees/${base}?recursive=1`) return { tree: [], truncated: false };
    if (path === `git/trees/${head}?recursive=1`) return state.tree;
    if (path === `git/blobs/${blob}`) return { encoding: 'base64', size: Buffer.from(files[0].content, 'base64').length, content: files[0].content };
    if (path.startsWith('issues/22/comments?')) return state.comments;
    if (path === 'pulls?state=open&per_page=100') return [state.pr];
    if (path.startsWith('issues/146/comments?')) return [];
    assert.fail(path);
  };
  const options = { api, repository, owner, child, current, root: 'synthetic-root', decision: { pr: 22, approval: 40, head, base, changeName: 'example' }, journal: { readReceipt: async () => receipt, writeReceipt: async (_key, value) => { receipt = structuredClone(value); writes.push(receipt); } }, authorize: async () => true, verify: async () => ({ ...product, validated: true }) };
  return { state, product, approval, pr, writes, options, current };
}

test('owner-authored product source receives its own journal provenance, without a child publication or merge', async () => {
  const f = adoptionFixture();
  const result = await adoptEpicProductSource(f.options);
  assert.equal(result.status, 'linked'); assert.equal(result.productSource, true);
  assert.deepEqual(f.writes.map(value => value.state), ['intent', 'created', 'linked']);
  assert.equal(f.writes[2].correlation.kind, 'product-source'); assert.deepEqual(f.writes[2].product, f.product);
  assert.equal(f.writes[2].publication, undefined); assert.equal(f.writes[2].merge, undefined);
  await adoptEpicProductSource(f.options); assert.equal(f.writes.length, 3);
});

test('product adoption stops before journal writes when approval, source, base, tree or provider proof changes', async () => {
  for (const change of [
    f => { f.state.base = '9'.repeat(40); },
    f => { f.pr.head.sha = '9'.repeat(40); },
    f => { f.approval.user.login = 'other'; },
    f => { f.approval.updated_at = '2026-11-17T00:01:00Z'; },
    f => { f.approval.body += ' implicit approval'; },
    f => { f.state.comments.push({ ...f.approval, id: 41, body: '/epic-product revoke' }); },
    f => { f.state.tree.truncated = true; },
    f => { f.state.tree.tree[0].mode = '120000'; },
    f => { f.options.verify = async () => ({ ...f.product, validated: false }); },
    f => { f.options.verify = async () => ({ ...f.product, validated: true, filesDigest: '0'.repeat(64) }); },
    f => { f.options.authorize = async () => false; },
  ]) {
    const f = adoptionFixture(); change(f);
    await assert.rejects(adoptEpicProductSource(f.options)); assert.equal(f.writes.length, 0);
  }
});

test('the product source is part of dispatch identity and absent sources preserve the existing path', async () => {
  const f = adoptionFixture();
  assert.deepEqual(checkEpicProductReceipt(f.product), f.product);
  assert.throws(() => checkEpicProductReceipt({ ...f.product, approved: true }));
  await checkEpicProductApproval(f.options.api, { repository, owner, pr: f.pr, product: f.product });
  const request = { repository, issue: child, stage: 'triage', taskDigest: 'f'.repeat(64), sourceRevision: f.current.sourceRevision, epic: f.current };
  assert.notEqual(dispatchIntent(request), dispatchIntent({ ...request, epicProduct: f.product }));
  assert.equal(await loadEpicProductSource({ ...f.options }), null);
});


test('implementation preserves the approved product history and still cannot edit the product model', () => {
  const path = 'docs/product/changes/completed/example/change.md';
  const before = new Map([[path, { mode: '100644', content: Buffer.from('approved evidence') }]]);
  const after = new Map(before); after.set(path, { mode: '100644', content: Buffer.from('rewrite') });
  assert.throws(() => collectChanges(before, after, { paths: ['*'] }, { changeName: 'example' }), /approved Product Change evidence/);
  after.delete(path);
  assert.throws(() => collectChanges(before, after, { paths: ['*'] }, { changeName: 'example' }), /approved Product Change evidence/);
  after.set('docs/product/model/actors/act-example.md', { mode: '100644', content: Buffer.from('unapproved') });
  assert.throws(() => collectChanges(new Map(), after, { paths: ['*'] }, { changeName: 'example' }), /accepted product model/);
});

function authenticatedSourceFixture() {
  const f = adoptionFixture();
  const correlation = epicCorrelation({ ...f.current, repository, dependencies: [], kind: 'product-source' });
  const key = epicJournalKey(correlation), revision = f.current.sourceRevision;
  const run = { id: 100, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-epic.yml', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', actor: { login: owner }, triggering_actor: { login: owner }, repository: { full_name: repository }, head_sha: '6'.repeat(40), head_branch: 'operator' };
  const receipt = { schemaVersion: 1, state: 'linked', correlation, resource: { id: f.pr.id, number: f.pr.number }, product: f.product };
  const entry = { schemaVersion: 1, repository, parent: f.current.parent, revision, workflowRevision: run.head_sha, workflowRef: run.head_branch, runId: String(run.id), attempt: 1, key, receipt };
  const comment = { id: 90, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repository}/issues/${f.current.parent}`, body: `<!-- lighthouse-epic-product-source:${JSON.stringify(entry)} -->` };
  const artifact = { schemaVersion: 1, repository, parent: f.current.parent, revision, workflowRevision: run.head_sha, workflowRef: run.head_branch, runId: String(run.id), attempt: 1, entries: { [key]: { commentId: comment.id, receipt: structuredClone(receipt) } } };
  const record = { schemaVersion: 1, repository, parent: f.current.parent, runId: String(run.id), attempt: 1, workflowRevision: run.head_sha, workflowRef: run.head_branch, action: 'adopt-product', result: { status: 'linked', parent: f.current.parent, child, pullRequest: f.pr.number, head: f.product.head, base: f.product.base, productSource: true, affectedCitations: [] } };
  const state = { ...f.state, run, comment, artifact, record, comments: [comment] };
  const api = async path => {
    if (!path) return { default_branch: 'main' };
    if (path.startsWith('issues/146/comments?')) return state.comments;
    if (path === 'actions/runs/100/attempts/1') return run;
    return f.options.api(path);
  };
  const readArtifact = async (_api, _repo, id, name, file) => {
    assert.equal(id, '100');
    if (name === 'lighthouse-epic-journal-146-1' && file === 'journal.json') return artifact;
    if (name === 'lighthouse-epic-action-146-1' && file === 'result.json') return record;
    assert.fail(`${name}/${file}`);
  };
  return { ...f, state, key, options: { ...f.options, api, readArtifact } };
}

test('applied product source admission requires retained bot provenance and the successful owner provider action', async () => {
  const f = authenticatedSourceFixture();
  assert.deepEqual(await loadEpicProductSource(f.options), { ...f.product, pullRequest: f.pr.number });
  assert.ok(!f.state.comment.body.includes('<!-- lighthouse-epic-journal:'), 'older journal readers must not mistake product sources for child merges');
  for (const change of [
    f => { f.state.run.conclusion = 'failure'; },
    f => { f.state.run.actor.login = 'other'; },
    f => { f.state.record.action = 'reconcile'; },
    f => { f.state.record.result.head = '9'.repeat(40); },
    f => { f.state.record.result.child++; },
    f => { f.state.artifact.entries[f.key].receipt.product.head = '9'.repeat(40); },
    f => { f.pr.head.sha = '9'.repeat(40); },
    f => { f.pr.base.ref = 'main'; },
    f => { f.approval.updated_at = '2026-11-17T00:01:00Z'; },
    f => { f.state.comments.push({ ...f.state.comment, id: 91 }); },
  ]) {
    const candidate = authenticatedSourceFixture(); change(candidate);
    await assert.rejects(loadEpicProductSource(candidate.options));
  }
  const copied = authenticatedSourceFixture(); copied.state.comment.user.login = 'other';
  assert.equal(await loadEpicProductSource(copied.options), null);
});


test('native provider replay excludes publisher and model credentials from its actual child process', async () => {
  const f = await productFixture();
  const previous = { GH_TOKEN: process.env.GH_TOKEN, OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  try {
    process.env.GH_TOKEN = 'synthetic-publisher-secret'; process.env.OPENAI_API_KEY = 'synthetic-model-secret';
    const result = await replayEpicProduct(f.options);
    assert.equal(result.validated, true); assert.equal(result.filesDigest, hash(JSON.stringify(f.files)));
    assert.deepEqual(result.affectedCitations, []); assert.equal(f.git(['status', '--porcelain']), '');
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await rm(f.root, { recursive: true, force: true });
  }
});
