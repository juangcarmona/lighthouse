import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProposal, reviewTarget, loadProposalReview, loadProposalFiles, updateProposal, reviewThread, checkReviewCurrent, feedbackKey, feedbackWorker } from '../packages/sdlc/src/proposal-review.mjs';
const repo = 'owner/repo', head = 'a'.repeat(40);
const pr = { number: 60, state: 'open', user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: `lighthouse/propose-47-${'b'.repeat(12)}`, repo: { full_name: repo } }, base: { ref: 'main', repo: { full_name: repo } }, body: `<!-- lighthouse-proposal:${'b'.repeat(64)} -->`, html_url: 'https://github.com/owner/repo/pull/60' };
const comment = { id: 7, body: 'Support phones', user: { login: 'owner', type: 'User' }, issue_url: `https://api.github.com/repos/${repo}/issues/60` };
const event = { issue: { number: 60, pull_request: {} }, comment };

function workflowCorrection() {
  const implementation = structuredClone(pr);
  implementation.head.ref = implementation.head.ref.replace('propose-', 'implement-');
  implementation.base.ref = 'lighthouse/epic-4';
  implementation.body = `<!-- lighthouse-implementation:${'b'.repeat(64)} -->`;
  const event = { inputs: { issue: '47', stage: 'implement', workflow: 'stage', pull_request: '60', head, feedback: 'Complete the open implementation tasks. This does not approve merge.' } };
  const origin = { runId: '90', revision: 'c'.repeat(40) };
  const run = { id: 90, repository: { full_name: repo }, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch', head_sha: origin.revision, head_branch: 'reviewed-controller', actor: { login: 'owner', type: 'User' }, triggering_actor: { login: 'owner', type: 'User' }, status: 'in_progress', conclusion: null, html_url: `https://github.com/${repo}/actions/runs/90` };
  const api = async path => { if (path === 'pulls/60') return implementation; if (path === 'actions/runs/90') return run; throw Error(`Unexpected API read: ${path}`); };
  return { implementation, event, origin, run, api, load: () => loadProposalReview(api, repo, 'owner', event, 'workflow_dispatch', true, origin) };
}

test('an explicit owner workflow corrects the exact existing implementation through apply-review without a comment or approval', async () => {
  const f = workflowCorrection(), review = await f.load();
  assert.equal(reviewTarget(f.event, 'workflow_dispatch'), 60);
  assert.equal(review.head, head); assert.equal(review.base, 'lighthouse/epic-4'); assert.equal(review.kind, 'workflow');
  assert.equal(review.feedback, f.event.inputs.feedback); assert.equal(review.approved, false); assert.equal(feedbackWorker(review), 'apply-review');
  f.run.status = 'completed'; f.run.conclusion = 'success';
  assert.equal(feedbackKey(await f.load()), feedbackKey(review), 'normal source completion must not duplicate a correction');
  await checkReviewCurrent(f.api, repo, review, true);
  f.implementation.head.sha = 'd'.repeat(40);
  await checkReviewCurrent(f.api, repo, review, true, { publishedHead: f.implementation.head.sha });
  await assert.rejects(checkReviewCurrent(f.api, repo, review, true), /changed/);
});

test('workflow corrections refuse another target, source, actor, stage, mixed grant or unbounded input', async () => {
  for (const mutate of [
    f => { f.event.inputs.head = 'd'.repeat(40); }, f => { f.event.inputs.issue = '48'; },
    f => { f.event.inputs.stage = 'integrate'; }, f => { f.event.inputs.workflow = 'product-change'; },
    f => { f.event.inputs.feedback = ' '; }, f => { f.event.inputs.feedback = 'x'.repeat(12001); },
    f => { f.event.inputs.merge = 'true'; }, f => { f.event.inputs.after_run = '12'; },
    f => { f.event.inputs.client_request = '{}'; }, f => { f.origin.runId = undefined; },
    f => { f.run.repository.full_name = 'other/repo'; }, f => { f.run.actor.login = 'other'; },
    f => { f.run.actor.type = 'Bot'; }, f => { f.run.triggering_actor.login = 'other'; },
    f => { f.run.event = 'push'; }, f => { f.run.path = '.github/workflows/other.yml'; },
    f => { f.run.head_sha = 'd'.repeat(40); }, f => { f.run.conclusion = 'cancelled'; },
    f => { f.implementation.user = { login: 'owner', type: 'User' }; },
    f => { f.implementation.head.repo.full_name = 'fork/repo'; },
  ]) { const f = workflowCorrection(); mutate(f); await assert.rejects(f.load()); }
  for (const target of [undefined, '0', '-1', 'bad', '9007199254740992']) assert.throws(() => reviewTarget({ inputs: { feedback: 'Complete', pull_request: target } }, 'workflow_dispatch'), /valid PR/);
  const f = workflowCorrection();
  await assert.rejects(loadProposalReview(f.api, repo, 'owner', f.event, 'workflow_dispatch', false, f.origin));
});

test('publication rejects a revoked workflow or changed feedback without treating normal completion as a change', async () => {
  for (const mutate of [f => { f.run.conclusion = 'failure'; }, f => { f.run.actor.login = 'other'; }, f => { f.run.head_sha = 'd'.repeat(40); }]) {
    const f = workflowCorrection(), review = await f.load(); mutate(f);
    await assert.rejects(checkReviewCurrent(f.api, repo, review, true), /feedback changed/);
  }
  const f = workflowCorrection(), review = await f.load();
  await assert.rejects(checkReviewCurrent(f.api, repo, { ...review, feedback: 'Different instruction' }, true), /feedback changed/);
});

test('only existing bot proposal branches with intact identity can be updated', () => {
  assert.equal(checkProposal(pr, repo).issue, 47);
  for (const bad of [{ ...pr, state: 'closed' }, { ...pr, user: comment.user }, { ...pr, body: '' }, { ...pr, head: { ...pr.head, repo: { full_name: 'fork/repo' } } }]) assert.throws(() => checkProposal(bad, repo));
  assert.throws(() => checkProposal(pr, repo, { ...checkProposal(pr, repo), head: 'c'.repeat(40) }), /changed/);
  assert.equal(reviewTarget(event, 'issue_comment'), 60);
  assert.equal(reviewTarget({ issue: { number: 47 } }, 'issue_comment'), null);
});
test('owner feedback is fetched from source and approvals never request revision', async () => {
  const api = async path => path === 'pulls/60' ? pr : comment;
  assert.equal((await loadProposalReview(api, repo, 'owner', event, 'issue_comment')).feedback, 'Support phones');
  await assert.rejects(loadProposalReview(api, repo, 'other', event, 'issue_comment'), /owner/);
  await assert.rejects(loadProposalReview(async p => p === 'pulls/60' ? pr : { ...comment, issue_url: 'https://api.github.com/owner/repo/issues/61' }, repo, 'owner', event, 'issue_comment'), /another PR/);
  const reviewEvent = { pull_request: { number: 60 }, review: { id: 8 } };
  const review = { ...comment, state: 'APPROVED', commit_id: head };
  const reviewApi = async path => path === 'pulls/60' ? pr : path.endsWith('comments?per_page=100') ? [] : review;
  assert.equal((await loadProposalReview(reviewApi, repo, 'owner', reviewEvent, 'pull_request_review')).approved, true);
  await assert.rejects(loadProposalReview(async p => p === 'pulls/60' ? pr : { ...review, commit_id: 'old' }, repo, 'owner', reviewEvent, 'pull_request_review'), /older/);
});
test('submitted feedback includes every bounded inline request and rejects an older head', async () => {
  const review = { id: 8, user: comment.user, body: 'Address both comments.', state: 'CHANGES_REQUESTED', commit_id: head };
  const inline = [{ path: 'src/app.js', line: 4, body: 'Handle empty input.' }, { path: 'src/app.test.js', original_line: 9, body: 'Cover the empty case.' }];
  const reviewEvent = { pull_request: { number: 60 }, review: { id: 8 } };
  const api = async path => path === 'pulls/60' ? pr : path.endsWith('/comments?per_page=100') ? inline : review;
  const loaded = await loadProposalReview(api, repo, 'owner', reviewEvent, 'pull_request_review');
  assert.equal(loaded.feedback, 'Address both comments.\n\nsrc/app.js:4\nHandle empty input.\n\nsrc/app.test.js:9\nCover the empty case.');
  inline.push(...Array(98).fill(inline[0]));
  await assert.rejects(loadProposalReview(api, repo, 'owner', reviewEvent, 'pull_request_review'), /bounded feedback/);
  inline.length = 2;
  await assert.rejects(loadProposalReview(async path => path === 'pulls/60' ? { ...pr, head: { ...pr.head, sha: 'c'.repeat(40) } } : api(path), repo, 'owner', reviewEvent, 'pull_request_review'), /older/);
});

test('bounded correction conversation includes owner comments, inline requests and reviews only', async () => {
  const own = (id, body, extra = {}) => ({ id, body, user: comment.user, ...extra });
  const rows = {
    'issues/60/comments?per_page=100': [own(1, 'First request.'), own(2, 'Untrusted request.', { user: { login: 'stranger', type: 'User' } }), own(3, 'Bot notice.', { user: { login: 'owner', type: 'Bot' } })],
    'pulls/60/comments?per_page=100': [own(4, 'Inline request.', { path: 'src/app.js' })],
    'pulls/60/reviews?per_page=100': [own(5, 'More detail.', { state: 'COMMENTED' }), own(6, 'Fix this.', { state: 'CHANGES_REQUESTED' }), own(7, 'Approved.', { state: 'APPROVED' }), own(8, 'Dismissed.', { state: 'DISMISSED' })],
  };
  const api = async path => { assert.ok(Object.hasOwn(rows, path), path); return rows[path]; };
  const thread = await reviewThread(api, 60, 'owner');
  assert.deepEqual(thread.map(message => message.id), [1, 4, 5, 6]);
  assert.deepEqual(thread.map(message => message.body), ['First request.', 'Inline request.', 'More detail.', 'Fix this.']);
  rows['pulls/60/comments?per_page=100'] = Array(100).fill(own(4, 'Too many.'));
  await assert.rejects(reviewThread(api, 60, 'owner'), /bounded collection/);
});

test('publication rejects feedback edited or revoked after preparation and a changed head', async () => {
  let currentPr = pr, currentFeedback = comment;
  const api = async path => path === 'pulls/60' ? currentPr : currentFeedback;
  const review = await loadProposalReview(api, repo, 'owner', event, 'issue_comment');
  await checkReviewCurrent(api, repo, review);
  for (const body of ['Different request.', 'Withdrawn.']) {
    currentFeedback = { ...comment, body };
    await assert.rejects(checkReviewCurrent(api, repo, review), /feedback changed/);
  }
  currentFeedback = comment;
  currentPr = { ...pr, head: { ...pr.head, sha: 'c'.repeat(40) } };
  await assert.rejects(checkReviewCurrent(api, repo, review), /changed during review/);
});

test('feedback reloads the provider skip flag without exposing mutable schema metadata', async () => {
  const root = 'openspec/changes/issue-47-proposal';
  const data = { 'proposal.md': '# Proposal', 'design.md': '# Design', 'tasks.md': '- [ ] Correct text', '.openspec.yaml': 'schema: spec-driven\ncreated: 2026-10-31\nskip_specs: true\n' };
  const api = async path => {
    if (path === 'pulls/60/files?per_page=100') return Object.keys(data).map(name => ({ filename: `${root}/${name}`, status: 'modified' }));
    const name = path.split('?')[0].split('/').at(-1);
    return { type: 'file', encoding: 'base64', size: data[name].length, content: Buffer.from(data[name]).toString('base64') };
  };
  const files = await loadProposalFiles(api, { number: 60, issue: 47, head });
  assert.equal(files.find(file => file.path.endsWith('/.openspec.yaml')).content, 'skip_specs: true\n');
  const productApi = async path => path === 'pulls/60/files?per_page=100' ? [...await api(path), { filename: 'docs/product/model/change.md', status: 'added' }] : api(path);
  const productFiles = await loadProposalFiles(productApi, { number: 60, issue: 47, head, productProposal: true });
  assert.deepEqual(productFiles, files);
});

test('publication updates the same branch non-forcibly and rejects a concurrent writer', async () => {
  const files = ['proposal.md', 'design.md', 'tasks.md', 'specs/control/spec.md'].map(name => ({ path: `openspec/changes/issue-47-proposal/${name}`, content: name === 'tasks.md' ? '- [ ] Implement' : '# Proposal' }));
  let changed = false; const writes = [];
  const api = async (path, method, body) => {
    if (path.startsWith('contents/lighthouse.json?ref=')) return null;
    if (method) { writes.push({ path, method, body }); return { sha: 'new' }; }
    if (path === 'pulls/60') return changed ? { ...pr, head: { ...pr.head, sha: 'concurrent' } } : pr;
    if (path === 'issues/comments/7') return comment;
    if (path.endsWith('/files?per_page=100')) return files.map(f => ({ filename: f.path, status: 'added' }));
    if (path.startsWith('contents/')) { const f = files.find(f => path.includes(f.path)); return { type: 'file', encoding: 'base64', size: f.content.length, content: Buffer.from(f.content).toString('base64') }; }
    return { tree: { sha: 'tree' } };
  };
  const proposalReview = await loadProposalReview(api, repo, 'owner', event, 'issue_comment');
  await updateProposal(api, repo, { issue: 47, proposalReview }, files, async () => {});
  assert.deepEqual(writes.at(-1), { path: `git/refs/heads/${pr.head.ref}`, method: 'PATCH', body: { sha: 'new', force: false } });
  writes.length = 0;
  await assert.rejects(updateProposal(api, repo, { issue: 47, proposalReview }, files, async () => { changed = true; }), /changed/);
  assert.equal(writes.some(w => w.path.startsWith('git/refs')), false);
});

test('delayed dispatch of already-handled feedback is a successful no-op', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const dir = await mkdtemp(join(tmpdir(), 'handled-feedback-'));
  try {
    const implementation = { ...pr, head: { ...pr.head, ref: pr.head.ref.replace('propose-', 'implement-') }, body: `<!-- lighthouse-implementation:${'b'.repeat(64)} -->` };
    const review = await loadProposalReview(async path => path === 'pulls/60' ? implementation : comment, repo, 'owner', event, 'issue_comment', true);
    const report = { user: { login: 'github-actions[bot]', type: 'Bot' }, body: review.receipt };
    await writeFile(join(dir, 'event.json'), JSON.stringify(event));
    await writeFile(join(dir, 'mock.mjs'), `globalThis.fetch = async (url, options) => {
      if (options.method !== 'GET') throw Error('Handled feedback must not write or dispatch');
      const value = url.endsWith('/pulls/60') ? ${JSON.stringify(implementation)} : url.endsWith('/issues/comments/7') ? ${JSON.stringify(comment)} : url.endsWith('/issues/60/comments?per_page=100') ? [${JSON.stringify(report)}] : undefined;
      if (!value) throw Error('Unexpected API read: ' + url);
      return { ok: true, status: 200, json: async () => value };
    };`);
    const output = join(dir, 'output');
    const result = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'dispatch-prepare'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: repo, GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: 'owner', GITHUB_TRIGGERING_ACTOR: 'owner', GITHUB_EVENT_NAME: 'issue_comment', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_OUTPUT: output, LIGHTHOUSE_STAGE: 'implement', RUNNER_TEMP: dir, GH_TOKEN: 'fixture' } });
    assert.equal(result.status, 0, result.stderr);
    assert.match(await readFile(output, 'utf8'), /send=false/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('real router ignores owner approval of an unrelated release PR', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const dir = await mkdtemp(join(tmpdir(), 'unrelated-pr-router-'));
  try {
    await writeFile(join(dir, 'event.json'), JSON.stringify({ action: 'submitted', pull_request: { number: 60 }, review: { id: 7, user: { login: 'owner', type: 'User' }, body: '', state: 'approved' } }));
    await writeFile(join(dir, 'mock.mjs'), `globalThis.fetch = async (url) => { if (!url.endsWith('/pulls/60')) throw Error('Unexpected API request: ' + url); return { ok: true, status: 200, json: async () => ({ head: { ref: 'changeset-release/main' } }) }; };`);
    const output = join(dir, 'output');
    const result = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'route'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: repo, GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: 'owner', GITHUB_TRIGGERING_ACTOR: 'owner', GITHUB_EVENT_NAME: 'pull_request_review', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_OUTPUT: output, LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: 'true', RUNNER_TEMP: dir, GH_TOKEN: 'fixture' } });
    assert.equal(result.status, 0, result.stderr);
    assert.match(await readFile(output, 'utf8'), /run=false/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('real router maps a PR comment to its source issue and reports approvals without execution', async () => {
  const { mkdtemp, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const dir = await mkdtemp(join(tmpdir(), 'proposal-router-'));
  try {
    for (const approved of [false, true]) {
      const payload = approved ? { pull_request: { number: 60 }, review: { id: 7 } } : event;
      const feedback = approved ? { ...comment, commit_id: head, state: 'approved' } : comment;
      await writeFile(join(dir, 'event.json'), JSON.stringify(payload));
      await writeFile(join(dir, 'mock.mjs'), `globalThis.fetch = async (url, options) => ({ ok: true, status: 200, json: async () => options.method === 'POST' ? {} : url.endsWith('/pulls/60') ? ${JSON.stringify(pr)} : url.includes('?per_page=100') ? [] : ${JSON.stringify(feedback)} });`);
      const output = join(dir, `output-${approved}`);
      const result = spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'route'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: repo, GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: 'owner', GITHUB_TRIGGERING_ACTOR: 'owner', GITHUB_EVENT_NAME: approved ? 'pull_request_review' : 'issue_comment', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_OUTPUT: output, RUNNER_TEMP: dir, GH_TOKEN: 'fixture' } });
      assert.equal(result.status, 0, result.stderr);
      assert.match(await readFile(output, 'utf8'), new RegExp(`stage=propose\\nworker=propose\\nrun=${!approved}\\nissue=47`));
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
