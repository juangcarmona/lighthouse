import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { signalAdmissionRejection, completedAdmission } from '../packages/sdlc/src/admission-recovery.mjs';
import { admitDispatch } from '../packages/sdlc/src/stage-dispatch.mjs';
import { fixture } from './helpers/continuation-admission-fixture.mjs';

async function rejected() {
  const f = await fixture(); f.run.display_title = 'review #7 · request 30';
  const env = { LIGHTHOUSE_ISSUE:'7',LIGHTHOUSE_STAGE:'review',GITHUB_RUN_ID:'200',GITHUB_RUN_ATTEMPT:'1',LIGHTHOUSE_MAINTENANCE_ENABLED:'true',LIGHTHOUSE_RECOVERY_ENABLED:'true' };
  const event = {inputs:{'dispatch-request':'30'}};
  await assert.rejects(admitDispatch(f.api,'owner/repo','owner',env,event,f.readArtifact),/workflow revision changed/);
  f.calls.length=0;
  return {...f,env,event};
}

test('trusted rejection signals the existing maintenance once, without admitting or publishing anything',async()=>{
  const f=await rejected();
  const signal=await signalAdmissionRejection(f.api,'owner/repo','owner',f.env,f.event,f.readArtifact);
  assert.equal(signal.runId,'200');
  assert.deepEqual(f.calls.filter(c=>c.method!=='GET'),[{path:'actions/workflows/lighthouse-worker-maintenance.yml/dispatches',method:'POST',body:{ref:'main',inputs:{issue:'7',completed_run:'200'}}}]);
  assert.equal(f.comments.length,1);
});

test('signal never broadens disabled recovery, scope, original authority, reruns or admitted effects',async()=>{
  for(const scenario of ['disabled','maintenance-disabled','scope','claimed','wrong-run','owner-request','unconfirmed']){
    const f=await rejected();
    if(scenario==='disabled')f.env.LIGHTHOUSE_RECOVERY_ENABLED='false';
    if(scenario==='maintenance-disabled')f.env.LIGHTHOUSE_MAINTENANCE_ENABLED='false';
    if(scenario==='scope')f.env.LIGHTHOUSE_MAINTENANCE_ISSUES='[]';
    if(scenario==='claimed')f.run.head_sha=f.request.workflowRevision;
    if(scenario==='wrong-run')f.env.GITHUB_RUN_ID='400';
    if(scenario==='owner-request')f.parent.actor=f.parent.triggering_actor={login:'owner'};
    if(scenario==='unconfirmed')f.comment.body=f.comment.body.replace('"status":"failed"','"status":"running"');
    assert.equal(await signalAdmissionRejection(f.api,'owner/repo','owner',f.env,f.event,f.readArtifact),null,scenario);
    assert.equal(f.calls.some(c=>c.method!=='GET'),false,scenario);
  }
});

test('a lost wake response is not retried and cannot create a delivery effect',async()=>{
  const f=await rejected();let posts=0;
  const api=async(p,m,...args)=>{if(m==='POST'){posts++;throw Error('response lost')}return f.api(p,m,...args)};
  await assert.rejects(signalAdmissionRejection(api,'owner/repo','owner',f.env,f.event,f.readArtifact),/response lost/);
  assert.equal(posts,1);assert.equal(f.comments.length,1);
});

test('callback waits for the terminal native inventory instead of trusting its supplied run id',async()=>{
  const f=await rejected();f.run.status='in_progress';let waits=0;
  const wake=await completedAdmission(f.api,'owner/repo','owner','200',f.readArtifact,async()=>{waits++;f.run.status='completed'});
  assert.equal(waits,1);assert.equal(wake.runId,'200');
  f.jobs.find(j=>j.name==='agent').conclusion='success';
  assert.equal(await completedAdmission(f.api,'owner/repo','owner','200',f.readArtifact,async()=>{}),null);
  assert.equal(f.calls.every(c=>c.method==='GET'),true);
  assert.equal(await completedAdmission(async()=>f.run,'owner/repo','owner','201',f.readArtifact),null);
  await assert.rejects(completedAdmission(f.api,'owner/repo','owner','0200',f.readArtifact),/canonical/);
});

test('a callback with no confirmed completion stops without sending a retry',async()=>{
  const f=await rejected();f.run.status='in_progress';let waits=0;
  await assert.rejects(completedAdmission(f.api,'owner/repo','owner','200',f.readArtifact,async()=>{waits++}),/completion is not confirmed/);
  assert.equal(waits,24);assert.equal(f.calls.every(c=>c.method==='GET'),true);
});

test('only trusted review preparation receives write authority for the explicit wake',async()=>{
  const source=await readFile(new URL('../packages/sdlc/workflows/lighthouse-sdlc-review.md',import.meta.url),'utf8');
  assert.match(source,/actions: write/);
  assert.match(source,/if: failure\(\)[\s\S]*completion-actions\.mjs signal-admission-rejection/);
  const maintenance=await readFile(new URL('../packages/sdlc/workflows/lighthouse-worker-maintenance.yml',import.meta.url),'utf8');
  assert.match(maintenance,/completed_run:/);
});

test('bot callback, duplicate native completion and scheduled fallback share one retry and preserve historical origin',async()=>{
  const {prepareRecovery,verifyRecoveryOrigin}=await import('../packages/sdlc/src/worker-recovery.mjs');
  const {loadDispatch,verifyDispatchOrigin}=await import('../packages/sdlc/src/stage-dispatch.mjs');
  const f=await rejected();f.maintenance.actor=f.maintenance.triggering_actor={login:'github-actions[bot]',type:'Bot'};
  const wake=await completedAdmission(f.api,'owner/repo','owner','200',f.readArtifact);
  const retry=await prepareRecovery(f.api,'owner/repo','owner',7,f.maintenance,true,Date.now(),f.readArtifact,{admissionWake:wake});
  assert.equal(retry.request.routerEventName,'workflow_dispatch');assert.deepEqual(retry.request.recovery.wake,wake);
  f.artifacts.set(300,retry.request);const worker={...f.run,id:400,status:'in_progress',conclusion:null};f.runs.set(400,worker);
  const env={...f.env,GITHUB_RUN_ID:'400'};
  const admitted=await admitDispatch(f.api,'owner/repo','owner',env,{inputs:{'dispatch-request':String(retry.commentId)}},f.readArtifact);
  assert.equal(admitted.admitted,true);
  assert.equal(admitted.admissionProof.original.workerRunId,'200');
  assert.equal(admitted.admissionProof.original.expectedRevision,'a'.repeat(40));
  assert.equal(admitted.admissionProof.original.observedRevision,'b'.repeat(40));
  assert.equal(admitted.admissionProof.rebase.documentationOnly,true);
  assert.equal(admitted.admissionProof.rebase.commits,1);
  assert.equal(admitted.admissionProof.rebase.files,1);
  assert.equal(admitted.admissionProof.jobs.find(j=>j.name==='agent').conclusion,'skipped');
  assert.equal(admitted.admissionProof.reused.ci,'90');
  assert.equal(admitted.admissionProof.reused.merge,'d'.repeat(40));
  assert.equal(admitted.admissionProof.retryLimit,1);

  for(const scenario of ['reserved','changed-workflow','revoked-approval']){
    if(scenario==='reserved')f.issue.labels.push({name:'agent-working'});else if(scenario==='changed-workflow'){f.issue.labels=[];f.changed[0].filename='.github/workflows/review.yml'}else{f.reviews[0].state='CHANGES_REQUESTED'}
    const loaded=await loadDispatch(f.api,'owner/repo','owner',7,retry.commentId,worker,f.readArtifact);
    await verifyRecoveryOrigin(f.api,'owner/repo','owner',loaded,f.maintenance,f.readArtifact,0);
    await assert.rejects(verifyRecoveryOrigin(f.api,'owner/repo','owner',loaded,f.maintenance,f.readArtifact,0,true),/authority changed/);
    assert.throws(()=>verifyDispatchOrigin(loaded.request,loaded.receipt,{...f.maintenance,actor:{login:'stranger'},triggering_actor:{login:'stranger'}},{...worker,head_sha:'f'.repeat(40)},'owner/repo','owner',7),error=>!error.code);
  }
  for(const parent of [{...f.maintenance,event:'workflow_run'},{...f.maintenance,event:'schedule',actor:{login:'owner'},triggering_actor:{login:'owner'}}]){
    assert.equal((await prepareRecovery(f.api,'owner/repo','owner',7,parent,true,Date.now(),f.readArtifact,{admissionWake:wake})).request,undefined);
  }
  assert.equal(f.comments.length,2);assert.equal(f.calls.some(c=>c.path.endsWith('/merge')||c.path.endsWith('/dispatches')),false);
});

test('the trusted completion CLI sends and retains the wake after rejected preparation',async()=>{
  const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const{tmpdir}=await import('node:os');const{join}=await import('node:path');const{spawnSync}=await import('node:child_process');
  const root=await mkdtemp(join(tmpdir(),'admission-callback-cli-'));
  try{
    await writeFile(join(root,'event.json'),JSON.stringify({inputs:{'dispatch-request':'30'}}));
    await writeFile(join(root,'preload.mjs'),`import{registerHooks}from'node:module';
      registerHooks({load(url,context,next){if(url.endsWith('/actions-artifact.mjs'))return{format:'module',shortCircuit:true,source:'export async function readActionsJson(...args){return globalThis.callbackFixture.readArtifact(...args)};export function createActionsJsonReader(){throw Error("Unexpected reader")}'};return next(url,context)}});
      const{fixture}=await import('${new URL('./helpers/continuation-admission-fixture.mjs',import.meta.url).href}');
      const{admitDispatch}=await import('${new URL('../packages/sdlc/src/stage-dispatch.mjs',import.meta.url).href}');
      const f=globalThis.callbackFixture=await fixture();
      try{await admitDispatch(f.api,'owner/repo','owner',process.env,{inputs:{'dispatch-request':'30'}},f.readArtifact)}catch(e){if(e.code!=='workflow-revision-rejected')throw e}
      globalThis.fetch=async(url,options)=>{const p=url.replace('https://api.github.com/repos/owner/repo/','');const value=await f.api(p,options.method,options.body?JSON.parse(options.body):undefined);return new Response(value===null?null:JSON.stringify(value),{status:value===null?204:200})};`);
    const result=spawnSync(process.execPath,['--import',join(root,'preload.mjs'),new URL('../packages/sdlc/src/completion-actions.mjs',import.meta.url).pathname,'signal-admission-rejection'],{encoding:'utf8',timeout:20000,env:{...process.env,GITHUB_REPOSITORY:'owner/repo',GITHUB_REPOSITORY_OWNER:'owner',GITHUB_RUN_ID:'200',GITHUB_RUN_ATTEMPT:'1',LIGHTHOUSE_STAGE:'review',LIGHTHOUSE_ISSUE:'7',LIGHTHOUSE_MAINTENANCE_ENABLED:'true',LIGHTHOUSE_RECOVERY_ENABLED:'true',GITHUB_EVENT_PATH:join(root,'event.json'),RUNNER_TEMP:root}});
    assert.equal(result.status,0,result.stderr);
    const signal=JSON.parse(await readFile(join(root,'lighthouse-200-1/admission-signal.json'),'utf8'));
    assert.equal(signal.runId,'200');assert.equal(signal.status,'requested');assert.equal(signal.commentId,30);
  }finally{await rm(root,{recursive:true,force:true})}
});
