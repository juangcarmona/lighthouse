import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, mkdir, readdir, lstat, cp, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createExecutionOwner, recoverExecutionOwners, recoverExecutionWorkspaces, runOwnedDocker } from '../packages/sdlc/src/execution-cleanup.mjs';
import { writableTree, restoreWorkspaceOwnership } from '../packages/sdlc/src/implementation-runtime.mjs';
import { stageContext } from '../packages/sdlc/src/unattended-runtime.mjs';

const image = process.env.LIGHTHOUSE_TEST_CLEANUP_IMAGE;
const docker = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });

test('complete Docker adapter terminal paths retain recovery and bound disposable workspaces', { skip: !image, timeout: 240000 }, async () => {
  assert.match(image, /^sha256:[a-f0-9]{64}$/);
  const root = await mkdtemp(join(process.env.RUNNER_TEMP ?? tmpdir(), 'lh-adapter-cleanup-'));
  const suffix = randomBytes(8).toString('hex'), volume = `lighthouse-adapter-auth-${suffix}`, tag = `lighthouse-adapter-base:${suffix}`;
  const lock = join(root, 'lock'), journals = lock + '.resources', observations = [];
  let fixtureImage, complete = false;
  const children = new Set();
  const measure = async path => {
    const stat = await lstat(path), value = { allocatedBytes: stat.blocks * 512, inodes: 1 };
    if (stat.isDirectory()) for (const entry of await readdir(path)) {
      const child = await measure(join(path, entry)); value.allocatedBytes += child.allocatedBytes; value.inodes += child.inodes;
    }
    return value;
  };
  const records = async () => Promise.all((await readdir(journals)).filter(name => name.endsWith('.json')).map(async name => JSON.parse(await readFile(join(journals, name)))));
  try {
    const harness = join(root, 'harness');
    await cp(new URL('../packages/sdlc/', import.meta.url), harness, { recursive: true });
    await writableTree(harness);
    execFileSync('git', ['init', '-q', harness]); execFileSync('git', ['-C', harness, 'add', '.']);
    execFileSync('git', ['-C', harness, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Unchanged adapter fixture']);
    await writeFile(join(root, 'engine.mjs'), `import fs from 'node:fs';
if(process.argv[2]==='cleanup-session')process.exit(0);
const {request,scenario}=JSON.parse(fs.readFileSync('/input/context.json'));
fs.writeFileSync('/workspace/demo.js','export const repaired = true;');
for(const folder of ['node_modules','.cache']){fs.mkdirSync('/workspace/'+folder,{recursive:true});for(let i=0;i<32;i++)fs.writeFileSync('/workspace/'+folder+'/'+i,Buffer.alloc(4096));}
fs.mkdirSync('/output/evidence',{recursive:true});fs.writeFileSync('/output/evidence/report.txt','retained fixture diagnostic');
console.log(JSON.stringify({type:'text',part:{text:'Deterministic fixture ready; no model invoked.'}}));
fs.writeFileSync('/output/ready','ready');
while(!fs.existsSync('/output/continue'))await new Promise(resolve=>setTimeout(resolve,25));
const envelope={schemaVersion:1,result:{schemaVersion:1,runId:request.runId,stage:'implement',gate:'done',status:'passed',evidence:[{id:'fixture',status:'passed'}],missingEvidence:[],unavailableChecks:[],pendingReview:[],nextAction:'Inspect deterministic fixture only.'},effect:{type:'issue-comment',body:'Test fixture; no model or forge publication.'}};
fs.writeFileSync('/output/envelope.json',JSON.stringify(envelope));
if(scenario==='failure')process.exit(7);
`);
    docker(['image', 'tag', image, tag]);
    await writeFile(join(root, 'Dockerfile'), `FROM ${tag}\nCOPY engine.mjs /fixture-engine.mjs\nENTRYPOINT ["node", "/fixture-engine.mjs"]\nCMD []\n`);
    fixtureImage = docker(['build', '-q', root]).trim();
    docker(['volume', 'create', volume]);
    docker(['run', '--rm', '--mount', `type=volume,src=${volume},dst=/shared`, '--entrypoint', 'node', fixtureImage, '-e', 'require("fs").writeFileSync("/shared/sentinel","preserved")']);
    await mkdir(join(root, 'foreign')); await writeFile(join(root, 'foreign/sentinel'), 'another execution');
    // Accelerate only the existing implementation deadline; the adapter and Docker path stay unchanged.
    await writeFile(join(root, 'clock.mjs'), 'const timer=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>timer(fn,ms===1800000?10000:ms,...args);');
    let attempt = 0;
    const run = async scenario => {
      attempt++;
      const current = join(root, `attempt-${attempt}`), work = join(current, 'work'), runDir = join(current, `lighthouse-1-${attempt}`);
      await mkdir(work, { recursive: true }); await mkdir(runDir);
      await writeFile(join(work, 'demo.js'), 'export const repaired = false;');
      await writeFile(join(work, '.gitignore'), 'node_modules/\n.cache/\n');
      execFileSync('git', ['init', '-q', work]); execFileSync('git', ['-C', work, 'add', '.']);
      execFileSync('git', ['-C', work, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Preserved fixture source']);
      const request = { repository: 'qualification/disposable', workflowRunId: '1', attempt, taskDigest: 'd'.repeat(64), runId: suffix.padEnd(64, '0'), stage: 'implement', issue: 1, sourceRevision: 'b'.repeat(40), implementation: { policy: { paths: ['demo.js'], reviewRequired: false, checks: [['node', '-e', 'require("node:assert/strict").match(require("node:fs").readFileSync("demo.js","utf8"),/repaired = true/);']] } } };
      await writeFile(join(runDir, 'request.json'), JSON.stringify(request));
      await writeFile(join(runDir, 'context.json'), JSON.stringify({ ...stageContext(request, {}), scenario }));
      await writeFile(join(current, 'prompt'), 'Only the deterministic cleanup fixture.');
      await writeFile(join(current, 'config'), JSON.stringify({ image: fixtureImage, implementationImage: fixtureImage, uid: 20003, authVolume: volume, model: 'fixture-no-model', lock }));
      const child = spawn(process.execPath, [...(scenario === 'timeout' ? ['--import', join(root, 'clock.mjs')] : []), join(harness, 'src/opencode-execute.mjs')], { env: { ...process.env, LIGHTHOUSE_ENGINE_CONFIG: join(current, 'config'), RUNNER_TEMP: current, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: String(attempt), GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(current, 'prompt'), GH_AW_SAFE_OUTPUTS: join(current, 'completion') }, stdio: ['ignore', 'pipe', 'pipe'] });
      children.add(child);
      let stdout = '', stderr = '', exited = false;
      child.stdout.on('data', chunk => { stdout += chunk; }); child.stderr.on('data', chunk => { stderr += chunk; });
      const exit = new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', (code, signal) => { exited = true; children.delete(child); resolve({ code, signal }); }); });
      let record, during;
      const deadline = Date.now() + 45000;
      while (!exited && Date.now() < deadline) {
        try {
          record = (await records()).find(value => value.identity.attempt === attempt);
          if (record?.workspace && record.resources.some(value => value.name.endsWith('-engine') && !value.pending) && await readFile(join(record.workspace.path, 'output/ready'), 'utf8') === 'ready') {
            during = await measure(record.workspace.path); break;
          }
        } catch (error) { if (error.code !== 'ENOENT') throw error; }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      if (!during && !exited) child.kill('SIGTERM');
      if (during) {
        if (scenario === 'cancel') child.kill('SIGTERM');
        else if (scenario === 'abrupt') child.kill('SIGKILL');
        else if (scenario !== 'timeout') await writeFile(join(record.workspace.path, 'output/continue'), 'continue');
      }
      const ended = await exit;
      child.stdout.destroy(); child.stderr.destroy();
      if (scenario === 'capacity') {
        assert.equal(ended.code, 1, stdout + stderr); assert.match(stderr, /retention limit reached/);
        assert.equal(during, undefined); return;
      }
      assert.ok(during?.inodes > 64, stdout + stderr);
      assert.equal(await readFile(join(work, 'demo.js'), 'utf8'), 'export const repaired = false;');
      if (scenario === 'abrupt') {
        assert.equal(ended.signal, 'SIGKILL');
        observations.push({ scenario, ended, owner: record.key, during, recoveryPending: true }); return;
      }
      assert.equal(ended.code, ['success', 'recovery'].includes(scenario) ? 0 : 1, stdout + stderr);
      const runtime = JSON.parse(await readFile(join(runDir, 'runtime.json')));
      assert.equal(runtime.execution.status, { success: 'passed', recovery: 'passed', failure: 'failed', timeout: 'timeout', cancel: 'cancelled' }[scenario], stderr);
      assert.equal(runtime.cleanup.status, 'clean'); assert.equal(runtime.workspaceCleanup.status, 'clean');
      await assert.rejects(lstat(record.workspace.path), { code: 'ENOENT' });
      for (const resource of runtime.cleanup.resources) if (resource.type === 'container') assert.equal(docker(['ps', '-aq', '--filter', `name=^/${resource.name}$`]).trim(), '');
      if (scenario === 'recovery') {
        const lost = observations.find(value => value.scenario === 'abrupt');
        assert.ok(runtime.recoveredCleanup.some(value => value.owner === lost.owner && value.status === 'clean'));
        const old = (await records()).find(value => value.key === lost.owner);
        assert.equal(old.workspace.status, 'clean'); await assert.rejects(lstat(old.workspace.path), { code: 'ENOENT' });
        const changes = JSON.parse(await readFile(join(old.workspace.retained, 'changes.json')));
        assert.ok(changes.some(value => value.path === 'demo.js' && Buffer.from(value.content, 'base64').toString().includes('repaired = true')));
        assert.equal(await readFile(join(old.workspace.retained, 'evidence/report.txt'), 'utf8'), 'retained fixture diagnostic');
        lost.recoveryPending = false; lost.after = { allocatedBytes: 0, inodes: 0, verifiedAbsent: true };
      }
      observations.push({ scenario, ended, during, after: { allocatedBytes: 0, inodes: 0, verifiedAbsent: true }, runtime });
      assert.equal(await readFile(join(root, 'foreign/sentinel'), 'utf8'), 'another execution');
      assert.equal(docker(['run', '--rm', '--mount', `type=volume,src=${volume},dst=/shared,readonly`, '--entrypoint', 'cat', fixtureImage, '/shared/sentinel']), 'preserved');
    };
    for (const scenario of ['success', 'failure', 'timeout', 'cancel', 'abrupt', 'recovery']) await run(scenario);
    const retained = join(journals, 'retained'), existing = await readdir(retained);
    for (let i = existing.length; i < 32; i++) await mkdir(join(retained, `capacity-fixture-${i}`));
    await run('capacity'); assert.equal((await readdir(retained)).length, 32);
    // Explicit operator archive of this test's own bundle frees capacity without deleting its evidence.
    const archived = join(root, 'archived-bundle'), first = join(retained, existing[0]);
    const candidate = await readFile(join(first, 'changes.json'));
    await rename(first, archived); assert.deepEqual(await readFile(join(archived, 'changes.json')), candidate);
    await run('success'); assert.equal((await readdir(retained)).length, 32);
    observations.push({ scenario: 'retention-capacity', syntheticEmptyBundles: 32 - existing.length, admissionAt32: 'rejected-before-engine', explicitOperatorArchive: true, archivedCandidatePreserved: true, retainedAfterResume: 32 });
    complete = true;
  } finally {
    for (const child of children) child.kill('SIGTERM');
    if (process.env.LIGHTHOUSE_ADAPTER_TERMINAL_EVIDENCE) await writeFile(process.env.LIGHTHOUSE_ADAPTER_TERMINAL_EVIDENCE, JSON.stringify({ kind: 'complete-real-docker-adapter-fixtures-no-model-or-forge-publication', image, fixtureImage, complete, timeoutClock: { originalMilliseconds: 1800000, fixtureMilliseconds: 10000 }, observations }, null, 2) + '\n');
    if (complete) {
      restoreWorkspaceOwnership(root, { image: fixtureImage });
      docker(['volume', 'rm', volume]); docker(['image', 'rm', fixtureImage]);
      // Do not delete an operator image that was originally reachable only by its ID.
      if (JSON.parse(docker(['image', 'inspect', '--format', '{{json .RepoTags}}', image])).some(value => value !== tag)) docker(['image', 'rm', tag]);
      await rm(root, { recursive: true, force: true });
    }
  }
});

test('repeated real-process workspace loss retains edits and evidence without disposable byte or inode growth', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-workspace-recovery-'));
  const scratch = join(root, 'scratch'), journals = join(root, 'journals'), observations = [];
  const moduleUrl = new URL('../packages/sdlc/src/execution-cleanup.mjs', import.meta.url).href;
  const measure = async path => {
    const stat = await lstat(path);
    const total = { allocatedBytes: stat.blocks * 512, inodes: 1 };
    if (stat.isDirectory()) for (const name of await readdir(path)) {
      const child = await measure(join(path, name)); total.allocatedBytes += child.allocatedBytes; total.inodes += child.inodes;
    }
    return total;
  };
  try {
    await mkdir(scratch); await mkdir(join(scratch, 'foreign'));
    await writeFile(join(scratch, 'foreign/sentinel'), 'another execution');
    const before = await measure(scratch);
    for (let attempt = 1; attempt <= 5; attempt++) {
      const identity = { repository: 'qualification/disposable', runId: 'c'.repeat(64), workflowRunId: '1', attempt };
      const script = `import {createExecutionOwner} from ${JSON.stringify(moduleUrl)};import {mkdir,writeFile} from 'node:fs/promises';import {join} from 'node:path';
const owner=createExecutionOwner(${JSON.stringify(journals)},${JSON.stringify(identity)},{run:()=>''});
const path=await owner.allocateWorkspace(${JSON.stringify(scratch)});await mkdir(join(path,'source'));await mkdir(join(path,'output/evidence'),{recursive:true});
const baseline=new Map([['demo.js',{content:Buffer.from('original'),mode:'100644'}],['.gitignore',{content:Buffer.from('node_modules/\\n.cache/\\n'),mode:'100644'}]]);
for(const [name,file]of baseline)await writeFile(join(path,'source',name),file.content);
await owner.checkpointWorkspace(baseline,baseline,{paths:['*']});await writeFile(join(path,'source/demo.js'),'recovered edit');
for(const folder of ['node_modules','.cache']){await mkdir(join(path,'source',folder));for(let i=0;i<20;i++)await writeFile(join(path,'source',folder,String(i)),Buffer.alloc(4096));}
await writeFile(join(path,'output/evidence/report.txt'),'bounded diagnostic');process.kill(process.pid,'SIGKILL');`;
      const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: 'pipe' });
      let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk; });
      const exit = await new Promise(resolve => child.on('close', (code, signal) => resolve({ code, signal })));
      assert.equal(exit.signal, 'SIGKILL', stderr);
      const during = await measure(scratch);
      const receipts = recoverExecutionOwners(journals, { run: () => '' });
      assert.equal(receipts.length, 1); assert.equal(receipts[0].status, 'clean');
      await recoverExecutionWorkspaces(journals);
      const after = await measure(scratch);
      assert.equal(after.inodes, before.inodes);
      assert.ok(after.allocatedBytes <= before.allocatedBytes + 4096);
      assert.ok(during.inodes > after.inodes + 40);
      assert.equal(await readFile(join(scratch, 'foreign/sentinel'), 'utf8'), 'another execution');
      const bundle = join(journals, 'retained', receipts[0].owner);
      const changes = JSON.parse(await readFile(join(bundle, 'changes.json')));
      assert.equal(changes.length, 1); assert.equal(Buffer.from(changes[0].content, 'base64').toString(), 'recovered edit');
      assert.equal(await readFile(join(bundle, 'evidence/report.txt'), 'utf8'), 'bounded diagnostic');
      observations.push({ attempt, exit, before, during, after, resources: receipts[0].remaining, retainedBundles: (await readdir(join(journals, 'retained'))).length });
    }
    if (process.env.LIGHTHOUSE_WORKSPACE_CLEANUP_EVIDENCE) await writeFile(process.env.LIGHTHOUSE_WORKSPACE_CLEANUP_EVIDENCE, JSON.stringify({ kind: 'real-process-filesystem-not-native-docker', observations }, null, 2) + '\n');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('real disposable runtime fault matrix preserves unrelated resources and shared state', { skip: !image, timeout: 60000 }, async () => {
  assert.match(image, /^sha256:[a-f0-9]{64}$/);
  const directory = await mkdtemp(join(tmpdir(), 'lh-live-cleanup-')), suffix = randomBytes(8).toString('hex');
  const control = `lighthouse-cleanup-control-${suffix}`, receipts = [];
  let complete = false;
  const identity = attempt => ({ repository: 'qualification/disposable', runId: suffix.padEnd(64, '0'), workflowRunId: '1', attempt });
  try {
    docker(['volume', 'create', control]); docker(['network', 'create', control]);
    docker(['run', '-d', '--name', control, '--network', control, '--mount', `type=volume,src=${control},dst=/shared`, '--entrypoint', 'node', image, '-e', 'setInterval(()=>{},1000)']);
    docker(['exec', control, 'node', '-e', 'require("fs").writeFileSync("/shared/sentinel","preserved")']);
    for (const [index, outcome] of ['success', 'agent-failure', 'timeout', 'cancel', 'no-op-remove', 'lost-create', 'lost-remove', 'runtime-outage'].entries()) {
      const journals = join(directory, String(index));
      let noOp = outcome === 'no-op-remove', outage = false;
      const run = args => {
        if (outage) throw Error('Injected runtime outage');
        if (args[1] === 'rm' && noOp) return '';
        const output = docker(args);
        if (args[1] === 'rm' && outcome === 'lost-remove') throw Error('Injected lost removal acknowledgement');
        return output;
      };
      const owner = createExecutionOwner(journals, identity(index + 1), { run });
      const config = { resourceOwner: owner };
      let execution = null;
      runOwnedDocker(config, ['network', 'create', `${owner.prefix}-private`], { stdio: 'pipe' });
      if (outcome === 'timeout' || outcome === 'cancel') {
        const args = owner.prepare(['run', '--rm', '--name', `${owner.prefix}-work`, '--network', `${owner.prefix}-private`, '--mount', `type=volume,src=${control},dst=/shared`, '--entrypoint', 'node', image, '-e', 'setInterval(()=>{},1000)']);
        const child = spawn('docker', args, { stdio: 'pipe' });
        const exited = new Promise(resolve => child.on('close', (code, signal) => resolve({ code, signal })));
        let started = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          try { if (docker(['inspect', '--format', '{{.State.Running}}', `${owner.prefix}-work`]).trim() === 'true') { started = true; break; } } catch {}
          await new Promise(resolve => setTimeout(resolve, 25));
        }
        assert.equal(started, true);
        const stop = () => { owner.observe(); child.kill('SIGTERM'); try { docker(['rm', '-f', `${owner.prefix}-work`]); } catch { /* --rm may already have removed it; the independent inventory must still prove absence. */ } };
        const cancellation = new AbortController();
        cancellation.signal.addEventListener('abort', stop, { once: true });
        const timer = setTimeout(outcome === 'timeout' ? stop : () => cancellation.abort(), 50);
        const exit = await exited; clearTimeout(timer);
        execution = { status: outcome === 'timeout' ? 'timeout' : 'cancelled', ...exit };
      } else if (outcome === 'lost-create') {
        const args = owner.prepare(['run', '-d', '--name', `${owner.prefix}-work`, '--network', `${owner.prefix}-private`, '--mount', `type=volume,src=${control},dst=/shared`, '--entrypoint', 'node', image, '-e', 'setInterval(()=>{},1000)']);
        docker(args); // Deliberately drop the create acknowledgement.
      } else {
        const code = outcome === 'success' ? 'process.exit(0)' : outcome === 'agent-failure' ? 'process.exit(7)' : 'setInterval(()=>{},1000)';
        try { runOwnedDocker(config, ['run', ...(outcome === 'success' || outcome === 'agent-failure' ? ['--rm'] : ['-d']), '--name', `${owner.prefix}-work`, '--network', `${owner.prefix}-private`, '--mount', `type=volume,src=${control},dst=/shared`, '--entrypoint', 'node', image, '-e', code], { stdio: 'pipe' }); }
        catch (error) { assert.equal(outcome, 'agent-failure'); assert.equal(error.status, 7); execution = { status: 'failed', code: error.status, signal: null }; }
        if (outcome === 'success') execution = { status: 'passed', code: 0, signal: null };
      }
      outage = outcome === 'runtime-outage';
      const first = owner.cleanup();
      assert.equal(first.status, noOp ? 'failed' : outage ? 'unknown' : 'clean');
      receipts.push({ scenario: outcome, execution, ...first });
      noOp = false; outage = false;
      assert.equal(owner.cleanup().status, 'clean');
      assert.equal(docker(['container', 'ls', '-aq', '--filter', `label=io.lighthouse.execution=${first.owner}`]).trim(), '');
      assert.equal(docker(['network', 'ls', '-q', '--filter', `label=io.lighthouse.execution=${first.owner}`]).trim(), '');
      assert.equal(JSON.parse(docker(['inspect', '--format', '{{json .State.Running}}', control])), true);
      docker(['volume', 'inspect', '--format', '{{.Name}}', control]);
      assert.equal(docker(['exec', control, 'node', '-e', 'process.stdout.write(require("fs").readFileSync("/shared/sentinel","utf8"))']), 'preserved');
    }
    for (const [index, type] of ['container', 'network'].entries()) {
      const owner = createExecutionOwner(join(directory, `foreign-${type}`), identity(40 + index));
      const config = { resourceOwner: owner }, name = `${owner.prefix}-substituted`;
      if (type === 'container') {
        runOwnedDocker(config, ['run', '-d', '--name', name, '--entrypoint', 'node', image, '-e', 'setInterval(()=>{},1000)'], { stdio: 'pipe' });
        docker(['rm', '-f', name]); docker(['rename', control, name]);
      } else {
        runOwnedDocker(config, ['network', 'create', name], { stdio: 'pipe' });
        docker(['network', 'rm', name]); docker(['network', 'create', name]);
      }
      try {
        const id = docker([type, 'inspect', '--format', '{{.Id}}', name]).trim();
        assert.throws(() => runOwnedDocker(config, type === 'container' ? ['rm', '-f', name] : ['network', 'rm', name], { stdio: 'pipe' }), /ownership|inventory/);
        assert.equal(docker([type, 'inspect', '--format', '{{.Id}}', name]).trim(), id);
        const receipt = owner.cleanup(); assert.equal(receipt.status, 'unknown');
        receipts.push({ scenario: `foreign-${type}-at-owned-name`, preserved: { type, id }, ...receipt });
      } finally {
        if (type === 'container') docker(['rename', name, control]); else docker(['network', 'rm', name]);
      }
      assert.equal(owner.cleanup().status, 'clean');
    }
    const realDocker = execFileSync('sh', ['-c', 'command -v docker'], { encoding: 'utf8' }).trim();
    for (const [index, mode] of ['no-op', 'lost-response'].entries()) {
      const owner = createExecutionOwner(join(directory, `phase-${mode}`), identity(45 + index));
      const config = { resourceOwner: owner }, name = `${owner.prefix}-work`;
      runOwnedDocker(config, ['run', '-d', '--name', name, '--entrypoint', 'node', image, '-e', 'setInterval(()=>{},1000)'], { stdio: 'pipe' });
      const id = docker(['container', 'inspect', '--format', '{{.Id}}', name]).trim();
      const bin = await mkdtemp(join(directory, 'docker-shim-')), calls = join(bin, 'removals.log');
      await writeFile(join(bin, 'docker'), `#!${process.execPath}\nconst cp=require('node:child_process'),fs=require('node:fs'),args=process.argv.slice(2);const target=(args[0]==='rm'||args[0]==='container'&&args[1]==='rm')&&args.includes(${JSON.stringify(id)});if(target){fs.appendFileSync(${JSON.stringify(calls)},'remove\\n');if(${JSON.stringify(mode)}==='no-op')process.exit(0);}const result=cp.spawnSync(${JSON.stringify(realDocker)},args,{stdio:'inherit'});process.exit(target&&${JSON.stringify(mode)}==='lost-response'?1:result.status??1);\n`, { mode: 0o755 });
      const previousPath = process.env.PATH;
      try {
        process.env.PATH = `${bin}:${previousPath}`;
        if (mode === 'no-op') {
          assert.throws(() => runOwnedDocker(config, ['rm', '-f', name], { stdio: 'pipe' }), /not verified absent/);
          assert.throws(() => owner.prepare(['run', 'image']), /reconcile/);
        } else {
          assert.doesNotThrow(() => runOwnedDocker(config, ['rm', '-f', name], { stdio: 'pipe' }));
          assert.equal((await readFile(calls, 'utf8')).trim().split('\n').length, 1);
        }
        const receipt = owner.cleanup(); assert.equal(receipt.status, mode === 'no-op' ? 'failed' : 'clean');
        receipts.push({ scenario: `phase-${mode}-removal`, ...receipt });
      } finally { process.env.PATH = previousPath; }
      assert.equal(owner.cleanup().status, 'clean');
    }
    const journals = join(directory, 'killed-process'), ready = join(directory, 'ready.json');
    const moduleUrl = new URL('../packages/sdlc/src/execution-cleanup.mjs', import.meta.url).href;
    const script = `import {createExecutionOwner,runOwnedDocker} from ${JSON.stringify(moduleUrl)}; import {writeFileSync} from 'node:fs'; const owner=createExecutionOwner(${JSON.stringify(journals)},${JSON.stringify(identity(50))}); runOwnedDocker({resourceOwner:owner},['run','-d','--name',owner.prefix+'-work','--entrypoint','node',${JSON.stringify(image)},'-e','setInterval(()=>{},1000)'],{stdio:'pipe'});writeFileSync(${JSON.stringify(ready)},JSON.stringify({prefix:owner.prefix}));process.kill(process.pid,'SIGKILL');`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: 'pipe' });
    const exit = await new Promise(resolve => child.on('close', (code, signal) => resolve({ code, signal })));
    assert.equal(exit.signal, 'SIGKILL');
    const { prefix } = JSON.parse(await readFile(ready, 'utf8'));
    assert.ok(docker(['container', 'ls', '-aq', '--filter', `name=${prefix}-work`]).trim());
    const recovered = recoverExecutionOwners(journals); assert.equal(recovered[0].status, 'clean');
    receipts.push({ scenario: 'abrupt-process-loss', execution: { status: 'process-lost', ...exit }, ...recovered[0] });
    assert.deepEqual(recoverExecutionOwners(journals), []);
    if (process.env.LIGHTHOUSE_CLEANUP_EVIDENCE) await writeFile(process.env.LIGHTHOUSE_CLEANUP_EVIDENCE, JSON.stringify({ image, receipts }, null, 2) + '\n');
    complete = true;
  } finally {
    docker(['rm', '-f', control]); docker(['network', 'rm', control]); docker(['volume', 'rm', control]);
    if (complete) await rm(directory, { recursive: true, force: true });
    else console.error(`Preserved ownership journals for operator reconciliation: ${directory}`);
  }
});

test('phase removal deletes anonymous volumes and preserves a shared named volume', { skip: !image, timeout: 30000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'lh-phase-volume-'));
  const suffix = randomBytes(8).toString('hex'), shared = `lighthouse-volume-control-${suffix}`;
  const owner = createExecutionOwner(directory, { repository: 'qualification/disposable', runId: suffix.padEnd(64, '0'), workflowRunId: '2', attempt: 1 });
  const config = { resourceOwner: owner }, name = `${owner.prefix}-work`;
  let anonymous;
  try {
    docker(['volume', 'create', shared]);
    runOwnedDocker(config, ['run', '-d', '--name', name, '--volume', '/disposable', '--mount', `type=volume,src=${shared},dst=/shared`, '--entrypoint', 'node', image, '-e', 'setInterval(()=>{},1000)'], { stdio: 'pipe' });
    const mounts = JSON.parse(docker(['inspect', '--format', '{{json .Mounts}}', name]));
    anonymous = mounts.find(mount => mount.Destination === '/disposable').Name;
    docker(['exec', '--user', '0', name, 'node', '-e', 'require("fs").writeFileSync("/shared/sentinel","preserved")']);
    runOwnedDocker(config, ['rm', '-f', name], { stdio: 'pipe' });
    assert.throws(() => docker(['volume', 'inspect', anonymous]));
    assert.equal(owner.cleanup().status, 'clean');
    assert.equal(docker(['run', '--rm', '--network', 'none', '--mount', `type=volume,src=${shared},dst=/shared,readonly`, '--entrypoint', 'node', image, '-e', 'process.stdout.write(require("fs").readFileSync("/shared/sentinel","utf8"))']), 'preserved');
  } finally {
    owner.cleanup();
    if (anonymous) { try { docker(['volume', 'rm', anonymous]); } catch {} }
    docker(['volume', 'rm', shared]);
    await rm(directory, { recursive: true, force: true });
  }
});
