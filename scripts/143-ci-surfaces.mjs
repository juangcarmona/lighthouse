import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dispatchDeliveryChecks, ciFailureSummary } from '../src/packages/sdlc/src/delivery-events.mjs';
import { handoff, deliveryCiHandoff } from '../src/packages/sdlc/src/handoff.mjs';
const env=process.env, repository=env.GITHUB_REPOSITORY;
const api=async(path,method='GET',body,optional=false)=>{
 const response=await fetch(`https://api.github.com/repos/${repository}/${path}`,{method,headers:{authorization:`Bearer ${env.GH_TOKEN}`,accept:'application/vnd.github+json','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(optional&&response.status===404)return null;
 if(!response.ok)throw Object.assign(Error('GitHub request failed'),{status:response.status});
 return response.status===204?null:response.json();
};
await mkdir('qualification',{recursive:true});
const pr=await api('pulls/367');let failure;
try{await dispatchDeliveryChecks(api,'main',pr,{checkpoint:rows=>writeFile('qualification/ci-requests.json',JSON.stringify(rows))});}catch(error){failure=error.ciRequestFailure;}
assert.equal(failure?.status,403);assert.equal(failure.pr,pr.number);assert.equal(failure.head,pr.head.sha);
const observation={...failure,execution:env.GITHUB_RUN_ID,executionAttempt:Number(env.GITHUB_RUN_ATTEMPT)};
await writeFile('qualification/ci-failure.json',JSON.stringify(observation));
console.error(JSON.stringify({ciRequestFailure:observation}));
const diagnostic=ciFailureSummary(failure);
const marker=`<!-- lighthouse-143-diagnostic-fixture:${env.GITHUB_RUN_ID} -->`;
const body=handoff({status:'blocked',stage:'implement',happened:`Controlled #143 reporting qualification: a deliberately read-only Actions token was denied CI dispatch for this real candidate. This does not report a production permission failure. ${diagnostic}`,action:deliveryCiHandoff(true).action,next:'Qualification only. No implementation, recovery, integration or merge is requested.',link:`[Native diagnostic](https://github.com/${repository}/actions/runs/${env.GITHUB_RUN_ID})`,details:marker});
const comments=[];
for(const issue of [366,367]){
 const comment=await api(`issues/${issue}/comments`,'POST',{body});
 assert.equal(comment.user.login,'github-actions[bot]');assert.ok(comment.body.includes('HTTP 403'));assert.ok(comment.body.includes(pr.head.sha));
 comments.push(comment);
}
await writeFile('qualification/surfaces.json',JSON.stringify({observation,comments}));
