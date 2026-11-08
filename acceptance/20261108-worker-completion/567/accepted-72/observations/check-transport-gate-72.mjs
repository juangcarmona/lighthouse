import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root = await mkdtemp(join(tmpdir(),'567-transport-check-'));
try {
  Object.assign(process.env,{GITHUB_REPOSITORY:'owner/repo',GITHUB_REPOSITORY_OWNER:'owner',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ID:'100',GITHUB_ACTOR:'github-actions[bot]',GITHUB_TRIGGERING_ACTOR:'github-actions[bot]',GITHUB_SHA:'a'.repeat(40),LIGHTHOUSE_ACCEPTANCE_567_ISSUE:'72',LIGHTHOUSE_ISSUE:'72',GITHUB_EVENT_PATH:join(root,'event.json'),LIGHTHOUSE_ACCEPTANCE_GATE_LOG:join(root,'timing.jsonl'),GH_TOKEN:'fixture'});
  await writeFile(process.env.GITHUB_EVENT_PATH,JSON.stringify({inputs:{stage:'review',workflow:'stage',after_run:'90'}}));
  const forwarded=[], writes=[];
  globalThis.fetch=async(url,options)=>{
    if(url.endsWith('/dispatches')) { forwarded.push({url,options});return{status:204,ok:true}; }
    if(options.method==='POST') {writes.push(JSON.parse(options.body));return{ok:true,status:201,json:async()=>({id:1})};}
    if(url.endsWith('/commits/main'))return{ok:true,status:200,json:async()=>({sha:'b'.repeat(40)})};
    if(url.includes('/issues/72/comments?'))return{ok:true,status:200,json:async()=>[{user:{login:'owner',type:'User'},body:'<!-- lighthouse-actions:{"acceptance567":"before-post","run":"100"} -->'}]};
    throw Error('Unexpected fixture request');
  };
  await import('./acceptance-567-preload-72.mjs');
  const request={ref:'main',inputs:{issue:'72','dispatch-request':'30'}};
  const options={method:'POST',body:JSON.stringify(request),signal:AbortSignal.abort()};
  await fetch('https://api.github.com/repos/owner/repo/actions/workflows/lighthouse-sdlc-review.lock.yml/dispatches',options);
  assert.equal(forwarded.length,1);assert.equal(writes.length,1);
  assert.equal(forwarded[0].options.signal.aborted,false);assert.equal(forwarded[0].options.body,options.body);
  const proof=JSON.parse(await readFile(process.env.LIGHTHOUSE_ACCEPTANCE_GATE_LOG,'utf8'));
  assert.equal(proof.transportDeadlineStartsAfterGate,true);assert.equal(proof.requestComment,'30');
  process.env.LIGHTHOUSE_ISSUE='69';
  await fetch('https://api.github.com/repos/owner/repo/actions/workflows/lighthouse-sdlc-review.lock.yml/dispatches',options);
  assert.equal(forwarded.length,2);assert.equal(forwarded[1].options,options);
  console.log('Transport fixture: one unchanged request; deadline starts after held delivery; other issues untouched.');
}finally{await rm(root,{recursive:true,force:true});}
