import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createIssueIntent, canonicalIssueIntent } from '../packages/sdlc/src/issue-control-intent.mjs';
import { createIssueControlManifest, readIssueControlPolicy } from '../packages/sdlc/src/issue-control-contract.mjs';
import { digest, taskDigest } from '../packages/sdlc/src/digests.mjs';

test('the real source CLI preserves intent before admission and emits only one native dispatch', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-control-entry-'));
  try {
    const actor = { id: 11, login: 'owner', type: 'User' }, repository = 'owner/repo', sha = 'a'.repeat(40);
    const metadata = { id: 22, full_name: repository, owner: actor, default_branch: 'main' };
    const issue = { id: 33, number: 7, state: 'open', user: actor, title: 'A bounded request', body: 'Read this request', labels: [] };
    const router = '# lighthouse-issue-control:v1\n' + (await readFile(new URL('../packages/sdlc/workflows/lighthouse-sdlc-router.yml', import.meta.url), 'utf8'))
      .replace('  client-control:\n    if: >-\n      false &&', '  client-control:\n    if: >-\n      true &&');
    const manifest = JSON.stringify(createIssueControlManifest(router));
    const capability = { availability: 'available', version: 1, digest: digest(manifest), ...JSON.parse(manifest) };
    const policy = await readIssueControlPolicy({ capability, variables: { LIGHTHOUSE_AUTOMATION_ENABLED: 'true' } });
    const intent = createIssueIntent({ id: '12345678-1234-4234-8234-123456789abc', action: 'refine',
      facts: { repository: { id: 22, name: repository }, issue, actor, sourceRevision: sha, defaultBranch: 'main', inputDigest: taskDigest(issue, []), policy, capability } });
    const event = { sender: actor, inputs: { issue: '7', stage: 'refine', workflow: 'stage', client_request: canonicalIssueIntent(intent) } };
    const run = { id: 44, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch',
      head_sha: sha, head_branch: 'main', repository: metadata, actor, triggering_actor: actor };
    await writeFile(join(root, 'state.json'), JSON.stringify({ comments: [], writes: [], metadata, issue, run, router, manifest, sha }));
    await writeFile(join(root, 'event.json'), JSON.stringify(event));
    await writeFile(join(root, 'mock.mjs'), `
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const path = process.env.CONTROL_TEST_STATE;
const content = text => { const bytes = Buffer.from(text); return { type: 'file', size: bytes.length, encoding: 'base64', content: bytes.toString('base64'), sha: createHash('sha1').update('blob ' + bytes.length + '\\0').update(bytes).digest('hex') }; };
globalThis.fetch = async (url, options) => {
 const state = JSON.parse(readFileSync(path)), endpoint = String(url).split('/repos/owner/repo')[1].replace(/^\\//, ''), method = options.method;
 let value;
 if (method === 'POST') {
  const body = JSON.parse(options.body); state.writes.push({ endpoint, body });
  if (endpoint === 'issues/7/comments') { value = { id: 60 + state.comments.length, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: 'https://api.github.com/repos/owner/repo/issues/7', body: body.body }; state.comments.push(value); }
  else if (endpoint === 'actions/workflows/lighthouse-sdlc-refine.lock.yml/dispatches') { writeFileSync(path, JSON.stringify(state)); return new Response(null, { status: 204 }); }
  else throw Error('Unexpected POST ' + endpoint);
 } else if (method === 'PATCH') { state.writes.push({ endpoint }); value = state.comments.find(comment => endpoint === 'issues/comments/' + comment.id); value.body = JSON.parse(options.body).body; }
 else if (endpoint === '') value = state.metadata;
 else if (endpoint === 'issues/7') value = state.issue;
 else if (endpoint === 'commits/main') value = { sha: state.sha };
 else if (endpoint === 'actions/runs/44/attempts/1') value = state.run;
 else if (endpoint.startsWith('issues/7/comments?')) value = state.comments;
 else if (endpoint.startsWith('issues/comments/')) value = state.comments.find(comment => endpoint === 'issues/comments/' + comment.id);
 else if (endpoint.startsWith('actions/artifacts?')) value = { total_count: 0, artifacts: [] };
 else if (endpoint.startsWith('contents/.lighthouse/issue-control.json')) value = content(state.manifest);
 else if (endpoint.startsWith('contents/.github/workflows/')) value = content(state.router);
 else throw Error('Unexpected GET ' + endpoint);
 writeFileSync(path, JSON.stringify(state)); return Response.json(value);
};`);
    const env = { ...process.env, GH_TOKEN: 'fixture-only', GITHUB_REPOSITORY: repository, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_EVENT_PATH: join(root, 'event.json'),
      GITHUB_RUN_ID: '44', GITHUB_RUN_ATTEMPT: '1', RUNNER_TEMP: root, GITHUB_OUTPUT: join(root, 'outputs'), GITHUB_STEP_SUMMARY: join(root, 'summary'),
      CONTROL_TEST_STATE: join(root, 'state.json'), LIGHTHOUSE_AUTOMATION_ENABLED: 'true', LIGHTHOUSE_EPIC_ENABLED: 'false' };
    const phase = name => { const result = spawnSync(process.execPath, ['--import', join(root, 'mock.mjs'), new URL('../packages/sdlc/src/issue-control-actions.mjs', import.meta.url).pathname, name], { env, encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); };
    const state = async () => JSON.parse(await readFile(join(root, 'state.json'), 'utf8'));
    phase('prepare'); assert.equal((await state()).writes.length, 0);
    const directory = join(root, 'lighthouse-control-44-1');
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'request.json'), 'utf8')).intent, intent);
    phase('admit'); assert.equal((await state()).writes.length, 2);
    const native = JSON.parse(await readFile(join(directory, 'dispatch.json'), 'utf8'));
    assert.equal(native.autoImplement, false); assert.equal(native.productChangeEnabled, false);
    phase('send'); assert.equal((await state()).writes.filter(write => write.endpoint.includes('/dispatches')).length, 1);
    assert.equal(JSON.parse(await readFile(join(directory, 'result.json'), 'utf8')).status, 'admitted');
    phase('publish'); assert.equal((await state()).writes.filter(write => write.endpoint.includes('/dispatches')).length, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
