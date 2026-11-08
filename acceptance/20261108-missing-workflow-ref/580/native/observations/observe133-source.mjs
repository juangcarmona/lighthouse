import assert from 'node:assert/strict';
import{execFileSync}from'node:child_process';
import{writeFile}from'node:fs/promises';
import{observeRecovery}from'/srv/workspaces/juangcarmona/lighthouse/580-missing-workflow-ref/src/packages/sdlc/src/worker-recovery.mjs';
const repo='juangcarmona/lighthouse',calls=[];
const api=async(path,method='GET',body,optional=false)=>{assert.equal(method,'GET');calls.push(path);try{return JSON.parse(execFileSync('gh',['api',`repos/${repo}/${path}`.replace(/\/$/,'' )],{encoding:'utf8',maxBuffer:4*1024*1024,timeout:30000,stdio:['ignore','pipe','pipe']}));}catch(e){if(optional&&String(e.stderr).includes('HTTP 404'))return null;throw Object.assign(Error('GET '+path+': '+String(e.stderr).trim()),{status:Number(/HTTP (\d{3})/.exec(String(e.stderr))?.[1])})}};
let outcome;try{const obs=await observeRecovery(api,repo,'juangcarmona',133);outcome={state:'observed',observations:obs}}catch(e){outcome={state:'failed',error:e.message}}
const proof={...outcome,readOnly:true,package:'local reviewed candidate before publication',issue:133,allRequestsGet:true,calls:calls.length};await writeFile('/tmp/lighthouse-580-native/source-observe133-proof.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
