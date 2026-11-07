import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createImplementationPullRequest } from '../packages/sdlc/src/implementation.mjs';
import { checkImplementationPullRequest, checkProposal } from '../packages/sdlc/src/proposal-review.mjs';
import { createProposalPullRequest } from '../packages/sdlc/src/proposal.mjs';

const conventional = '^(feat|fix|docs|refactor|test|chore|build|ci|perf|revert)/[1-9]\\d*-[a-z0-9]+(?:-[a-z0-9]+)*$';
const source = 'b'.repeat(40), identity = 'a'.repeat(64), repository = 'owner/repo';
const snapshot = { issue: 18, runId: identity, sourceRevision: source, repository, title: 'Characterize existing behavior', defaultBranch: 'main', implementation: { policy: { scope: 'Only the requested change.', paths: ['src/'], checks: [['node', '--test']], reviewRequired: false } } };
const change = { path: 'src/feature.mjs', mode: '100644', content: Buffer.from('export const value = 2;').toString('base64') };

function fixture(pattern) {
  const calls = [];
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (path.startsWith('contents/lighthouse.json?ref=')) {
      assert.equal(path, `contents/lighthouse.json?ref=${source}`);
      return { type: 'file', encoding: 'base64', content: Buffer.from(JSON.stringify({ repository: { conventions: { branchPattern: pattern } } })).toString('base64') };
    }
    if (path.startsWith('git/commits/')) return { tree: { sha: 'tree-base' } };
    if (path === 'pulls') return { number: 60, ...body };
    return { sha: 'created' };
  };
  return { api, calls, publish: () => createImplementationPullRequest(api, snapshot, [change], 'Verified.', 'https://example.test/run/123', true, async () => {}) };
}

test('native publication creates a branch accepted by the adopted conventional policy', async () => {
  const f = fixture(conventional), pr = await f.publish();
  assert.match(pr.head, new RegExp(conventional, 'u'));
  assert.match(pr.head, /^chore\/18-lighthouse-implement-a{12}$/);
  const manifestRead = f.calls.findIndex(c => c.path.startsWith('contents/lighthouse.json'));
  assert.ok(manifestRead >= 0 && manifestRead < f.calls.findIndex(c => c.method === 'POST'));
});

test('a rejecting custom branch policy stops before any publication write', async () => {
  const f = fixture('^team/[0-9]+-approved$');
  await assert.rejects(f.publish(), /branch.*policy|branch.*pattern/i);
  assert.equal(f.calls.some(c => c.method !== 'GET'), false);
});

test('an explicitly accepted native prefix retains its existing branch format', async () => {
  const f = fixture('^lighthouse/implement-[1-9][0-9]*-[a-f0-9]{12}$');
  assert.equal((await f.publish()).head, 'lighthouse/implement-18-aaaaaaaaaaaa');
});

test('proposal publication follows the same adopter branch policy before creating Git objects', async () => {
  const files = [{ path: 'openspec/changes/issue-18-proposal/proposal.md', content: '# Approved scope\n' }];
  const f = fixture(conventional);
  const pr = await createProposalPullRequest(f.api, snapshot, files, 'Proposal.', '', async () => {});
  assert.equal(pr.head, 'docs/18-lighthouse-propose-aaaaaaaaaaaa');
  const denied = fixture('^team/[0-9]+-approved$');
  await assert.rejects(createProposalPullRequest(denied.api, snapshot, files, 'Proposal.', '', async () => {}), /branch.*policy|branch.*pattern/i);
  assert.equal(denied.calls.some(c => c.method !== 'GET'), false);
});

test('existing PR correction stops on a changed branch policy instead of replacing its branch', async () => {
  const f = fixture(conventional);
  const review = { number: 60, branch: 'lighthouse/implement-18-aaaaaaaaaaaa' };
  await assert.rejects(createImplementationPullRequest(f.api, { ...snapshot, implementationReview: review }, [change], 'Correction.', '', true, async () => {}), /branch.*policy|branch.*pattern/i);
  assert.equal(f.calls.some(c => c.method !== 'GET'), false);
});

test('malformed branch policies fail before any write', async () => {
  for (const pattern of [null, 17, '[', '']) {
    const f = fixture(pattern);
    await assert.rejects(f.publish(), /branch.*policy|branch.*pattern/i);
    assert.equal(f.calls.some(c => c.method !== 'GET'), false);
  }
});

test('a detached checkout cannot bypass the adopted publication branch policy', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-detached-publication-')), previous = process.cwd();
  try {
    const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git(['init']);
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '--allow-empty', '-m', 'test: seed']);
    git(['checkout', '--detach']);
    assert.equal(git(['branch', '--show-current']).trim(), '');
    process.chdir(root);
    const f = fixture('^team/[0-9]+-approved$');
    await assert.rejects(f.publish(), /branch.*policy|branch.*pattern/i);
    assert.equal(f.calls.some(c => c.method !== 'GET'), false);
  } finally { process.chdir(previous); await rm(root, { recursive: true, force: true }); }
});

test('conventional native branches retain exact marker, repository and bot identity checks', () => {
  const pr = { number: 60, state: 'open', merged: false, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: source, ref: 'chore/18-lighthouse-implement-aaaaaaaaaaaa', repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${identity} -->` };
  assert.equal(checkImplementationPullRequest(pr, repository).implementationIdentity, identity);
  for (const variant of [
    { ...pr, head: { ...pr.head, ref: 'chore/19-lighthouse-implement-bbbbbbbbbbbb' } },
    { ...pr, head: { ...pr.head, ref: 'docs/18-lighthouse-implement-aaaaaaaaaaaa' } },
    { ...pr, user: { login: 'other', type: 'User' } },
    { ...pr, head: { ...pr.head, repo: { full_name: 'other/repo' } } },
  ]) assert.throws(() => checkImplementationPullRequest(variant, repository));
  const proposal = { ...pr, head: { ...pr.head, ref: 'docs/18-lighthouse-propose-aaaaaaaaaaaa' }, body: `<!-- lighthouse-proposal:${identity} -->` };
  assert.equal(checkProposal(proposal, repository).issue, 18);
});
