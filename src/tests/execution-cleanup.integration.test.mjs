import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createExecutionOwner, recoverExecutionOwners, runOwnedDocker } from '../packages/sdlc/src/execution-cleanup.mjs';

const image = process.env.LIGHTHOUSE_TEST_CLEANUP_IMAGE;
const docker = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
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
