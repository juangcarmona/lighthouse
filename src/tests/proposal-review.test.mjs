import test from 'node:test';
import assert from 'node:assert/strict';
import { checkProposal, reviewTarget, loadProposalReview, updateProposal } from '../packages/sdlc/src/proposal-review.mjs';
const repo = 'owner/repo', head = 'a'.repeat(40);
const pr = { number: 60, state: 'open', user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: `lighthouse/propose-47-${'b'.repeat(12)}`, repo: { full_name: repo } }, base: { ref: 'main', repo: { full_name: repo } }, body: `<!-- lighthouse-proposal:${'b'.repeat(64)} -->`, html_url: 'https://github.com/owner/repo/pull/60' };
const comment = { id: 7, body: 'Support phones', user: { login: 'owner', type: 'User' }, issue_url: `https://api.github.com/repos/${repo}/issues/60` };
const event = { issue: { number: 60, pull_request: {} }, comment };
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
test('publication updates the same branch non-forcibly and rejects a concurrent writer', async () => {
  const files = ['proposal.md', 'design.md', 'tasks.md', 'specs/control/spec.md'].map(name => ({ path: `openspec/changes/issue-47-proposal/${name}`, content: name === 'tasks.md' ? '- [ ] Implement' : '# Proposal' }));
  let changed = false; const writes = [];
  const api = async (path, method, body) => {
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
