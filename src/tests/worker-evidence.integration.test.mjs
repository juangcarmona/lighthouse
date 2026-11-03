import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, cp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { restoreWorkspaceOwnership } from '../packages/sdlc/src/implementation-runtime.mjs';

test('native worker exports private evidence and preserves candidates on collection failures', { skip: !process.env.LIGHTHOUSE_TEST_IMAGE, timeout: 240000 }, async t => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-worker-evidence-'));
  const base = process.env.LIGHTHOUSE_TEST_IMAGE;
  assert.match(base, /^sha256:[a-f0-9]{64}$/);
  const volume = `lighthouse-evidence-test-${process.pid}-${Date.now()}`;
  const baseTag = `lighthouse-evidence-base:${process.pid}-${Date.now()}`;
  let image, volumeCreated = false;
  try {
    const harness = join(root, 'harness');
    await cp(new URL('../packages/sdlc/', import.meta.url), harness, { recursive: true });
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
fs.mkdirSync(process.env.XDG_CACHE_HOME,{recursive:true});
fs.writeFileSync(process.env.XDG_CACHE_HOME+'/scratch','disposable',{mode:0o600});
fs.writeFileSync('/workspace/demo.js','export const repaired = true;');
fs.mkdirSync('/output/evidence',{mode:0o700});
fs.writeFileSync('/output/evidence/a-final.log','retained final evidence',{mode:0o600});
if(scenario==='unreadable') fs.writeFileSync('/output/evidence/b-final.log','unreadable required evidence',{mode:0o000});
if(scenario==='symlink') fs.symlinkSync('/input/context.json','/output/evidence/b-link');
if(scenario==='oversized') {fs.writeFileSync('/output/evidence/b-large','');fs.truncateSync('/output/evidence/b-large',64*1024*1024+1);}
const envelope={schemaVersion:1,result:{schemaVersion:1,runId:request.runId,stage:'implement',gate:'done',status:'passed',evidence:[{id:'fixture',status:'passed'}],missingEvidence:[],unavailableChecks:[],pendingReview:[],nextAction:'Review the candidate.'},effect:{type:'issue-comment',body:'Deterministic runtime fixture; no model invoked.'}};
fs.writeFileSync('/output/envelope.json',JSON.stringify(envelope),{mode:0o600});
if(scenario==='engine-failed') process.exit(7);
console.log(JSON.stringify({type:'text',part:{text:'Private final evidence written.'}}));
`);
    execFileSync('docker', ['image', 'tag', base, baseTag]);
    await writeFile(join(root, 'Dockerfile'), `FROM ${baseTag}\nCOPY engine.mjs /fixture-engine.mjs\nENTRYPOINT ["node", "/fixture-engine.mjs"]\nCMD []\n`);
    execFileSync('docker', ['build', '-q', '--iidfile', join(root, 'image-id'), root], { stdio: 'pipe', timeout: 120000 });
    image = (await readFile(join(root, 'image-id'), 'utf8')).trim();
    execFileSync('docker', ['volume', 'create', volume], { stdio: 'pipe' });
    volumeCreated = true;
    for (const scenario of ['success', 'unreadable', 'symlink', 'oversized', 'missing-tool', 'engine-failed']) {
      await t.test(scenario, async () => {
        const current = join(root, scenario), work = join(current, 'work'), runDir = join(current, 'lighthouse-1-1');
        await mkdir(work, { recursive: true }); await mkdir(runDir);
        await writeFile(join(work, 'demo.js'), 'export const repaired = false;');
        execFileSync('git', ['init', '-q', work]); execFileSync('git', ['-C', work, 'add', 'demo.js']);
        const checks = scenario === 'missing-tool' ? [['lighthouse-missing-executable']] : [['node', '-e', 'const assert=require("node:assert/strict");assert.match(require("node:fs").readFileSync("demo.js","utf8"),/repaired = true/);assert.equal(process.env.NODE_DISABLE_COMPILE_CACHE,"1");assert.equal(process.env.TMPDIR,"/tmp");']];
        const request = { runId: 'a'.repeat(64), stage: 'implement', issue: 320, sourceRevision: 'b'.repeat(40), implementation: { policy: { paths: ['demo.js'], checks, reviewRequired: false } } };
        await writeFile(join(runDir, 'request.json'), JSON.stringify(request));
        await writeFile(join(runDir, 'context.json'), JSON.stringify({ request, scenario }));
        await writeFile(join(current, 'prompt'), 'Exercise only the deterministic fixture.');
        await writeFile(join(current, 'config'), JSON.stringify({ image, implementationImage: image, uid: 20003, authVolume: volume, model: 'fixture-no-model', lock: join(current, 'lock') }));
        const run = spawnSync(process.execPath, [join(harness, 'src/opencode-execute.mjs')], { encoding: 'utf8', timeout: 60000, env: { ...process.env, LIGHTHOUSE_ENGINE_CONFIG: join(current, 'config'), RUNNER_TEMP: current, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(current, 'prompt'), GH_AW_SAFE_OUTPUTS: join(current, 'completion') } });
        assert.equal(run.error, undefined, run.error?.message);
        const runtime = JSON.parse(await readFile(join(runDir, 'runtime.json')));
        if (scenario === 'success') {
          assert.equal(run.status, 0, run.stdout + run.stderr);
          assert.deepEqual(runtime.phases, { preflight: 'passed', execution: 'passed', evidence: 'passed', verification: 'passed', completion: 'passed' });
          assert.equal(await readFile(join(runDir, 'evidence/agent/a-final.log'), 'utf8'), 'retained final evidence');
          assert.equal(JSON.parse(await readFile(join(runDir, 'checks.json'))).checks[0].exitCode, 0);
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
        assert.equal(await readFile(join(work, 'demo.js'), 'utf8'), 'export const repaired = false;');
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
