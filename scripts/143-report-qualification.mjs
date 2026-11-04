import assert from 'node:assert/strict';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { publishReports, readReport } from '../src/packages/sdlc/src/worker-reports.mjs';
import { digest } from '../src/packages/sdlc/src/host-contract.mjs';
import { classifyTechnicalFailure } from '../src/packages/sdlc/src/worker-recovery.mjs';
import { dispatchDeliveryChecks, ciFailureSummary } from '../src/packages/sdlc/src/delivery-events.mjs';
const env=process.env, repo=env.GITHUB_REPOSITORY, owner=env.GITHUB_REPOSITORY_OWNER;
const index=366, source='37e91a0', retained=[], writes=[];
await mkdir('qualification', {recursive:true});
const api=async(path, method='GET', body, optional=false)=>{
 const response=await fetch(`https://api.github.com/repos/${repo}${path?'/'+path:''}`,{method,headers:{authorization:`Bearer ${env.GH_TOKEN}`,accept:'application/vnd.github+json','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(optional&&response.status===404)return null;
 if(!response.ok)throw Object.assign(Error('GitHub request failed'),{status:response.status});
 const result=response.status===204?null:await response.json();
 if(method!=='GET')writes.push({path,method,number:result?.number});
 return result;
};
if(env.MODE==='diagnostic'){
 const metadata=await api('');
 const candidate=await api('pulls/367');
 assert.equal(candidate.state,'open');
 let saved, failure;
 try{await dispatchDeliveryChecks(api,metadata.default_branch,candidate,{checkpoint:async rows=>{saved=structuredClone(rows);}});}catch(error){failure=error.ciRequestFailure;}
 assert.equal(failure?.status,403);assert.equal(failure.method,'POST');assert.equal(saved[0].state,'rejected');
 assert.equal(writes.length,0);
 console.log(JSON.stringify({ciRequestFailure:failure}));console.log(ciFailureSummary(failure));
 await writeFile('qualification/ci-diagnostic.json',JSON.stringify({failure,requests:saved,writes}));
 process.exit(0);
}
const current=await api(`actions/runs/${env.GITHUB_RUN_ID}`);
assert.equal(current.actor.login,owner);assert.equal(current.path,'.github/workflows/lighthouse-worker-maintenance.yml');
const ids=JSON.parse(env.FIXTURE_RUNS);assert.equal(ids.length,5);
const runs=[];
for(const id of ids){
 const run=await api(`actions/runs/${id}`), jobs=await api(`actions/runs/${id}/jobs?per_page=100`);
 assert.equal(run.repository.full_name,repo);assert.equal(run.actor.login,owner);assert.equal(run.triggering_actor.login,owner);
 assert.equal(run.path,current.path);assert.equal(run.head_sha,current.head_sha);assert.equal(run.event,'workflow_dispatch');assert.equal(run.run_attempt,1);assert.equal(run.status,'completed');
 assert.equal(jobs.total_count,jobs.jobs.length);
 const expected=runs.length===3?'success':'failure';assert.equal(run.conclusion,expected);
 assert.equal(jobs.jobs.find(j=>j.name==='agent').conclusion,expected);
 if(expected==='failure')assert.equal(classifyTechnicalFailure({run,jobs:jobs.jobs,evidence:{result:'absent'}}),'short-run');
 runs.push(run);retained.push({run,jobs});
}
const root=digest(`${repo}:${index}:controlled-report-chain:${ids[0]}`), rows=runs.slice(0,3).map((run,attempt)=>({issue:index,worker:'refine',runId:String(run.id),rootId:root,attempt,state:attempt===2?'exhausted':'retryable',code:'worker-technical-failure',outcome:'technical-failure'}));
const oldReport=(await api('issues?state=all&per_page=100')).find(issue=>issue.user?.login==='github-actions[bot]'&&issue.body?.includes(`\"signature\":\"${digest(`${repo}:refine:worker-technical-failure`)}\"`));
const baseline=oldReport?readReport(oldReport,repo,'refine','worker-technical-failure').entries.length:0;
if(oldReport){
 const old=readReport(oldReport,repo,'refine','worker-technical-failure');assert.ok(old.entries.every(entry=>entry.issue===index));
 await publishReports(api,repo,owner,index,[...new Set(old.entries.map(entry=>entry.rootId))].map(rootId=>({issue:index,worker:'refine',rootId,runId:String(runs[3].id),attempt:2,state:'succeeded',code:'worker-completed',outcome:'completed'})));
}
const captures=[]; let reportNumber;

const snapshot=async(label)=>{const issue=await api(`issues/${reportNumber}`);assert.ok(issue);captures.push({label,issue});return issue;};
let lost=true;
const loseCreate=async(...args)=>{const result=await api(...args);if(args[0]==='issues'&&args[1]==='POST'&&lost){lost=false;throw Error('Injected lost create response after confirmed native POST');}return result;};
const indexBefore=await api(`issues/${index}`);
const existing=(await api('issues?state=all&per_page=100')).filter(issue=>issue.user?.login==='github-actions[bot]'&&issue.body?.includes(`\"rootId\":\"${root}\"`));
if(!oldReport&&!existing.length)await assert.rejects(publishReports(loseCreate,repo,owner,index,rows.slice(0,1)),/Injected/);
const published=await publishReports(api,repo,owner,index,rows);reportNumber=published.find(row=>row.signature===digest(`${repo}:refine:worker-technical-failure`)).number;
let reportIssue=await snapshot('three-failures-exhausted');let report=readReport(reportIssue,repo,'refine','worker-technical-failure');assert.equal(report.entries.length,baseline+3);assert.match(reportIssue.body,/Owner: retry budget exhausted/);
const count=writes.length;await publishReports(api,repo,owner,index,rows);assert.equal(writes.length,count);
const state=(state,code)=>({...rows[2],runId:String(runs[3].id),state,code,outcome:state==='waiting-human'?'question':state==='active'?'active':'completed'});
for(const [status,code] of [['active','worker-active'],['waiting-human','human-decision']]){await publishReports(api,repo,owner,index,[state(status,code)]);reportIssue=await snapshot(status);assert.equal(readReport(reportIssue,repo,'refine','worker-technical-failure').entries.length,baseline+3);assert.equal(reportIssue.state,'open');}
await publishReports(api,repo,owner,index,[state('succeeded','worker-completed')]);reportIssue=await snapshot('confirmed-success');assert.equal(reportIssue.state,'closed');
const recurrence={...rows[0],rootId:digest(`${root}:recurrence`),runId:String(runs[4].id)};
let loseUpdate=true;
const lostUpdate=async(...args)=>{const result=await api(...args);if(args[0]===`issues/${reportIssue.number}`&&args[1]==='PATCH'&&loseUpdate){loseUpdate=false;throw Error('Injected lost update response after confirmed PATCH');}return result;};
await assert.rejects(publishReports(lostUpdate,repo,owner,index,[recurrence]),/Injected/);
await publishReports(api,repo,owner,index,[recurrence]);reportIssue=await snapshot('recurrence');assert.equal(reportIssue.state,'open');assert.equal(readReport(reportIssue,repo,'refine','worker-technical-failure').entries.length,baseline+4);
assert.ok(writes.filter(w=>w.path==='issues'&&w.method==='POST').length<=1);
assert.equal((await api('issues?state=all&per_page=100')).filter(issue=>issue.user?.login==='github-actions[bot]'&&issue.body?.includes(`\"signature\":\"${digest(`${repo}:refine:worker-technical-failure`)}\"`)).length,1);
const diagnostic=JSON.parse(await readFile('qualification/ci-diagnostic.json','utf8'));
await publishReports(api,repo,owner,index,[{issue:index,worker:'implement',rootId:digest(`${root}:ci`),runId:env.GITHUB_RUN_ID,attempt:0,state:'uncertain',code:'ci-start-unconfirmed',outcome:'completed',pr:diagnostic.failure.pr,head:diagnostic.failure.head}]);
await writeFile('qualification/lifecycle.json',JSON.stringify({source,root,index,report:reportIssue.number,baseline,fixtureRetryOrdinals:true,originalLostResponseRun:41840223306,fixtureRevision:runs[0].head_sha,qualificationRevision:current.head_sha,actualRetryAdmission:false,captures,writes,diagnostic},null,2));
await writeFile('qualification/native-runs.json',JSON.stringify(retained));
console.log(JSON.stringify({index,report:reportIssue.number,failures:3,recovery:'confirmed native success in fixture chain',recurrence:4,lostCreatePosts:1}));
