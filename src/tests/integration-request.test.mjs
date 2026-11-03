import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { integrationLabelRequest, assertIntegrationLabelCurrent } from '../packages/sdlc/src/integration-request.mjs';
import { authorizeCompletionEvent } from '../packages/sdlc/src/completion.mjs';
import { issueCommandLabels, routeIssue } from '../packages/sdlc/src/issue-actions.mjs';
import catalog from '../packages/sdlc/capabilities.json' with { type: 'json' };

const repo = 'owner/repo', head = 'a'.repeat(40), identity = 'b'.repeat(64), bot = { login: 'github-actions[bot]', type: 'Bot' };
const env = { GITHUB_EVENT_NAME: 'issues', GITHUB_ACTOR: 'owner', GITHUB_TRIGGERING_ACTOR: 'owner', GITHUB_REPOSITORY_OWNER: 'owner' };
const fixture = () => ({
  issue: { number: 42, title: 'Bounded work', body: 'Deliver this scope.', state: 'open', user: { login: 'owner' }, labels: [{ name: 'integrate' }] },
  pr: { number: 50, state: 'open', draft: false, merged: false, user: bot, head: { sha: head, ref: 'lighthouse/implement-42-bbbbbbbbbbbb', repo: { full_name: repo } }, base: { ref: 'main', repo: { full_name: repo } }, body: `<!-- lighthouse-implementation:${identity} -->` },
  reviews: [{ id: 7, user: { login: 'owner' }, state: 'APPROVED', commit_id: head }],
  comments: [{ user: bot, body: `<!-- lighthouse-pr-state:${JSON.stringify({ pr: 50, head, complete: true, run: 100 })} -->` }],
  profile: { schemaVersion: 1, profileVersion: 1, repository: repo, intake: 'collaborators', requiredChecks: [{ context: 'repository', integrationId: 15368 }], requiredApprovals: 0, evidenceBranch: 'process/retrospectives', completion: { publishEvidence: true, postMergeWorkflows: ['ci.yml'] } }, calls: [],
});
function fixtureApi(s, path, method = 'GET', body) {
  s.calls.push({ path, method, body });
  if (path === '') return { default_branch: 'main' };
  if (path === 'issues/42') return s.issue;
  if (path.startsWith('issues/42/comments?')) return s.comments;
  if (path === 'issues/42/comments' && method === 'POST') { const c = { id: s.comments.length + 100, user: { login: 'github-actions[bot]', type: 'Bot' }, body: body.body, html_url: 'https://github.com/owner/repo/issues/42#comment' }; s.comments.push(c); return c; }
  if (path.startsWith('pulls?')) return s.noPr ? [] : s.ambiguous ? [s.pr, { ...s.pr, number: 51 }] : [s.pr];
  if (path === 'pulls/50') return s.pr;
  if (path.startsWith('pulls/50/reviews?')) return s.reviews;
  if (path === 'commits/main') return { sha: 'c'.repeat(40) };
  if (path.startsWith('contents/.lighthouse/github.json')) { if (s.noProfile) throw Error('Profile missing'); return { content: Buffer.from(JSON.stringify(s.profile)).toString('base64') }; }
  if (path.startsWith('rules/branches/')) return [{ type: 'required_status_checks', parameters: { required_status_checks: [{ context: 'repository', integration_id: 15368 }] } }];
  if (path === 'branches/main') return { protection: { enabled: false } };
  if (path.includes('/check-runs?')) return { check_runs: [{ name: 'repository', head_sha: s.pr.head.sha, app: { id: 15368 }, status: s.pending ? 'in_progress' : 'completed', conclusion: s.failed ? 'failure' : 'success' }] };
  if (path.includes('/statuses?')) return [];
  throw Error('Unexpected API: ' + path);
}
const eventFor = s => ({ action: 'labeled', label: { name: 'integrate' }, issue: s.issue });

test('the shipped command catalogue matches native admission, including denied and unsupported events', async () => {
  const router = await readFile(new URL('../packages/sdlc/workflows/lighthouse-sdlc-router.yml', import.meta.url), 'utf8');
  assert.deepEqual(issueCommandLabels, catalog.capabilities[0].configuration.labels.filter(l => l.role === 'command').map(l => l.name));
  for (const label of issueCommandLabels) {
    const event = { action: 'labeled', label: { name: label }, issue: fixture().issue };
    assert.equal(routeIssue(event, 'owner', 'owner', 'issues').stage, label);
    assert.equal(routeIssue(event, 'other', 'owner', 'issues').run, false);
    assert.equal(routeIssue({ ...event, issue: { ...event.issue, labels: [{ name: 'human-working' }] } }, 'owner', 'owner', 'issues').run, false);
    assert.equal(routeIssue({ ...event, action: 'opened' }, 'owner', 'owner', 'issues').run, false);
    assert.ok(router.includes(`github.event.label.name == '${label}'`), label);
  }
  for (const label of ['review', 'execution-failed', 'pr-ready', 'future', 'unknown']) assert.equal(routeIssue({ ...eventFor(fixture()), label: { name: label } }, 'owner', 'owner', 'issues').run, false);
});

test('label assessment binds the eligible current PR and approval without merge authority', async () => {
  const s = fixture(), api = async (...args) => fixtureApi(s, ...args);
  const auth = await authorizeCompletionEvent(api, repo, eventFor(s), env, 'integrate');
  assert.equal(auth.merge, false); assert.equal(auth.pr, 50); assert.equal(auth.head, head); assert.equal(auth.integrationLabel.approvalId, 7);
  assert.deepEqual(await integrationLabelRequest(api, repo, 'owner', eventFor(s), env, auth), auth);
  assert.equal(s.calls.some(c => c.method !== 'GET'), false);
  for (const change of ['head', 'identity', 'approval']) {
    const current = structuredClone(s);
    if (change === 'head') current.pr.head.sha = 'd'.repeat(40);
    if (change === 'identity') current.pr.body = current.pr.body.replace('b'.repeat(64), 'b'.repeat(63) + 'a');
    if (change === 'approval') current.reviews[0].id++;
    await assert.rejects(integrationLabelRequest(async (...args) => fixtureApi(current, ...args), repo, 'owner', eventFor(current), env, auth), /changed/);
  }
  assert.throws(() => assertIntegrationLabelCurrent(repo, 'owner', { ...auth, merge: true }, s.pr, s.issue, s.comments, s.reviews), /no longer authorized/);
  s.issue.labels = [{ name: 'agent-working' }];
  assert.doesNotThrow(() => assertIntegrationLabelCurrent(repo, 'owner', auth, s.pr, s.issue, s.comments, s.reviews));
  s.comments = [];
  assert.throws(() => assertIntegrationLabelCurrent(repo, 'owner', auth, s.pr, s.issue, s.comments, s.reviews), /receipt/);
});

test('incomplete, ambiguous, changed and unapproved requests name the missing prerequisite', async () => {
  for (const scenario of ['noPr', 'ambiguous', 'draft', 'incomplete', 'approval', 'staleApproval', 'pending', 'failed', 'noProfile', 'foreign', 'reserved', 'removed']) {
    const s = fixture();
    if (['noPr', 'ambiguous', 'pending', 'failed', 'noProfile'].includes(scenario)) s[scenario] = true;
    if (scenario === 'draft') s.pr.draft = true;
    if (scenario === 'incomplete') s.comments = [];
    if (scenario === 'approval') s.reviews = [];
    if (scenario === 'staleApproval') s.reviews.push({ ...s.reviews[0], id: 8, commit_id: 'd'.repeat(40) });
    if (scenario === 'foreign') s.pr.head.repo.full_name = 'attacker/repo';
    if (scenario === 'reserved') s.issue.labels.push({ name: 'human-working' });
    if (scenario === 'removed') s.issue.labels = [];
    await assert.rejects(integrationLabelRequest(async (...args) => fixtureApi(s, ...args), repo, 'owner', eventFor(s), env), undefined, scenario);
    assert.equal(s.calls.some(c => c.method !== 'GET'), false);
  }
});

test('the installed router publishes missing-prerequisite and denied outcomes once, without dispatch', async () => {
  for (const actor of ['owner', 'other']) {
    const root = await mkdtemp(join(tmpdir(), 'lh-integrate-route-'));
    try {
      const s = fixture(); s.noPr = true;
      await writeFile(join(root, 'state.json'), JSON.stringify(s));
      await writeFile(join(root, 'event.json'), JSON.stringify(eventFor(s)));
      await writeFile(join(root, 'mock.mjs'), `import {readFileSync,writeFileSync} from 'node:fs';\nconst file=${JSON.stringify(join(root, 'state.json'))};\nconst api=${fixtureApi.toString()};\nglobalThis.fetch=async(url,o)=>{const s=JSON.parse(readFileSync(file)),path=url.replace('https://api.github.com/repos/owner/repo/','').replace('https://api.github.com/repos/owner/repo','');const value=api(s,path,o.method,o.body?JSON.parse(o.body):undefined);writeFileSync(file,JSON.stringify(s));return {ok:true,status:200,json:async()=>value};};`);
      const run = () => spawnSync(process.execPath, ['--import', join(root, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'route'], { encoding: 'utf8', env: { ...process.env, ...env, GITHUB_ACTOR: actor, GITHUB_TRIGGERING_ACTOR: actor, GITHUB_REPOSITORY: repo, RUNNER_TEMP: root, GITHUB_EVENT_PATH: join(root, 'event.json'), GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '1', LIGHTHOUSE_COMPLETION_ENABLED: 'true', GH_TOKEN: 'fixture' } });
      const first = run(); assert.equal(first.status, 0, first.stderr); const second = run(); assert.equal(second.status, 0, second.stderr);
      const state = JSON.parse(await readFile(join(root, 'state.json')));
      assert.equal(state.comments.filter(c => c.body.includes('lighthouse-routing:')).length, 1);
      assert.match(state.comments.at(-1).body, actor === 'owner' ? /no open Lighthouse implementation PR/ : /Unauthorized actor/);
      assert.equal(state.calls.some(c => c.path.includes('/dispatches')), false);
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});
