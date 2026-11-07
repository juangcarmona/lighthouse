import { createHash } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, rm, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { sourceFiles, materializeCandidate } from '../packages/sdlc/src/implementation.mjs';
import { stageContext } from '../packages/sdlc/src/unattended-runtime.mjs';
import { restoreWorkspaceOwnership, writableTree } from '../packages/sdlc/src/implementation-runtime.mjs';

test('native worker exports private evidence and preserves candidates on collection failures', { skip: !process.env.LIGHTHOUSE_TEST_IMAGE, timeout: 240000 }, async t => {
  const root = await mkdtemp(join(process.env.RUNNER_TEMP ?? tmpdir(), 'lighthouse-worker-evidence-'));
  const base = process.env.LIGHTHOUSE_TEST_IMAGE;
  assert.match(base, /^sha256:[a-f0-9]{64}$/);
  const volume = `lighthouse-evidence-test-${process.pid}-${Date.now()}`;
  const baseTag = `lighthouse-evidence-base:${process.pid}-${Date.now()}`;
  let image, volumeCreated = false;
  try {
    const harness = join(root, 'harness');
    await cp(new URL('../packages/sdlc/', import.meta.url), harness, { recursive: true });
    await writableTree(harness);
    execFileSync('git', ['init', '-q', harness]);
    execFileSync('git', ['-C', harness, 'add', '.']);
    execFileSync('git', ['-C', harness, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Runtime under test']);
    await writeFile(join(root, 'engine.mjs'), `
import fs from 'node:fs';
import assert from 'node:assert/strict';
if(process.argv[2]==='cleanup-session') process.exit(0);
const {request,scenario}=JSON.parse(fs.readFileSync('/input/context.json'));
assert.equal(process.env.TMPDIR,'/tmp');
assert.equal(process.env.NODE_DISABLE_COMPILE_CACHE,'1');
assert.equal(process.env.LIGHTHOUSE_CI_APP_CLIENT_ID,undefined);
assert.equal(process.env.LIGHTHOUSE_CI_APP_PRIVATE_KEY,undefined);
fs.mkdirSync(process.env.XDG_CACHE_HOME,{recursive:true});
fs.writeFileSync(process.env.XDG_CACHE_HOME+'/scratch','disposable',{mode:0o600});
let scopeProbe;
if(scenario.startsWith('planning-')) {
 const plan='/workspace/openspec/changes/issue-320-proposal';fs.mkdirSync(plan,{recursive:true});
 assert.match(fs.readFileSync(plan+'/.openspec.yaml','utf8'),/^schema: spec-driven$/m);
 fs.writeFileSync(plan+'/proposal.md','# Proposal\\n\\n## Why\\nRetain verification behavior.\\n\\n## What Changes\\n- Characterize the existing implementation.\\n\\n## Capabilities\\n### New Capabilities\\n- verification: Preserve observable verification.\\n### Modified Capabilities\\nNone.\\n\\n## Impact\\nTests only.\\n');
 fs.writeFileSync(plan+'/design.md','# Design\\nPreserve existing behavior and inspect independent checks.\\n');
 fs.writeFileSync(plan+'/tasks.md','# Tasks\\n\\n- [x] 1.1 Implement the bounded verification change.\\n');
 if(scenario==='planning-new')fs.writeFileSync(plan+'/.openspec.yaml','skip_specs: true\\n');
 if(scenario==='planning-specs') {fs.mkdirSync(plan+'/specs/verification',{recursive:true});fs.writeFileSync(plan+'/specs/verification/spec.md','## ADDED Requirements\\n\\n### Requirement: Verification behavior\\nThe system SHALL retain the declared verification behavior.\\n\\n#### Scenario: Completed implementation\\n- **WHEN** the bounded change is checked\\n- **THEN** the existing verification behavior is preserved\\n');}
}
if(scenario.startsWith('readonly-')) {assert.throws(()=>fs.writeFileSync('/workspace/demo.js','reviewer tampering'),error=>{scopeProbe=error.code;return ['EROFS','EACCES'].includes(error.code);});}
else if(!scenario.startsWith('zero-')) fs.writeFileSync('/workspace/demo.js','export const repaired = true;');
fs.mkdirSync('/output/evidence',{mode:0o700});
fs.writeFileSync('/output/evidence/a-final.log','retained final evidence',{mode:0o600});
if(scenario==='unreadable') fs.writeFileSync('/output/evidence/b-final.log','unreadable required evidence',{mode:0o000});
if(scenario==='symlink') fs.symlinkSync('/input/context.json','/output/evidence/b-link');
if(scenario==='oversized') {fs.writeFileSync('/output/evidence/b-large','');fs.truncateSync('/output/evidence/b-large',64*1024*1024+1);}
let envelope={schemaVersion:1,result:{schemaVersion:1,runId:request.runId,stage:request.stage,gate:'done',status:'passed',evidence:[{id:'fixture',status:'passed'}],missingEvidence:[],unavailableChecks:[],pendingReview:[],nextAction:'Review the candidate.',...(scopeProbe?{output:{scopeProbe}}:{})},effect:{type:'issue-comment',body:'Deterministic runtime fixture; no model invoked.'}};
if(scenario.startsWith('readonly-payload-')) {
  const payload=JSON.parse(fs.readFileSync('/output/envelope.json'));
  assert.equal(payload.binding,request.reviewOutput.binding);
  assert.equal(payload.verdict,'escalate');
  if(scenario!=='readonly-payload-untouched') {payload.verdict=scenario==='readonly-payload-changes'?'request-changes':'accept';payload.findings=payload.verdict==='accept'?[]:['Regression misses an original acceptance boundary.'];}
  if(scenario==='readonly-payload-stale') payload.binding='f'.repeat(64);
  if(scenario==='readonly-payload-extra') payload.evidence=['fabricated'];
  fs.writeFileSync('/output/envelope.json',JSON.stringify(payload));
} else if(scenario.startsWith('readonly-')) {
  envelope=JSON.parse(fs.readFileSync('/output/envelope.json'));
  assert.equal(envelope.result.runId,request.runId);
  assert.equal(envelope.result.status,'blocked');
  if(scenario!=='readonly-untouched') {
    envelope.result.status='passed';envelope.result.missingEvidence=[];
    envelope.result.output={scopeProbe,review:{binding:'fixture',verdict:'accept',findings:[]}};
  }
  if(scenario==='readonly-malformed') envelope.result.evidence=['invalid legacy evidence'];
  if(scenario==='readonly-stale') {envelope.result.runId='f'.repeat(64);envelope.effect.body='Bearer private-token';}
}
if(scenario==='zero-blocked') { envelope.result.status='blocked'; envelope.result.pendingReview.push('Owner decision remains required.'); }
if(!scenario.startsWith('readonly-payload-')) fs.writeFileSync('/output/envelope.json',JSON.stringify(envelope),{mode:0o600});
if(scenario==='engine-failed') process.exit(7);
console.log(JSON.stringify({type:'text',part:{text:'Private final evidence written.'}}));
`);
    execFileSync('docker', ['image', 'tag', base, baseTag]);
    await chmod(join(root, 'engine.mjs'), 0o644);
    await writeFile(join(root, 'Dockerfile'), `FROM ${baseTag}\nCOPY engine.mjs /fixture-engine.mjs\nENTRYPOINT ["node", "/fixture-engine.mjs"]\nCMD []\n`);
    execFileSync('docker', ['build', '-q', '--iidfile', join(root, 'image-id'), root], { stdio: 'pipe', timeout: 120000 });
    image = (await readFile(join(root, 'image-id'), 'utf8')).trim();
    execFileSync('docker', ['volume', 'create', volume], { stdio: 'pipe' });
    volumeCreated = true;
    for (const scenario of ['success', 'planning-new', 'planning-existing', 'planning-specs', 'unreadable', 'symlink', 'oversized', 'missing-tool', 'engine-failed', 'zero-initial', 'zero-review', 'zero-check-failed', 'zero-blocked', 'readonly-review', 'readonly-untouched', 'readonly-stale', 'readonly-malformed', 'readonly-payload-accept', 'readonly-payload-changes', 'readonly-payload-untouched', 'readonly-payload-stale', 'readonly-payload-extra']) {
      await t.test(scenario, async () => {
        const current = join(root, scenario), work = join(current, 'work'), runDir = join(current, 'lighthouse-1-1');
        await mkdir(work, { recursive: true }); await mkdir(runDir);
        const original = scenario.startsWith('zero-') ? 'export const repaired = true;' : 'export const repaired = false;';
        await writeFile(join(work, 'demo.js'), original);
        const existingMetadata = '# Provider-owned baseline\nschema: spec-driven\ncreated: 2025-01-01\nskip_specs: true\n';
        if (scenario === 'planning-existing') {
          await mkdir(join(work, 'openspec/changes/issue-320-proposal'), { recursive: true });
          await writeFile(join(work, 'openspec/changes/issue-320-proposal/.openspec.yaml'), existingMetadata);
        }
        execFileSync('git', ['init', '-q', work]); execFileSync('git', ['-C', work, 'add', '.']);
        const checks = scenario === 'missing-tool' ? [['lighthouse-missing-executable']] : [['node', '-e', 'const assert=require("node:assert/strict");assert.match(require("node:fs").readFileSync("demo.js","utf8"),/repaired = true/);assert.equal(process.env.NODE_DISABLE_COMPILE_CACHE,"1");assert.equal(process.env.TMPDIR,"/tmp");']];
        if (scenario === 'zero-check-failed') checks[0] = ['node', '-e', 'process.exit(1)'];
        if (scenario === 'success') checks.push(['node', '-e', 'console.log(JSON.stringify({data:Array(2000).fill("x".repeat(100)),summary:{current:37,errors:0},documents:[{path:"demo.js"}],citations:[{source:"demo.js",status:"current"}]},null,2));process.exit(0)']);
        const request = { repository: 'owner/fixture', workflowRunId: '1', attempt: 1, taskDigest: 'd'.repeat(64), runId: 'a'.repeat(64), stage: 'implement', issue: 320, sourceRevision: 'b'.repeat(40), implementation: { policy: { paths: ['demo.js'], checks, reviewRequired: false } } };
        if (scenario.startsWith('planning-')) {
          request.implementation.proposal = { root: 'openspec/changes/issue-320-proposal' };
          request.implementation.policy.paths.push('openspec/changes/issue-320-proposal/');
          checks[0] = ['node', '-e', 'const f=require("node:fs"),a=require("node:assert/strict"),r="openspec/changes/issue-320-proposal/",m=f.readFileSync(r+".openspec.yaml","utf8");a.match(m,/^schema: spec-driven$/m);a.match(m,/^created: [0-9]{4}-[0-9]{2}-[0-9]{2}$/m);a.match(f.readFileSync(r+"tasks.md","utf8"),/^- \\[x\\] /m);'];
        }
        if (scenario.startsWith('readonly-')) { request.stage = 'integrate'; request.worker = 'independent-review'; }
        if (scenario.startsWith('readonly-payload-')) request.reviewOutput = { protocol: 'verdict-v1', binding: 'e'.repeat(64), purpose: 'candidate' };
        if (scenario.startsWith('zero-') && scenario !== 'zero-initial') Object.assign(request, { worker: 'apply-review', baseRevision: 'c'.repeat(40), implementationReview: { issue: request.issue, approved: false, head: request.sourceRevision, implementationIdentity: 'd'.repeat(64), feedbackDigest: 'e'.repeat(64) } });
        await writeFile(join(runDir, 'request.json'), JSON.stringify(request));
        await writeFile(join(runDir, 'context.json'), JSON.stringify({ ...stageContext(request, {}), scenario }));
        await writeFile(join(current, 'prompt'), 'Exercise only the deterministic fixture.');
        await writeFile(join(current, 'config'), JSON.stringify({ image, implementationImage: image, uid: 20003, authVolume: volume, model: 'fixture-no-model', lock: join(current, 'lock') }));
        const run = spawnSync(process.execPath, [join(harness, 'src/opencode-execute.mjs')], { encoding: 'utf8', timeout: 60000, env: { ...process.env, LIGHTHOUSE_CI_APP_CLIENT_ID: 'host-only-client', LIGHTHOUSE_CI_APP_PRIVATE_KEY: 'host-only-private-key', LIGHTHOUSE_ENGINE_CONFIG: join(current, 'config'), RUNNER_TEMP: current, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(current, 'prompt'), GH_AW_SAFE_OUTPUTS: join(current, 'completion') } });
        assert.equal(run.error, undefined, run.error?.message);
        const runtime = JSON.parse(await readFile(join(runDir, 'runtime.json')));
        if (scenario.startsWith('readonly-payload-')) {
          const rejected = ['readonly-payload-stale', 'readonly-payload-extra'].includes(scenario);
          assert.equal(run.status, rejected ? 1 : 0, run.stdout + run.stderr);
          await assert.rejects(readFile(join(runDir, 'checks.json')), { code: 'ENOENT' });
          if (rejected) {
            await assert.rejects(readFile(join(current, 'completion')), { code: 'ENOENT' });
            assert.match(await readFile(join(runDir, 'evidence/host/rejected-review.txt'), 'utf8'), /binding/);
          } else {
            const result = JSON.parse(await readFile(join(runDir, 'envelope.json'))).result;
            assert.equal(result.status, scenario === 'readonly-payload-accept' ? 'passed' : 'blocked');
            assert.deepEqual(result.evidence, []);
            assert.equal(result.output.review.binding, request.reviewOutput.binding);
            assert.deepEqual(result.missingEvidence, result.output.review.findings);
            const raw = await readFile(join(runDir, 'evidence/host/review-payload.json'), 'utf8');
            assert.deepEqual(JSON.parse(raw), result.output.review);
            assert.equal(runtime.independentReview.sha256, createHash('sha256').update(raw).digest('hex'));
          }
          assert.equal(runtime.execution.status, 'passed');
        } else if (scenario.startsWith('readonly-')) {
          if (['readonly-stale', 'readonly-malformed'].includes(scenario)) {
            assert.equal(run.status, 1, run.stdout + run.stderr);
            await assert.rejects(readFile(join(current, 'completion')), { code: 'ENOENT' });
            await assert.rejects(readFile(join(runDir, 'envelope.json')), { code: 'ENOENT' });
            const rejected = await readFile(join(runDir, 'evidence/host/rejected-envelope.txt'), 'utf8');
            if (scenario === 'readonly-stale') {
              assert.match(rejected, /ffffffff/);
              assert.ok(!rejected.includes('private-token'));
              assert.match(rejected, /REDACTED/);
              assert.match(JSON.parse(await readFile(join(runDir, 'engine-error.json'))).message, /identity|runId/);
            } else assert.match(rejected, /invalid legacy evidence/);
          } else {
            assert.equal(run.status, 0, run.stdout + run.stderr);
            const result = JSON.parse(await readFile(join(runDir, 'envelope.json'))).result;
            assert.equal(result.status, scenario === 'readonly-untouched' ? 'blocked' : 'passed');
            if (scenario === 'readonly-untouched') { assert.ok(result.missingEvidence.length); assert.equal(result.output.review, undefined); }
            else assert.ok(['EROFS', 'EACCES'].includes(result.output.scopeProbe));
            assert.equal(runtime.execution.status, 'passed');
            await assert.rejects(readFile(join(runDir, 'checks.json')), { code: 'ENOENT' });
          }
          assert.match(await readFile(join(runDir, 'evidence/host/engine-events.jsonl'), 'utf8'), /Private final evidence written/);
        } else if (scenario === 'success' || scenario.startsWith('zero-') || scenario.startsWith('planning-')) {
          assert.equal(run.status, 0, run.stdout + run.stderr);
          assert.deepEqual(runtime.phases, { preflight: 'passed', execution: 'passed', evidence: 'passed', verification: scenario === 'zero-check-failed' ? 'failed' : 'passed', completion: 'passed' });
          const envelope = JSON.parse(await readFile(join(runDir, 'envelope.json')));
          assert.equal(envelope.result.status, ['zero-initial', 'zero-check-failed', 'zero-blocked'].includes(scenario) ? 'blocked' : 'passed');
          if (scenario.startsWith('zero-')) assert.deepEqual(JSON.parse(await readFile(join(runDir, 'changes.json'))), []);
          if (scenario === 'zero-initial') assert.ok(envelope.result.missingEvidence.includes('No implementation changes were returned'));
          if (scenario === 'zero-blocked') assert.deepEqual(envelope.result.pendingReview, ['Owner decision remains required.']);
          assert.equal(await readFile(join(runDir, 'evidence/agent/a-final.log'), 'utf8'), 'retained final evidence');
          const receipt = JSON.parse(await readFile(join(runDir, 'checks.json')));
          assert.equal(receipt.checks[0].exitCode, scenario === 'zero-check-failed' ? 1 : 0);
          assert.equal(receipt.schemaVersion, 2);
          assert.equal(receipt.binding.attempt, 1);
          assert.equal(receipt.binding.intent, request.taskDigest);
          assert.match(receipt.candidateTree, /^[a-f0-9]{40}$/);
          assert.equal(typeof receipt.checks[0].output.content, 'string');
          assert.match(receipt.checks[0].output.sha256, /^[a-f0-9]{64}$/);
          if (scenario.startsWith('planning-')) {
            const candidate = join(current, 'provider-checked'); await mkdir(candidate);
            const changes = JSON.parse(await readFile(join(runDir, 'changes.json')));
            await materializeCandidate(await sourceFiles(work), changes, candidate);
            const cli = new URL('../../node_modules/@fission-ai/openspec/bin/openspec.js', import.meta.url);
            const validation = execFileSync(process.execPath, [cli.pathname, 'validate', 'issue-320-proposal', '--strict', '--no-interactive', '--json'], { cwd: candidate, env: { ...process.env, OPENSPEC_TELEMETRY: '0' }, encoding: 'utf8' });
            assert.equal(JSON.parse(validation).summary.totals.failed, 0);
            if (scenario === 'planning-existing') assert.equal(await readFile(join(candidate, 'openspec/changes/issue-320-proposal/.openspec.yaml'), 'utf8'), existingMetadata);
          }
          if (scenario === 'success') {
            assert.deepEqual(receipt.checks[1].output.jsonSummary, { current: 37, errors: 0 });
            assert.equal(JSON.parse(await readFile(join(runDir, 'evidence/host/check-2.log'), 'utf8')).data.length, 2000);
            assert.equal(receipt.checks[1].output.logTruncated, false);
            assert.deepEqual(receipt.checks[1].output.jsonEvidence.citations, [{ source: 'demo.js', status: 'current' }]);
          }
          assert.equal(JSON.parse(await readFile(join(current, 'completion'))).type, 'noop');
        } else {
          assert.equal(run.status, 1, run.stdout + run.stderr);
          await assert.rejects(readFile(join(current, 'completion')), { code: 'ENOENT' });
          await assert.rejects(readFile(join(runDir, 'envelope.json')), { code: 'ENOENT' });
          const failure = JSON.parse(await readFile(join(runDir, 'engine-error.json')));
          if (scenario === 'missing-tool') {
            assert.equal(failure.phase, 'preflight');
            assert.match(failure.message, /lighthouse-missing-executable.*rebuild and repin/);
            assert.equal(runtime.execution, undefined);
            await assert.rejects(readFile(join(runDir, 'changes.json')), { code: 'ENOENT' });
          } else {
            const changes = JSON.parse(await readFile(join(runDir, 'changes.json')));
            assert.equal(Buffer.from(changes[0].content, 'base64').toString(), 'export const repaired = true;');
            if (scenario === 'engine-failed') assert.equal(failure.phase, 'execution');
            else {
              assert.equal(runtime.execution.status, 'passed');
              assert.equal(failure.phase, 'evidence');
              assert.equal(runtime.phases.evidence, 'failed');
              assert.equal(JSON.parse(await readFile(join(runDir, 'evidence/candidate-envelope.json'))).result.runId, request.runId);
              await assert.rejects(readFile(join(runDir, 'evidence/agent/a-final.log')), { code: 'ENOENT' });
            }
          }
        }
        assert.equal(await readFile(join(work, 'demo.js'), 'utf8'), original);
        assert.equal(execFileSync('docker', ['ps', '-aq', '--filter', `name=^lighthouse-engine-${request.runId}`], { encoding: 'utf8' }).trim(), '');
      });
    }
  } finally {
    if (image) restoreWorkspaceOwnership(root, { image });
    if (volumeCreated) execFileSync('docker', ['volume', 'rm', volume], { stdio: 'ignore' });
    if (image) execFileSync('docker', ['image', 'rm', image], { stdio: 'ignore' });
    execFileSync('docker', ['image', 'rm', baseTag], { stdio: 'ignore' });
    await rm(root, { recursive: true, force: true });
  }
});
