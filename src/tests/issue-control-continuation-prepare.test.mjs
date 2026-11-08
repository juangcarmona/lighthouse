import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createIssueIntent, canonicalIssueIntent } from '../packages/sdlc/src/issue-control-intent.mjs';
import { formatIssueComment } from '../packages/sdlc/src/issue-comment-intent.mjs';
import { createControlRequest } from '../packages/sdlc/src/issue-control-ledger.mjs';
import { controlStageDispatch } from '../packages/sdlc/src/issue-control-admission.mjs';
import { digest, taskDigest } from '../packages/sdlc/src/digests.mjs';
import { stageContext } from '../packages/sdlc/src/unattended-runtime.mjs';

test('production prepare keeps an authenticated typed continuation through its fresh comment-route recheck', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-control-continue-'));
  try {
    const actor = { id: 11, login: 'owner', type: 'User' }, repository = 'owner/repo', sha = 'a'.repeat(40);
    const issue = { id: 33, number: 7, state: 'open', user: actor, title: 'Choose audience', body: 'Ask before selecting an audience.', labels: [{ name: 'needs-info' }] };
    const prior = { repository, issue: 7, stage: 'refine', runId: 'e'.repeat(64), workflowRunId: '20', attempt: 1, sourceRevision: sha,
      taskDigest: taskDigest(issue, []), autoImplement: false, productChangeEnabled: false };
    const envelope = stageContext(prior, {}).contract.envelope;
    envelope.result.status = 'blocked'; envelope.result.output.handoff = { question: 'Developers or operators?' };
    const report = { id: 55, user: { login: 'github-actions[bot]', type: 'Bot' }, created_at: '2026-01-01T10:00:00Z', body: `<!-- lighthouse-actions:${prior.runId} -->\n<!-- lighthouse-stage:refine:blocked -->\nOutcome: blocked` };
    const facts = { availability: 'available', actions: { continue: { eligible: true } }, repository: { id: 22, name: repository }, issue, actor, sourceRevision: sha, defaultBranch: 'main',
      inputDigest: taskDigest(issue, []), policy: { digest: 'c'.repeat(64), autoImplement: true }, capability: { stages: ['refine'] },
      question: { stage: 'refine', commentId: 55, requestId: prior.runId, questionDigest: digest('Developers or operators?'), grantDigest: digest(canonicalIssueIntent(prior)), request: prior } };
    const intent = createIssueIntent({ id: '12345678-1234-4234-8234-123456789abc', facts, action: 'continue', body: 'Developers. Continue only this refinement.' });
    const answer = { id: 90, user: actor, html_url: 'https://github.com/owner/repo/issues/7#issuecomment-90', created_at: '2026-01-01T11:00:00Z', body: formatIssueComment({ ...intent, intent: 'continue' }) };
    const event = { action: 'created', issue, sender: actor, comment: answer };
    const control = createControlRequest(intent, sha, 44, 1, { commentId: 90 });
    const native = controlStageDispatch({ request: control, facts, run: { id: 44, run_attempt: 1, head_sha: sha, head_branch: 'main', actor, triggering_actor: actor, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'issue_comment' }, event, repository, owner: actor.login });
    native.taskDigest = taskDigest(issue, [answer]);
    await writeFile(join(root, 'state.json'), JSON.stringify({ issue, prior, envelope, control, native, comments: [report, answer], calls: [] }));
    await writeFile(join(root, 'event.json'), JSON.stringify({ inputs: { 'dispatch-request': '66' } }));
    const modules = new URL('../packages/sdlc/src/', import.meta.url).href;
    await writeFile(join(root, 'mock.mjs'), `
import { registerHooks } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const file = ${JSON.stringify(join(root, 'state.json'))};
globalThis.fetch = async (url, options) => {
 const state = JSON.parse(readFileSync(file)), path = String(url).split('/repos/owner/repo')[1].replace(/^\\//, '');
 state.calls.push({path,method:options.method}); let value;
 if(path==='') value={default_branch:'main'};
 else if(path==='issues/7') { state.issueReads=(state.issueReads??0)+1; value=state.contendedAfterFirstRead&&state.issueReads>1?{...state.issue,labels:[{name:'agent-working'}]}:state.issue; }
 else if(path.startsWith('issues/7/comments?')) value=state.comments;
 else if(path==='commits/main') value={sha:'${sha}'};
 else if(path==='issues/7/labels'&&options.method==='POST') value=[];
 else if(path.startsWith('issues/7/labels/')&&options.method==='DELETE') value={};
 else if(path==='issues/7/comments'&&options.method==='POST') value={id:100,body:JSON.parse(options.body).body};
 else throw Error('Unexpected '+options.method+' '+path);
 writeFileSync(file,JSON.stringify(state));return Response.json(value);
};
registerHooks({load(url,context,next){
 if(!url.startsWith(${JSON.stringify(modules)})||url.includes('?actual'))return next(url,context);
 let extra;
 if(url.endsWith('/stage-dispatch.mjs'))extra='export async function admitDispatch(){const s=JSON.parse(readFileSync(file));return {admitted:true,commentId:66,request:s.native,receipt:{digest:"'+'0'.repeat(64)+'"}};}';
 if(url.endsWith('/issue-control-native.mjs'))extra='export async function loadClientDispatch(){return JSON.parse(readFileSync(file)).control;}';
 if(url.endsWith('/proposal.mjs'))extra='export async function loadStageReport(){const s=JSON.parse(readFileSync(file));return {request:s.prior,envelope:s.envelope};}';
 if(!extra)return next(url,context);
 return {format:'module',shortCircuit:true,source:'import {readFileSync} from "node:fs"; const file='+JSON.stringify(file)+'; export * from '+JSON.stringify(url+'?actual')+'; '+extra};
}});
`);
    const runPrepare = () => spawnSync(process.execPath, ['--import', join(root, 'mock.mjs'), new URL('../packages/sdlc/src/issue-actions.mjs', import.meta.url).pathname, 'prepare'], {
      cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_REPOSITORY: repository, GITHUB_REPOSITORY_OWNER: 'owner', GITHUB_ACTOR: 'owner', GITHUB_TRIGGERING_ACTOR: 'owner',
        GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_EVENT_PATH: join(root, 'event.json'), GITHUB_RUN_ID: '77', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: sha,
        LIGHTHOUSE_STAGE: 'refine', LIGHTHOUSE_ISSUE: '7', LIGHTHOUSE_RUN_DIR: root, LIGHTHOUSE_DISPATCH_REQUIRED: 'true', LIGHTHOUSE_AUTO_IMPLEMENT: 'true',
        RUNNER_TEMP: root, GITHUB_OUTPUT: join(root, 'outputs'), GITHUB_STEP_SUMMARY: join(root, 'summary'), GH_TOKEN: 'fixture-only' } });
    const run = runPrepare();
    assert.equal(run.status, 0, run.stdout + run.stderr);
    const snapshot = JSON.parse(await readFile(join(root, 'request.json'), 'utf8'));
    assert.equal(snapshot.replyTo, prior.runId); assert.equal(snapshot.commentId, answer.id);
    assert.equal(snapshot.autoImplement, false); assert.equal(snapshot.productChangeEnabled, false);
    assert.deepEqual(snapshot.client, native.client);
    const context = JSON.parse(await readFile(join(root, 'context.json'), 'utf8'));
    assert.equal(context.continuation.answer.body, intent.body);
    const state = JSON.parse(await readFile(join(root, 'state.json'), 'utf8'));
    const writes = state.calls.filter(call => call.method !== 'GET').length;
    state.issueReads = 0; state.contendedAfterFirstRead = true;
    await writeFile(join(root, 'state.json'), JSON.stringify(state));
    const rejected = runPrepare();
    assert.notEqual(rejected.status, 0); assert.match(rejected.stderr, /client-question-no-longer-current/);
    const after = JSON.parse(await readFile(join(root, 'state.json'), 'utf8'));
    assert.equal(after.calls.filter(call => call.method !== 'GET').length, writes);

  } finally { await rm(root, { recursive: true, force: true }); }
});
