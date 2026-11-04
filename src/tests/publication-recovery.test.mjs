import test from 'node:test';
import assert from 'node:assert/strict';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { changesDigest, loadImplementation } from '../packages/sdlc/src/implementation.mjs';
import { reconcilePublishedCi } from '../packages/sdlc/src/publication-recovery.mjs';

const repository = 'owner/repo', owner = 'owner', revision = 'a'.repeat(40), head = 'b'.repeat(40), identity = 'c'.repeat(64);
const file = value => ({ content: Buffer.from(JSON.stringify(value)).toString('base64') });
async function fixture() {
  const issue = { number: 7, title: 'Bounded fixture', body: 'Verify this candidate.', state: 'open', user: { login: owner }, labels: [] };
  const pr = { number: 60, state: 'open', merged: false, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: `lighthouse/implement-7-${identity.slice(0, 12)}`, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${identity} -->` };
  const run = { id: 200, run_attempt: 1, status: 'completed', conclusion: 'success' };
  const parent = { id: 300, run_attempt: 1, path: '.github/workflows/lighthouse-worker-maintenance.yml', repository: { full_name: repository }, event: 'workflow_dispatch', actor: { login: owner }, triggering_actor: { login: owner }, status: 'completed' };
  const report = { id: 20, user: { login: 'github-actions[bot]', type: 'Bot' }, body: `<!-- lighthouse-pr-state:{"pr":60,"head":"${head}","complete":true,"run":200} -->` };
  const comments = [report], writes = [], stored = new Map();
  let runs = [], requests = [{ schemaVersion: 1, pr: 60, head, branch: pr.head.ref, workflow: 'verify.yml', attempt: 1, state: 'not-sent', observedAt: '2020-01-01T00:00:00Z' }];
  const api = async (path, method = 'GET', body) => {
    if (method !== 'GET') {
      writes.push({ path, method, body });
      if (path === 'issues/7/comments') { const comment = { id: 21, user: report.user, body: body.body }; comments.push(comment); return comment; }
      if (path === 'issues/comments/21') { comments[1].body = body.body; return comments[1]; }
      if (path.endsWith('/dispatches')) return null;
      throw Error(path);
    }
    if (path === 'pulls/60') return pr;
    if (path === 'pulls/60/reviews?per_page=100') return [];
    if (path === 'issues/7') return issue;
    if (path.startsWith('issues/7/comments?')) return comments;
    if (path === 'commits/main') return { sha: revision };
    if (path.startsWith('actions/runs/300')) return parent;
    if (path.startsWith('contents/.lighthouse/environment.json')) return null;
    if (path.startsWith('contents/.lighthouse/github.json')) return file({ completion: { postMergeWorkflows: ['verify.yml'] } });
    if (path.startsWith('contents/.lighthouse/implement.json')) return file({ defaults: { scope: 'Bounded fixture.', paths: ['docs/'], checks: [['node', '--test']], reviewRequired: false } });
    if (path.includes('/runs?')) return { total_count: runs.length, workflow_runs: runs };
    throw Error(path);
  };
  const request = { runId: identity, issue: 7, stage: 'implement', workflowRunId: '200', sourceRevision: revision, taskDigest: digest(JSON.stringify({ title: issue.title, body: issue.body, comments: [] })), implementation: await loadImplementation(api, 7, owner, revision, 'main') };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: identity, stage: 'implement', gate: 'done', status: 'passed', evidence: [{ id: 'host', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Wait for CI.' }, effect: { type: 'issue-comment', body: 'Candidate checked.' } };
  const receipt = { runId: identity, sourceRevision: revision, changesDigest: changesDigest([]), checks: request.implementation.policy.checks.map(command => ({ command, exitCode: 0 })) };
  const readArtifact = async (_api, _repo, _run, _artifact, name) => ({ 'published-pr.json': { number: 60, head }, 'changes.json': [], 'checks.json': receipt, 'ci-requests.json': requests, 'ci-recovery.json': stored.get('state') })[name];
  const options = { readArtifact, readReport: async () => ({ request, envelope }), save: async value => stored.set('state', structuredClone(value)) };
  const call = (enabled = true) => reconcilePublishedCi(api, repository, owner, issue, comments, { dispatch: { request, commentId: 10 }, run, revision }, parent, enabled, Date.now(), options);
  return { issue, request, comments, writes, call, setRequests: value => { requests = value; }, setRuns: value => { runs = value; }, pr };
}

test('confirmed publication recovers only CI and coalesces maintenance replay', async () => {
  const f = await fixture();
  assert.equal((await f.call(false)).code, 'ci-recovery-disabled');
  assert.equal(f.writes.length, 0);
  assert.equal((await f.call()).code, 'ci-requested');
  assert.equal(f.writes.filter(write => write.path.endsWith('/dispatches')).length, 1);
  assert.equal((await f.call()).code, 'ci-start-unconfirmed');
  assert.equal(f.writes.filter(write => write.path.endsWith('/dispatches')).length, 1);
  f.setRuns([{ id: 400, head_sha: head, head_branch: f.pr.head.ref, path: '.github/workflows/verify.yml', event: 'workflow_dispatch', repository: { full_name: repository } }]);
  assert.equal((await f.call()).code, 'ci-observed');
  assert.equal(f.writes.filter(write => write.path.endsWith('/dispatches')).length, 1);
  assert.equal(f.writes.some(write => /git\/|\/merge/.test(write.path)), false);
});

test('legacy missing send-state, changed authority and paused candidates never resend CI', async () => {
  for (const mode of ['legacy', 'intent', 'paused']) {
    const f = await fixture();
    if (mode === 'legacy') f.setRequests(null);
    if (mode === 'intent') f.issue.body = 'Changed owner intent.';
    if (mode === 'paused') f.issue.labels = [{ name: 'future' }];
    const result = await f.call();
    assert.equal(result?.code ?? null, mode === 'legacy' ? 'ci-request-evidence-missing' : mode === 'intent' ? 'authority-changed' : null);
    assert.equal(f.writes.length, 0);
  }
});
