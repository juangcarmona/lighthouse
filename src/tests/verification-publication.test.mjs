import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { digest } from '../packages/sdlc/src/host-contract.mjs';
import { taskDigest, pendingReply } from '../packages/sdlc/src/issue-actions.mjs';
import { loadImplementation, changesDigest } from '../packages/sdlc/src/implementation.mjs';
import { reviewThread } from '../packages/sdlc/src/proposal-review.mjs';

async function fixture(scenario) {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-verification-'));
  const repository = 'owner/repo', head = 'a'.repeat(40), base = 'b'.repeat(40), identity = 'c'.repeat(64);
  const bot = { login: 'github-actions[bot]', type: 'Bot' };
  const issue = { number: 7, title: 'Existing implementation', body: 'Revalidate the bounded candidate.', state: 'open', labels: [{ name: 'agent-working' }] };
  const pr = { number: 8, state: 'open', merged: false, draft: true, user: bot, head: { sha: head, ref: `lighthouse/implement-7-${identity.slice(0, 12)}`, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${identity} -->`, html_url: 'https://github.com/owner/repo/pull/8' };
  const feedback = { id: 10, body: 'Check the same head without editing source.', user: { login: 'owner', type: 'User' }, updated_at: '2026-11-03T00:00:00Z' };
  const policy = { defaults: { scope: 'Only this candidate.', paths: ['src/'], checks: [['node', '--version']], reviewRequired: false } };
  const content = value => ({ content: Buffer.from(JSON.stringify(value)).toString('base64') });
  const implementation = await loadImplementation(async path => path.includes('implement.json') ? content(policy) : null, 7, 'owner', base, 'main');
  const thread = await reviewThread(async path => path.startsWith('issues/') ? [feedback] : [], 8, 'owner');
  const review = { number: 8, issue: 7, head, branch: pr.head.ref, base: 'main', url: pr.html_url, implementationIdentity: identity, approved: false, path: 'issues/comments/10', feedbackDigest: digest(JSON.stringify(feedback)), threadDigest: digest(JSON.stringify(thread)), receipt: '<!-- lighthouse-review:comment:10:fixture -->' };
  const snapshot = { repository, issue: 7, stage: 'implement', worker: 'apply-review', runId: digest('verification-fixture'), workflowRunId: '200', sourceRevision: head, baseRevision: base, defaultBranch: 'main', taskDigest: taskDigest(issue, []), implementation, implementationReview: review };
  const blocked = ['failed', 'unavailable', 'pending', 'question'].includes(scenario);
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: snapshot.runId, stage: 'implement', gate: 'done', status: blocked ? 'blocked' : 'passed', evidence: [], missingEvidence: scenario === 'failed' ? ['Failed check'] : [], unavailableChecks: scenario === 'unavailable' ? ['Check unavailable'] : [], pendingReview: scenario === 'pending' ? ['Owner acceptance'] : [], nextAction: 'Review the existing candidate.' }, effect: { type: 'issue-comment', body: 'Candidate verified without edits.' } };
  const receipt = { runId: snapshot.runId, sourceRevision: head, changesDigest: changesDigest([]), checks: implementation.policy.checks.map(command => ({ command, exitCode: scenario === 'failed' ? 1 : 0 })) };
  if (scenario === 'question') {
    envelope.result.output = { handoff: { question: 'Which exact paragraph should replace this text?' } };
    envelope.result.pendingReview = ['Replacement wording'];
    envelope.effect.body = 'The replacement wording is missing; no files changed.';
  }
  if (scenario === 'forged-pass') receipt.checks[0].exitCode = 1;
  if (scenario === 'initial') { delete snapshot.implementationReview; delete snapshot.worker; }
  if (scenario === 'stale-receipt') receipt.sourceRevision = base;
  for (const [name, value] of Object.entries({ 'request.json': snapshot, 'envelope.json': envelope, 'checks.json': receipt, 'changes.json': [], 'event.json': {}, 'state.json': { scenario, issue, pr, feedback, policy, base, comments: [], prComments: [feedback], calls: [] } })) await writeFile(join(dir, name), JSON.stringify(value));
  await writeFile(join(dir, 'mock.mjs'), `
import { readFileSync, writeFileSync } from 'node:fs';
const file = ${JSON.stringify(join(dir, 'state.json'))};
globalThis.fetch = async (url, options) => {
  const s = JSON.parse(readFileSync(file)), path = url.replace('https://api.github.com/repos/owner/repo', '').replace(/^\\//, ''), method = options.method;
  const body = options.body ? JSON.parse(options.body) : undefined;
  s.calls.push({ path, method, body });
  let value;
  if (path === '') value = { default_branch: 'main' };
  else if (path === 'commits/main') value = { sha: s.base };
  else if (path === 'issues/7') value = s.issue;
  else if (path.startsWith('issues/7/comments?')) value = s.comments;
  else if (path === 'pulls/8') value = s.pr;
  else if (path === 'issues/comments/10') value = s.feedback;
  else if (path.startsWith('pulls?')) value = [s.pr];
  else if (path.startsWith('issues/8/comments?')) value = s.prComments;
  else if (path.startsWith('pulls/8/comments?') || path.startsWith('pulls/8/reviews?')) value = [];
  else if (path.includes('contents/.lighthouse/implement.json')) value = { content: Buffer.from(JSON.stringify(s.policy)).toString('base64') };
  else if (path.includes('contents/.lighthouse/environment.json') || path.includes('contents/.lighthouse/github.json')) return { ok: false, status: 404 };
  else if (path === 'issues/7/labels' && method === 'POST') {
    s.issue.labels.push(...body.labels.map(name => ({ name }))); value = s.issue.labels;
    if (s.scenario === 'head-race') s.pr.head.sha = 'd'.repeat(40);
    if (s.scenario === 'intent-race') s.issue.body = 'Different work';
    if (s.scenario === 'policy-race') s.policy.defaults.scope = 'Different scope';
    if (s.scenario === 'identity-race') s.pr.body = s.pr.body.replace(/c{64}/, 'c'.repeat(63) + 'd');
    if (s.scenario === 'feedback-race') s.feedback.body = 'Revoked';
  }
  else if (path.startsWith('issues/7/labels/') && method === 'DELETE') { s.issue.labels = s.issue.labels.filter(x => x.name !== path.split('/').at(-1)); value = []; }
  else if (['issues/7/comments', 'issues/8/comments'].includes(path) && method === 'POST') {
    value = { id: s.calls.length + 100, user: ${JSON.stringify(bot)}, body: body.body, html_url: 'https://github.com/owner/repo/issues/7#comment' };
    (path === 'issues/7/comments' ? s.comments : s.prComments).push(value);
  }
  else throw Error('Unexpected API: ' + method + ' ' + path);
  writeFileSync(file, JSON.stringify(s));
  if (s.scenario === 'lost-response' && path === 'issues/7/comments' && method === 'POST' && s.comments.length === 1 && !s.lost) { s.lost = true; writeFileSync(file, JSON.stringify(s)); throw Error('Committed response lost'); }
  return { ok: true, status: 200, json: async () => value };
};`);
  const run = () => spawnSync(process.execPath, ['--import', join(dir, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'publish'], { encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_EVENT_PATH: join(dir, 'event.json'), GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '1', LIGHTHOUSE_ISSUE: '7', LIGHTHOUSE_RUN_DIR: dir, GH_TOKEN: 'fixture' } });
  return { dir, run, head, state: async () => JSON.parse(await readFile(join(dir, 'state.json'))) };
}

test('ambiguous implementation feedback asks on the existing PR without authorizing an initial issue-stage restart', async () => {
  const f = await fixture('question');
  try {
    const result = f.run(), state = await f.state();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const report = state.comments.find(c => c.body.includes('lighthouse-actions:'));
    assert.match(report.body, /Which exact paragraph.*Reply on PR #8/);
    assert.doesNotMatch(report.body, /<!-- lighthouse-question -->/);
    assert.equal(pendingReply({ comment: { body: 'The wording.', created_at: '2026-11-03T01:00:00Z' } }, [report]), null);
    const notice = state.prComments.find(c => c.body.includes('lighthouse-review:'));
    assert.match(notice.body, /Waiting for your answer/);
    assert.match(notice.body, /Which exact paragraph.*Reply here/);
    assert.equal(state.pr.head.sha, f.head);
    assert.equal(state.calls.some(c => c.path.startsWith('git/') || c.path === 'pulls'), false);
  } finally { await rm(f.dir, { recursive: true, force: true }); }
});

test('production publisher renews same-head completion, preserves blockers and rejects changed authority', async t => {
  for (const scenario of ['passed', 'failed', 'unavailable', 'pending', 'initial', 'forged-pass', 'stale-receipt', 'head-race', 'intent-race', 'policy-race', 'identity-race', 'feedback-race', 'lost-response']) await t.test(scenario, async () => {
    const f = await fixture(scenario);
    try {
      const result = f.run(), s = await f.state();
      const success = ['passed', 'failed', 'unavailable', 'pending'].includes(scenario);
      assert.equal(result.status, success ? 0 : 1, result.stdout + result.stderr);
      assert.equal(s.calls.some(c => c.path.startsWith('git/') || c.path === 'pulls'), false, 'No new commit, branch, PR or history rewrite');
      const proofs = s.comments.filter(c => c.body.includes('lighthouse-pr-state:'));
      if (!success && scenario !== 'lost-response') { assert.equal(proofs.length, 0); return; }
      assert.equal(proofs.length, 1);
      const proof = JSON.parse(proofs[0].body.match(/<!-- lighthouse-pr-state:(\{[^\n]*\}) -->/)[1]);
      assert.equal(proof.head, f.head);
      assert.equal(proof.complete, scenario === 'passed' || scenario === 'lost-response');
      assert.equal(proof.run, 200);
      const notice = s.prComments.find(c => c.body.includes('lighthouse-review:'));
      assert.match(notice.body, scenario === 'passed' || scenario === 'lost-response' ? /Queued/ : /Blocked/);
      const writes = s.calls.filter(c => c.method !== 'GET').length;
      assert.equal(f.run().status, 0);
      assert.equal((await f.state()).calls.filter(c => c.method !== 'GET').length, writes);
    } finally { await rm(f.dir, { recursive: true, force: true }); }
  });
});
