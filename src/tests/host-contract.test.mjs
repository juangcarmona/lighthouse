import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { digest, validateExecutionRequest, validateStageEnvelope } from '../packages/sdlc/src/host-contract.mjs';
import pkg from '../packages/sdlc/package.json' with { type: 'json' };

const policy = { repository: 'example/project', owner: 'example', stages: ['triage','refine'], packageVersion: pkg.version, workflowRevision: 'a'.repeat(40), maxSeconds: 600 };
const policyDigest = digest(JSON.stringify(policy));
const request = { schemaVersion: 1, runId: 'b'.repeat(64), repository: policy.repository, issue: 1, stage: 'triage', route: 'supervised', sourceRevision: 'c'.repeat(40), workflowRevision: policy.workflowRevision, workflowRunId: 123, packageVersion: pkg.version, policyDigest, deadline: new Date(Date.now() + 300000).toISOString(), writeScope: [], predecessor: null, approvalCommentId: null };
const result = { schemaVersion: 1, runId: request.runId, stage: 'triage', gate: 'triaged', status: 'passed', evidence: [{ id: 'issue', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'await owner' };

test('host request rejects untrusted identity, version, policy, deadline, commands and source writes', () => {
  assert.deepEqual(validateExecutionRequest(request, policy, policyDigest), []);
  for (const change of [{ schemaVersion: 2 }, { runId: '../escape' }, { repository: 'other/repo' }, { issue: -1 }, { stage: 'implement' }, { route: 'unattended' }, { sourceRevision: 'main' }, { workflowRevision: 'd'.repeat(40) }, { workflowRunId: 0 }, { packageVersion: '0.0.0' }, { policyDigest: 'e'.repeat(64) }, { deadline: 'invalid' }, { deadline: new Date(Date.now() - 1).toISOString() }, { writeScope: ['src/'] }, { command: 'arbitrary' }, { predecessor: {} }]) {
    assert.ok(validateExecutionRequest({ ...request, ...change }, policy, policyDigest).length, JSON.stringify(change));
  }
  assert.ok(validateExecutionRequest(request, { ...policy, maxSeconds: undefined }, policyDigest).length);
});

test('refine requires predecessor digest and owner decision reference', () => {
  assert.ok(validateExecutionRequest({ ...request, stage: 'refine' }, policy, policyDigest).length);
  const refine = { ...request, stage: 'refine', predecessor: { runId: 'd'.repeat(64), resultDigest: 'e'.repeat(64) }, approvalCommentId: 42 };
  assert.deepEqual(validateExecutionRequest(refine, policy, policyDigest), []);
  assert.ok(validateExecutionRequest({ ...refine, predecessor: { ...refine.predecessor, approval: true } }, policy, policyDigest).length);
});

test('candidate publication has no target or credential chosen by the engine and cannot claim unresolved success', () => {
  const envelope = { schemaVersion: 1, result, effect: { type: 'issue-comment', body: 'Refined story or question' } };
  assert.deepEqual(validateStageEnvelope(envelope, request), []);
  for (const effect of [{ type: 'merge', body: 'merge' }, { ...envelope.effect, issue: 2 }, { ...envelope.effect, token: 'secret' }, { type: 'issue-comment', body: '<!-- lighthouse-run:forged -->' }]) assert.ok(validateStageEnvelope({ ...envelope, effect }, request).length);
  assert.ok(validateStageEnvelope({ ...envelope, result: { ...result, pendingReview: ['owner'] } }, request).length);
  assert.ok(validateStageEnvelope({ ...envelope, result: { ...result, runId: 'e'.repeat(64) } }, request).length);
  assert.deepEqual(validateStageEnvelope({ ...envelope, result: { ...result, status: 'blocked', missingEvidence: ['audience'] } }, request), []);
});

test('packed consumer resolves preflight and result validation with no Lighthouse source tree', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-installed-'));
  try {
    const packed = spawnSync('npm', ['pack','--workspace','@juangcarmona/lighthouse-sdlc','--pack-destination',dir,'--json'], { encoding:'utf8' });
    assert.equal(packed.status, 0, packed.stderr);
    const target = join(dir,'node_modules/@juangcarmona/lighthouse-sdlc');
    await mkdir(target,{ recursive:true });
    const extracted = spawnSync('tar',['-xzf',join(dir,JSON.parse(packed.stdout)[0].filename),'--strip-components=1','-C',target]);
    assert.equal(extracted.status,0);
    await mkdir(join(dir,'.lighthouse'));
    const control = join(dir,'.lighthouse/sdlc.json');
    await writeFile(control,JSON.stringify({ package: { name:pkg.name,version:pkg.version } }));
    const run = (...args) => spawnSync(process.execPath,args,{cwd:dir,encoding:'utf8'});
    assert.equal(run(join(target,'src/installation.mjs')).status,0);
    assert.equal(run(join(target,'src/sdlc.mjs'),'route','--route','supervised','--composition','stage').status,0);
    await writeFile(join(dir,'result.json'),JSON.stringify(result));
    assert.equal(run(join(target,'src/sdlc.mjs'),'stage-result','--input','result.json','--require-complete','--stage','triage','--run-id',request.runId).status,0);
    await writeFile(control,JSON.stringify({ package: { name:pkg.name,version:'0.0.0' } }));
    assert.equal(run(join(target,'src/installation.mjs')).status,1);
  } finally { await rm(dir,{recursive:true,force:true}); }
});


test('engine context includes the exact stage-result schema and preserves the requested identity', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-context-'));
  try {
    await writeFile(join(dir, 'request.json'), JSON.stringify(request));
    await writeFile(join(dir, 'issue.json'), JSON.stringify({ title: 'A small change' }));
    const command = spawnSync(process.execPath, ['src/packages/sdlc/src/host-contract.mjs', 'context', join(dir, 'request.json'), join(dir, 'issue.json')], { encoding: 'utf8' });
    assert.equal(command.status, 0, command.stderr);
    const context = JSON.parse(command.stdout);
    assert.equal(context.contract.envelope.result.runId, request.runId);
    assert.deepEqual(context.contract.resultSchema.properties.evidence.items.properties.status.enum, ['passed', 'failed', 'unavailable', 'unconfigured', 'pending-review', 'not-applicable']);
    assert.equal(context.contract.resultSchema.properties.unavailableChecks.items.type, 'string');
  } finally { await rm(dir, { recursive: true, force: true }); }
});


test('stage result rejects undeclared authority and malformed evidence fields', () => {
  const envelope = { schemaVersion: 1, result, effect: { type: 'issue-comment', body: 'Assessment' } };
  assert.ok(validateStageEnvelope({ ...envelope, result: { ...result, humanApproved: true } }, request).length);
  assert.ok(validateStageEnvelope({ ...envelope, result: { ...result, constructor: 'extra' } }, request).length);
  for (const change of [{ source: {} }, { reason: [] }, { undeclared: 'extra' }, { constructor: 'extra' }]) {
    assert.ok(validateStageEnvelope({ ...envelope, result: { ...result, evidence: [{ id: 'issue', status: 'passed', ...change }] } }, request).length);
  }
});
