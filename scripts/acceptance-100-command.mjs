// Disposable #100 native transport fixture; never installed in the product workflow.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { runImplementationChecks, restoreWorkspaceOwnership } from '../src/packages/sdlc/src/implementation-runtime.mjs';
import { loadImplementation, createImplementationPullRequest } from '../src/packages/sdlc/src/implementation.mjs';
import { implementationEvidenceBundle } from '../src/packages/sdlc/src/implementation-evidence.mjs';
import { taskDigest } from '../src/packages/sdlc/src/issue-actions.mjs';
import { validatePublishable } from '../src/packages/sdlc/src/process-publication.mjs';
const env=process.env, repository=env.GITHUB_REPOSITORY, issue=372, sourceRevision=env.GITHUB_SHA, branch=env.GITHUB_REF_NAME;
if(env.GITHUB_ACTOR!==repository.split('/')[0] || branch!=='codex/100-native') throw Error('Only the owner may run this isolated fixture');
const api=async(path,method='GET',body,optional=false)=>{
 const response=await fetch(`https://api.github.com/repos/${repository}/${path}`,{method,headers:{authorization:`Bearer ${env.GH_TOKEN}`,accept:'application/vnd.github+json','content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(optional&&response.status===404)return null;
 if(!response.ok)throw Error(`GitHub ${method} ${path}: ${response.status}`);
 return response.status===204?null:response.json();
};
const item=await api(`issues/${issue}`);
const intent=taskDigest(item,[]), implementation=await loadImplementation(api,issue,repository.split('/')[0],sourceRevision,branch);
const runId=createHash('sha256').update(`${repository}:${issue}:${env.GITHUB_RUN_ID}:${env.GITHUB_RUN_ATTEMPT}`).digest('hex');
const request={repository,issue,stage:'implement',runId,sourceRevision,defaultBranch:branch,title:'Controlled #100 command receipt candidate',taskDigest:intent,workflowRunId:env.GITHUB_RUN_ID,attempt:Number(env.GITHUB_RUN_ATTEMPT),implementation};
const cite='<!-- pdac-scope: cited -->\n<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->';
const plan=`openspec/changes/issue-${issue}-proposal`;
const files={
 'src/tests/fixtures/unattended/evidence-100.txt':'Controlled receipt transport acceptance.\n',
 [`${plan}/.openspec.yaml`]:'schema: spec-driven\ncreated: 2026-11-04\nskip_specs: true\n',
 [`${plan}/proposal.md`]:`# Proposal\n\n${cite}\n\n## Why\n\nVerify native host command transport for disposable #372.\n\n## What changes\n\nOne fixture text file; no product or runtime behavior changes.\n\n## Capabilities\n\nNo spec-level behavior changes; skip_specs is explicit.\n\n## Impact\n\nOnly the isolated acceptance branch and retained command artifacts.\n`,
 [`${plan}/design.md`]:`# Design\n\n${cite}\n\n## Context\n\nNative command transport needs an original execution and published candidate binding.\n\n## Goals / Non-Goals\n\nVerify transport without a model, merge, release or main activation.\n\n## Decisions\n\nUse the existing host checker and publisher in a disposable baseline.\n\n## Risks / Trade-offs\n\nThis fixture does not establish production adoption or independent test adequacy.\n`,
 [`${plan}/tasks.md`]:`# Tasks\n\n${cite}\n\n## Acceptance\n\n- [ ] Inspect the original command artifact through the packaged consumer after execution completes.\n`,
};
const changes=Object.entries(files).map(([path,content])=>({path,mode:'100644',content:Buffer.from(content).toString('base64')}));
const root=join(env.RUNNER_TEMP,'command-evidence-100'), workspace=join(root,'candidate'), output=join(root,'evidence/host');
await mkdir(workspace,{recursive:true});
const archive=execFileSync('git',['archive',sourceRevision],{maxBuffer:256*1024*1024});
execFileSync('tar',['-x','-C',workspace],{input:archive});
for(const[path,content]of Object.entries(files)){await mkdir(join(workspace,path,'..'),{recursive:true});await writeFile(join(workspace,path),content);}
const image=execFileSync('docker',['image','inspect','node:24-bookworm-slim','--format','{{.Id}}'],{encoding:'utf8'}).trim();
const config={image,uid:20003};
let receipt;
try{receipt=await runImplementationChecks({config,request,changes,workspace,output,name:`evidence-100-${env.GITHUB_RUN_ID}`,redact:text=>text,cancelled:()=>false});}
finally{restoreWorkspaceOwnership(workspace,config);}
if(receipt.checks.some(check=>check.exitCode!==0))throw Error('Native host command failed');
const beforeWrite=async()=>{const current=await api(`issues/${issue}`);if(current.user.login!==env.GITHUB_ACTOR||taskDigest(current,[])!==intent||(await api(`commits/${branch}`)).sha!==sourceRevision)throw Error('Fixture authority or baseline changed');};
const pr=await createImplementationPullRequest(api,request,changes,'Disposable #100 evidence transport candidate. No merge is authorized.',`https://github.com/${repository}/actions/runs/${env.GITHUB_RUN_ID}`,true,beforeWrite);
const commit=await api(`git/commits/${pr.head.sha}`);
const bundle=implementationEvidenceBundle(request,receipt,changes,{pr:pr.number,head:pr.head.sha,tree:commit.tree.sha});
const serialized=JSON.stringify(bundle);validatePublishable({'implementation-evidence.json':serialized});
await writeFile(join(root,'implementation-evidence.json'),serialized);
await writeFile(join(root,'published-pr.json'),JSON.stringify({number:pr.number,url:pr.html_url,head:pr.head.sha,tree:commit.tree.sha}));
const completion={binding:{repository,issue,pr:pr.number,head:pr.head.sha,intent,branch},currentRevision:sourceRevision};
await writeFile(join(root,'completion.json'),JSON.stringify(completion));
await api(`issues/${issue}/comments`,'POST',{body:`Controlled #100 host checks and candidate publication completed: ${pr.html_url}. No merge authorized.\n\n<!-- lighthouse-pr-state:${JSON.stringify({pr:pr.number,head:pr.head.sha,complete:true,run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT)})} -->`});
console.log(JSON.stringify({published:pr.html_url,head:pr.head.sha,tree:commit.tree.sha,checks:receipt.checks.map(c=>({command:c.command,exitCode:c.exitCode,summary:c.output.jsonSummary??null}))}));
