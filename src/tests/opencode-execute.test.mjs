import { closeSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, symlink, rm, cp, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const resourceShim = fileURLToPath(new URL('./helpers/docker-resource-state.cjs', import.meta.url));
import { snapshotSource, redactLog, acquireEngineSlot, completionOutput } from '../packages/sdlc/src/opencode-execute.mjs';

async function fixtureHarness(root) {
  const harness = join(root, 'harness');
  await cp(new URL('../packages/sdlc/', import.meta.url), harness, { recursive: true });
  execFileSync('git', ['init', '-q', harness]);
  execFileSync('git', ['-C', harness, 'add', '.']);
  execFileSync('git', ['-C', harness, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Fixture harness']);
  return join(harness, 'src/opencode-execute.mjs');
}

test('apply-review host preparation requalifies archived plans without resurrecting an active change', { timeout: 120000 }, async t => {
  const { mkdir, chmod } = await import('node:fs/promises');
  const { spawnSync } = await import('node:child_process');
  const plan = 'openspec/changes/issue-414-proposal', archive = 'openspec/changes/archive/2026-11-02-issue-414-proposal';
  const metadata = '# Reviewed metadata\nschema: spec-driven\ncreated: 2026-11-01\nskip_specs: true\n';
  const proposal = '# Proposal\n\n## Why\nPreserve the verified implementation.\n\n## What Changes\n- Retain verification.\n\n## Capabilities\n\n### New Capabilities\nNone.\n\n### Modified Capabilities\nNone.\n\n## Impact\nVerification only.\n';
  for (const scenario of ['archive', 'active', 'new', 'incomplete', 'ambiguous', 'missing-metadata', 'conflicting']) await t.test(scenario, async () => {
    const root = await mkdtemp(join(tmpdir(), 'lighthouse-plan-caller-'));
    try {
      const work = join(root, 'work'), bin = join(root, 'bin'), runDir = join(root, 'lighthouse-1-1');
      for (const path of [work, bin, runDir]) await mkdir(path);
      await writeFile(join(work, 'demo.js'), 'export const verified = true;\n');
      const writePlan = async target => {
        await mkdir(join(work, target), { recursive: true });
        for (const [name, content] of Object.entries({ '.openspec.yaml': metadata, 'proposal.md': proposal, 'design.md': '# Design\nPreserve existing verification.\n', 'tasks.md': '- [x] Implemented and checked.\n' })) await writeFile(join(work, target, name), content);
      };
      if (scenario !== 'new') await writePlan(scenario === 'active' ? plan : archive);
      if (scenario === 'incomplete') await writeFile(join(work, archive, 'tasks.md'), '- [ ] Not complete\n');
      if (scenario === 'ambiguous') await writePlan(archive.replace('2026-11-02', '2026-11-03'));
      if (scenario === 'missing-metadata') await rm(join(work, archive, '.openspec.yaml'));
      if (scenario === 'conflicting') await writePlan(plan);
      execFileSync('git', ['init', '-q', work]); execFileSync('git', ['-C', work, 'add', '.']);
      execFileSync('git', ['-C', work, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Reviewed source']);
      const head = execFileSync('git', ['-C', work, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
      const checks = [['node', '-e', `const f=require('node:fs'),a=require('node:assert/strict');a.equal(f.readFileSync('demo.js','utf8'),'export const verified = true;\\n');${scenario === 'archive' ? `a.equal(f.existsSync('${plan}'),false);a.equal(f.readFileSync('${archive}/.openspec.yaml','utf8'),${JSON.stringify(metadata)});` : ''}`]];
      const request = { repository: 'owner/fixture', workflowRunId: '1', attempt: 1, taskDigest: 'd'.repeat(64), runId: 'a'.repeat(64), stage: 'implement', worker: 'apply-review', issue: 414, sourceRevision: head, baseRevision: 'b'.repeat(40), implementationReview: { issue: 414, approved: false, head, implementationIdentity: 'c'.repeat(64), feedbackDigest: 'e'.repeat(64) }, implementation: { proposal: { root: plan }, policy: { paths: ['*'], checks, reviewRequired: false } } };
      const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'implement', gate: 'done', status: 'passed', evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Independent review remains required.' }, effect: { type: 'issue-comment', body: 'Fixture only.' } };
      await writeFile(join(runDir, 'request.json'), JSON.stringify(request)); await writeFile(join(runDir, 'context.json'), '{}');
      await writeFile(join(root, 'prompt'), 'Verify the existing candidate.');
      await writeFile(join(root, 'config'), JSON.stringify({ image: `sha256:${'f'.repeat(64)}`, implementationImage: `sha256:${'f'.repeat(64)}`, uid: 20003, authVolume: 'fixture-auth', model: 'fixture', lock: join(root, 'lock') }));
      const cli = fileURLToPath(new URL('../../node_modules/@fission-ai/openspec/bin/openspec.js', import.meta.url));
      await writeFile(join(bin, 'npx'), `#!${process.execPath}\nconst c=require('node:child_process'),a=process.argv.slice(2),i=a.indexOf('openspec');if(i<0)process.exit(2);const r=c.spawnSync(process.execPath,[${JSON.stringify(cli)},...a.slice(i+1)],{stdio:'inherit'});process.exit(r.status??1);\n`);
      await chmod(join(bin, 'npx'), 0o755);
      await writeFile(join(bin, 'docker'), `#!${process.execPath}
const fs=require('node:fs'),cp=require('node:child_process'),args=process.argv.slice(2);
require(${JSON.stringify(resourceShim)})(args);
if(args[0]==='image'){console.log(JSON.stringify({entrypoint:['fixture-engine']}));process.exit(0);}
if(args.includes('chown'))process.exit(0);
if(args.includes('--entrypoint')&&!args.some(a=>a.startsWith('type=bind,'))){console.log(args[args.indexOf('--entrypoint')+1]==='opencode'?'opencode v2.1.0':'v24.22.1');process.exit(0);}
const mount=dst=>args.find(a=>a.startsWith('type=bind,src=')&&a.endsWith(',dst='+dst))?.slice(14,-(',dst='+dst).length);
const output=mount('/output');
if(output){
 fs.writeFileSync(${JSON.stringify(join(root, 'engine-started'))},'yes');
 if(${JSON.stringify(scenario)}==='new'){
  const target=mount('/workspace')+'/'+${JSON.stringify(plan)};
  fs.writeFileSync(target+'/proposal.md',${JSON.stringify(proposal)});fs.writeFileSync(target+'/design.md','# Design\\nRetain verification.\\n');fs.writeFileSync(target+'/tasks.md','- [x] Implemented and checked.\\n');fs.appendFileSync(target+'/.openspec.yaml','skip_specs: true\\n');
 }
 fs.writeFileSync(output+'/envelope.json',${JSON.stringify(JSON.stringify(envelope))});
}
if(mount('/diagnostics')){const r=cp.spawnSync(${JSON.stringify(process.execPath)},${JSON.stringify(checks[0].slice(1))},{cwd:mount('/workspace'),stdio:'inherit'});process.exit(r.status??1);}
`);
      await chmod(join(bin, 'docker'), 0o755);
      const run = spawnSync(process.execPath, [await fixtureHarness(root)], { encoding: 'utf8', timeout: 60000, env: { ...process.env, OPENSPEC_TELEMETRY: '0', PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'config'), RUNNER_TEMP: root, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(root, 'prompt'), GH_AW_SAFE_OUTPUTS: join(root, 'completion') } });
      if (['archive', 'active', 'new'].includes(scenario)) {
        assert.equal(run.status, 0, run.stdout + run.stderr);
        const changes = JSON.parse(await readFile(join(runDir, 'changes.json')));
        if (scenario !== 'new') assert.deepEqual(changes, []);
        const receipt = JSON.parse(await readFile(join(runDir, 'checks.json')));
        assert.equal(receipt.checks[0].exitCode, 0);
        assert.equal(receipt.sourceRevision, head);
        assert.match(receipt.candidateTree, /^[a-f0-9]{40}$/);
        assert.equal(JSON.parse(await readFile(join(runDir, 'envelope.json'))).result.status, 'passed');
        if (scenario === 'archive') assert.equal(JSON.parse(await readFile(join(runDir, 'runtime.json'))).planningMetadata, undefined);
      } else {
        assert.notEqual(run.status, 0, run.stdout + run.stderr);
        assert.match(run.stderr, /incomplete|Ambiguous archived|missing .openspec.yaml|Conflicting active/);
        await assert.rejects(readFile(join(root, 'engine-started')), { code: 'ENOENT' });
        await assert.rejects(readFile(join(root, 'completion')), { code: 'ENOENT' });
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});

test('engine snapshot contains tracked regular files but no checkout credentials or symlink targets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-source-')), out = await mkdtemp(join(tmpdir(), 'lh-snapshot-'));
  try {
    execFileSync('git', ['init', '-q', root]);
    await writeFile(join(root, 'asset.png'), Buffer.alloc(4 * 1024 * 1024, 255));
    await writeFile(join(root, 'untracked-secret'), 'private');
    await symlink('untracked-secret', join(root, 'link'));
    execFileSync('git', ['-C', root, 'add', 'asset.png', 'link']);
    await snapshotSource(root, out);
    assert.equal((await readFile(join(out, 'asset.png'))).length, 4 * 1024 * 1024);
    for (const path of ['.git/config', 'link', 'untracked-secret']) await assert.rejects(readFile(join(out, path)));
  } finally { await rm(root, { recursive: true, force: true }); await rm(out, { recursive: true, force: true }); }
});
test('engine logs retain execution events while removing common credential formats', () => {
  const raw = `tool read /workspace/src/main.ts Bearer private-token ${'sk-' + 'abcdefghijklmnop'} ${'ghp_' + 'abcdefghijklmnop'} eyJhbGci.eyJzdWI.signature`;
  const clean = redactLog(raw);
  assert.match(clean, /tool read \/workspace\/src\/main.ts/);
  for (const secret of ['private-token', 'sk-' + 'abcdefghijklmnop', 'ghp_' + 'abcdefghijklmnop', 'eyJhbGci']) assert.ok(!clean.includes(secret));
});

test('host engine lock excludes another execution and releases with its descriptor', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-slot-'));
  try {
    const lock = join(root, 'engine.lock');
    const fd = await acquireEngineSlot(lock, 0);
    try { await assert.rejects(acquireEngineSlot(lock, 0), /capacity unavailable/); }
    finally { closeSync(fd); }
    closeSync(await acquireEngineSlot(lock, 0));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('gh-aw completion requires a valid completed envelope and does not imply publication', () => {
  const request = { runId: 'b'.repeat(64), stage: 'refine' };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, ...request, gate: 'ready', status: 'passed', evidence: [{ id: 'scope', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'await owner' }, effect: { type: 'issue-comment', body: 'Refined scope' } };
  assert.equal(completionOutput(envelope, request).type, 'noop');
  assert.match(completionOutput(envelope, request).message, /separate publisher job/);
  const blocked = { ...envelope, result: { ...envelope.result, status: 'blocked', missingEvidence: ['audience'] } };
  assert.match(completionOutput(blocked, request).message, /blocked/);
  for (const change of [{ runId: 'c'.repeat(64) }, { gate: null }, { status: 'running' }, { pendingReview: ['owner'] }]) {
    assert.throws(() => completionOutput({ ...envelope, result: { ...envelope.result, ...change } }, request));
  }
});

test('engine adapter preserves structured evidence while streaming readable output', async () => {
  const { mkdir, chmod } = await import('node:fs/promises');
  const { spawnSync } = await import('node:child_process');
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-progress-'));
  try {
    const work = join(root, 'work'), bin = join(root, 'bin'), runDir = join(root, 'lighthouse-1-1');
    for (const dir of [work, bin, runDir]) await mkdir(dir);
    execFileSync('git', ['init', '-q', work]);
    await writeFile(join(work, 'README.md'), 'Product source');
    await mkdir(join(work, 'tools'));
    await writeFile(join(work, 'tools', 'adopter.txt'), 'Tracked adopter tool');
    execFileSync('git', ['-C', work, 'add', 'README.md', 'tools/adopter.txt']);
    const workflow = await readFile(new URL('../packages/sdlc/workflows/lighthouse-sdlc-refine.md', import.meta.url), 'utf8');
    const engine = await readFile(new URL('../packages/sdlc/workflows/shared/lighthouse-opencode.md', import.meta.url), 'utf8');
    assert.match(workflow, /path: \.lighthouse-harness/);
    assert.match(engine, /\.lighthouse-harness\/src\/packages\/sdlc\/src\/opencode-execute\.mjs/);
    await fixtureHarness(root);
    await mkdir(join(work, '.lighthouse-harness', 'src', 'packages'), { recursive: true });
    await cp(join(root, 'harness'), join(work, '.lighthouse-harness', 'src', 'packages', 'sdlc'), { recursive: true });
    const request = { repository: 'owner/repo', runId: 'b'.repeat(64), stage: 'refine', issue: 1, sourceRevision: 'c'.repeat(40) };
    const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'refine', gate: 'ready', status: 'passed', evidence: [{ id: 'scope', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'await owner' }, effect: { type: 'issue-comment', body: 'Scope is ready.' } };
    await writeFile(join(runDir, 'request.json'), JSON.stringify(request));
    await writeFile(join(runDir, 'context.json'), '{}');
    await writeFile(join(root, 'prompt.txt'), 'Refine the issue.');
    await writeFile(join(root, 'config.json'), JSON.stringify({ image: `sha256:${'a'.repeat(64)}`, uid: 20003, authVolume: 'fixture-auth', model: 'fixture', lock: join(root, 'engine.lock') }));
    const events = [
      { type: 'text', part: { text: 'Checking scope.\n::error::untrusted text' } },
      { type: 'tool_use', part: { tool: 'read', state: { status: 'completed', input: { path: '/workspace/README.md' }, output: 'Full file content retained only in evidence.' } } },
      { type: 'step_finish', part: { tokens: { input: 10, output: 5 } } },
    ];
    const shim = join(bin, 'docker');
    await writeFile(shim, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(join(root, 'docker-calls.jsonl'))}, JSON.stringify(args)+'\\n');
require(${JSON.stringify(resourceShim)})(args);
if (['image', 'run'].includes(args[0]) && !fs.existsSync(${JSON.stringify(join(root, 'image-ready'))})) { console.error('No such image: '+${JSON.stringify(`sha256:${'a'.repeat(64)}`)}); process.exit(125); }
if (args[0] === 'image') { console.log(JSON.stringify({entrypoint:['/usr/local/bin/lighthouse-engine']})); process.exit(0); }
if(args.includes('chown')) process.exit(0);
if(args.includes('--entrypoint')&&!args.some(arg=>arg.startsWith('type=bind,'))){console.log(args[args.indexOf('--entrypoint')+1]==='opencode'?'opencode v2.1.0':'v24.22.1');process.exit(0);}
if (args[0] === 'run' && !args.includes('cleanup-session')) {
  const output = args.find(x => x.startsWith('type=bind,src=') && x.endsWith(',dst=/output')).slice(14, -12);
  fs.writeFileSync(output + '/envelope.json', ${JSON.stringify(JSON.stringify(envelope))});
  for (const event of ${JSON.stringify(events)}) process.stdout.write(JSON.stringify(event) + '\\n');
}
`);
    await chmod(shim, 0o755);
    const missing = spawnSync(process.execPath, [join(work, '.lighthouse-harness/src/packages/sdlc/src/opencode-execute.mjs')], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'config.json'), RUNNER_TEMP: root, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(root, 'prompt.txt'), GH_AW_SAFE_OUTPUTS: join(root, 'safeoutputs', 'outputs.jsonl') } });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /No such image/);
    const failedRuntime = JSON.parse(await readFile(join(runDir, 'runtime.json')));
    assert.equal(failedRuntime.phases.preflight, 'failed');
    assert.equal(failedRuntime.cleanup, undefined);
    assert.deepEqual(await readdir(join(root, 'engine.lock.resources')), []);
    const calls = (await readFile(join(root, 'docker-calls.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    assert.ok(calls.some(args => args[0] === 'image'));
    assert.ok(calls.every(args => args[0] !== 'run' && !(args[0] === 'network' && args[1] === 'create')));
    await assert.rejects(readFile(join(runDir, 'envelope.json')));
    await assert.rejects(readFile(join(root, 'safeoutputs', 'outputs.jsonl')));
    await writeFile(join(root, 'image-ready'), 'provisioned');
    const execution = spawnSync(process.execPath, [join(work, '.lighthouse-harness/src/packages/sdlc/src/opencode-execute.mjs')], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'config.json'), RUNNER_TEMP: root, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(root, 'prompt.txt'), GH_AW_SAFE_OUTPUTS: join(root, 'safeoutputs', 'outputs.jsonl') } });
    assert.equal(execution.status, 0, execution.stdout + execution.stderr);
    assert.equal(await readFile(join(work, 'tools/adopter.txt'), 'utf8'), 'Tracked adopter tool');
    assert.match(execution.stdout, /\[OpenCode\] Checking scope/);
    assert.match(execution.stdout, /\[Result\] Scope is ready/);
    assert.ok(!execution.stdout.includes('Full file content'));
    assert.ok(!execution.stdout.includes('"tokens"'));
    assert.ok(!execution.stdout.split('\n').some(line => line.startsWith('::')));
    const recorded = (await readFile(join(root, 'gh-aw', 'opencode-events-1-1.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.deepEqual(recorded, events);
    assert.equal(JSON.parse(await readFile(join(root, 'safeoutputs', 'outputs.jsonl'))).type, 'noop');
    assert.deepEqual(JSON.parse(await readFile(join(runDir, 'envelope.json'))), envelope);
    assert.equal(JSON.parse(await readFile(join(runDir, 'runtime.json'))).cleanup.status, 'clean');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('forced worker exit recovers an observed async engine but preserves an unobserved create', async () => {
  const { mkdir, chmod } = await import('node:fs/promises');
  const { spawn } = await import('node:child_process');
  const { once } = await import('node:events');
  const { setTimeout: pause } = await import('node:timers/promises');
  const { recoverExecutionOwners } = await import('../packages/sdlc/src/execution-cleanup.mjs');
  for (const observed of [true, false]) {
    const root = await mkdtemp(join(tmpdir(), 'lighthouse-killed-owner-'));
    let child, enginePid;
    try {
      const work = join(root, 'work'), bin = join(root, 'bin'), runDir = join(root, 'lighthouse-1-1');
      for (const dir of [work, bin, runDir]) await mkdir(dir);
      execFileSync('git', ['init', '-q', work]);
      await writeFile(join(work, 'README.md'), 'Read-only source'); execFileSync('git', ['-C', work, 'add', '.']);
      await writeFile(join(runDir, 'request.json'), JSON.stringify({ repository: 'owner/repo', runId: 'a'.repeat(64), stage: 'triage', issue: 1, sourceRevision: 'b'.repeat(40) }));
      await writeFile(join(runDir, 'context.json'), '{}'); await writeFile(join(root, 'prompt'), 'Read only');
      await writeFile(join(root, 'config'), JSON.stringify({ image: `sha256:${'c'.repeat(64)}`, uid: 20003, authVolume: 'fixture', model: 'fixture', lock: join(root, 'lock') }));
      const shim = join(bin, 'docker');
      await writeFile(shim, `#!${process.execPath}
const fs=require('node:fs'), args=process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(join(root, 'calls.jsonl'))},JSON.stringify(args)+'\\n');
require(${JSON.stringify(resourceShim)})(args);
if(args[0]==='image'){console.log(JSON.stringify({entrypoint:['engine']}));process.exit(0);}
if(args[1]==='ls'||args[1]==='inspect'||args[0]==='rm'||args[1]==='rm'||args.includes('chown'))process.exit(0);
if(args.includes('--entrypoint')&&!args.some(arg=>arg.endsWith(',dst=/output'))){console.log(args[args.indexOf('--entrypoint')+1]==='opencode'?'opencode v2.1.0':'v24.22.1');process.exit(0);}
if(args.some(arg=>arg.endsWith(',dst=/output'))){
 fs.writeFileSync(${JSON.stringify(join(root, 'engine-started'))},String(process.pid));
 if(${observed}) for(let i=0;i<3;i++)console.log(JSON.stringify({type:'text',part:{text:'Observed async engine'}}));
 setTimeout(()=>process.exit(0),3000);
}
`);
      await chmod(shim, 0o755);
      child = spawn(process.execPath, [await fixtureHarness(root)], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'config'), RUNNER_TEMP: root, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(root, 'prompt'), GH_AW_SAFE_OUTPUTS: join(root, 'safeoutputs') }, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '', stderr = '';
      child.stdout.on('data', chunk => { stdout += chunk; if (observed && (stdout.match(/\[OpenCode\] Observed async engine/g)?.length ?? 0) === 3) child.kill('SIGKILL'); });
      child.stderr.on('data', chunk => { stderr += chunk; });
      const exited = once(child, 'close');
      if (!observed) {
        const deadline = Date.now() + 10000;
        while (true) {
          try { await readFile(join(root, 'engine-started')); break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
          assert.ok(Date.now() < deadline, stdout + stderr); await pause(20);
        }
        child.kill('SIGKILL');
      }
      const [, signal] = await exited; assert.equal(signal, 'SIGKILL', stdout + stderr);
      enginePid = Number(await readFile(join(root, 'engine-started'), 'utf8'));
      const directory = join(root, 'lock.resources'), files = await readdir(directory);
      assert.equal(files.length, 1);
      const journal = JSON.parse(await readFile(join(directory, files[0])));
      assert.equal(journal.resources.find(resource => resource.name.endsWith('-engine')).pending, !observed);
      const engineName = journal.resources.find(resource => resource.name.endsWith('-engine')).name;
      const engineId = createHash('sha256').update(engineName).digest('hex');
      const calls = (await readFile(join(root, 'calls.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
      assert.equal(calls.filter(args => args[0] === 'container' && args[1] === 'inspect' && args.includes(engineId)).length, observed ? 1 : 0);
      await assert.rejects(readFile(join(runDir, 'envelope.json')));
      await assert.rejects(readFile(join(root, 'safeoutputs')));
      const run = args => execFileSync(shim, args, { encoding: 'utf8' });
      try { process.kill(enginePid, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
      run(['rm', '-f', journal.resources.find(resource => resource.name.endsWith('-engine')).name]);
      if (observed) assert.equal(recoverExecutionOwners(directory, { run })[0].status, 'clean');
      else assert.throws(() => recoverExecutionOwners(directory, { run }), /not verified absent/);
    } finally {
      child?.kill('SIGKILL');
      try { process.kill(enginePid ?? Number(await readFile(join(root, 'engine-started'), 'utf8')), 'SIGKILL'); } catch (error) { if (!['ENOENT', 'ESRCH'].includes(error.code)) throw error; }
      await rm(root, { recursive: true, force: true });
    }
  }
});

test('oversized diagnostics cannot stop execution or leak partial secrets, and framing recovers', async () => {
  const { boundedEventLines } = await import('../packages/sdlc/src/opencode-progress.mjs');
  const lines = []; let omitted = 0;
  const reader = boundedEventLines(line => lines.push(redactLog(line)), () => omitted++, 64);
  reader.write('first\nBearer '); reader.write('secret-token\n');
  reader.write('Bearer ' + 'x'.repeat(100)); reader.write('still-sensitive\nnext\nlast'); reader.end();
  assert.deepEqual(lines, ['first', 'Bearer [REDACTED]', 'next', 'last']);
  assert.equal(omitted, 1);
  const large = boundedEventLines(line => lines.push(line.length), () => omitted++);
  large.write('x'.repeat(2 * 1024 * 1024)); large.write('\n'); large.end();
  assert.equal(lines.at(-1), 2 * 1024 * 1024); assert.equal(omitted, 1);
});

test('profile adapter forwards two worker variants, marks receipts unverified and never falls back', async () => {
  const { mkdir, chmod } = await import('node:fs/promises');
  const { spawnSync } = await import('node:child_process');
  for (const scenario of ['plan', 'fast', 'apply-review', 'unavailable', 'provider-error', 'execution', 'denied']) {
    const root = await mkdtemp(join(tmpdir(), 'lighthouse-models-'));
    try {
      const work = join(root, 'work'), bin = join(root, 'bin'), runDir = join(root, 'lighthouse-1-1');
      for (const dir of [work, bin, runDir]) await mkdir(dir);
      await mkdir(join(work, '.lighthouse'));
      await writeFile(join(work, '.lighthouse/models.json'), JSON.stringify({ schemaVersion: 1, workers: { refine: 'plan', propose: 'plan', review: 'fast', 'apply-review': 'fast' }, profiles: { plan: { model: 'openai/test-sol', reasoningEffort: 'high' }, fast: { model: 'openai/test-luna', reasoningEffort: 'medium' } } }));
      execFileSync('git', ['init', '-q', work]); execFileSync('git', ['-C', work, 'add', '.']);
      const stage = scenario === 'apply-review' ? 'propose' : scenario === 'fast' ? 'review' : 'refine';
      const request = { repository: 'owner/repo', runId: 'd'.repeat(64), stage, issue: 1, sourceRevision: 'e'.repeat(40), ...(['execution', 'denied'].includes(scenario) ? { modelSelection: { model: 'openai/test-luna', reasoningEffort: 'medium' } } : {}) };
      const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage, gate: stage === 'propose' ? 'planned' : stage === 'refine' ? 'ready' : null, status: scenario === 'apply-review' ? 'blocked' : 'passed', evidence: [{ id: 'fixture', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'await owner' }, effect: { type: 'issue-comment', body: 'Fixture only.' } };
      await writeFile(join(runDir, 'request.json'), JSON.stringify(request)); await writeFile(join(runDir, 'context.json'), '{}'); await writeFile(join(root, 'prompt'), 'Fixture');
      if (scenario === 'unavailable') for (const file of ['envelope.json', 'runtime.json', 'changes.json', 'checks.json']) await writeFile(join(runDir, file), 'stale output');
      await writeFile(join(root, 'config'), JSON.stringify({ image: `sha256:${'a'.repeat(64)}`, uid: 20003, authVolume: 'fixture-auth', model: 'legacy-unchanged', lock: join(root, 'lock'), modelProfiles: { schemaVersion: 2, enabled: true, allowExecutionSelection: scenario === 'execution' }, modelCapabilities: { 'openai/test-sol': { available: scenario !== 'unavailable', tools: true, reasoningEfforts: ['high'] }, 'openai/test-luna': { available: true, tools: true, reasoningEfforts: ['medium'] } } }));
      const callsFile = join(root, 'calls.jsonl'), shim = join(bin, 'docker');
      await writeFile(shim, `#!${process.execPath}
require(${JSON.stringify(resourceShim)})(process.argv.slice(2));
const fs = require('node:fs'), args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(callsFile)}, JSON.stringify(args)+'\\n');
if (args[0] === 'image') { console.log(JSON.stringify({entrypoint:['/usr/local/bin/lighthouse-engine']})); process.exit(0); }
if(args.includes('chown')) process.exit(0);
if(args.includes('--entrypoint')&&!args.some(arg=>arg.startsWith('type=bind,'))){console.log(args[args.indexOf('--entrypoint')+1]==='opencode'?'opencode v2.1.0':'v24.22.1');process.exit(0);}
const mount=args.find(a=>a.startsWith('type=bind,src=')&&a.endsWith(',dst=/output'));
if(mount) {
  fs.writeFileSync(mount.slice(14,-12)+'/envelope.json', ${JSON.stringify(JSON.stringify(envelope))});
  if(${JSON.stringify(scenario)}==='provider-error') console.log(JSON.stringify({type:'error',error:{message:'model unavailable'}}));
}
`);
      await chmod(shim, 0o755);
      const execution = spawnSync(process.execPath, [await fixtureHarness(root)], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'config'), RUNNER_TEMP: root, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(root, 'prompt'), GH_AW_SAFE_OUTPUTS: join(root, 'completion'), LIGHTHOUSE_WORKER: scenario === 'apply-review' ? 'apply-review' : stage } });
      if (['unavailable', 'denied'].includes(scenario)) {
        assert.notEqual(execution.status, 0); assert.match(execution.stderr, scenario === 'denied' ? /opt-in/ : /unavailable/);
        await assert.rejects(readFile(callsFile));
        for (const file of ['envelope.json', 'runtime.json', 'changes.json', 'checks.json']) await assert.rejects(readFile(join(runDir, file)));
      } else {
        const calls = (await readFile(callsFile, 'utf8')).trim().split('\n').map(JSON.parse);
        const agents = calls.filter(args => args.some(arg => arg.endsWith(',dst=/output')));
        assert.equal(agents.length, 1);
        const model = ['fast', 'apply-review', 'execution'].includes(scenario) ? 'openai/test-luna#medium' : 'openai/test-sol#high';
        assert.ok(agents[0].includes(`ENGINE_MODEL=${model}`));
        assert.ok(!agents[0].some(arg => /(?:TIER|API_KEY)=/.test(arg)));
        const receipt = JSON.parse(await readFile(join(runDir, 'runtime.json'), 'utf8'));
        assert.equal(receipt.modelExecution.resolved.engineModel, model);
        assert.equal(receipt.modelExecution.providerReported.status, 'unverified');
        if (scenario === 'execution') assert.deepEqual(receipt.modelExecution.requested.selector, request.modelSelection);
        if (scenario === 'provider-error') {
          assert.notEqual(execution.status, 0); assert.match(execution.stderr, /no model fallback/);
          await assert.rejects(readFile(join(root, 'completion')));
        } else assert.equal(execution.status, 0, execution.stdout + execution.stderr);
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});

test('a product worker from implementation uses the read-only product engine without implementation policy', async () => {
  const { mkdir, chmod } = await import('node:fs/promises');
  const { spawnSync } = await import('node:child_process');
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-product-parent-'));
  try {
    const work = join(root, 'work'), bin = join(root, 'bin'), runDir = join(root, 'lighthouse-1-1');
    for (const dir of [work, bin, runDir]) await mkdir(dir);
    execFileSync('git', ['init', '-q', work]);
    await writeFile(join(work, 'README.md'), 'Accepted intent'); execFileSync('git', ['-C', work, 'add', 'README.md']);
    const request = { runId: 'a'.repeat(64), stage: 'implement', worker: 'product-change', issue: 1, sourceRevision: 'b'.repeat(40), baselineDigest: 'c'.repeat(64) };
    const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'implement', gate: 'done', status: 'passed', evidence: [{ id: 'intent', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Continue the parent.', output: { productChange: { schemaVersion: 1, outcome: 'aligned', entry: 'parent-handoff', affectedAreas: [], decisions: [] } } }, effect: { type: 'issue-comment', body: 'Intent already covers the request.' } };
    await mkdir(join(runDir, 'product-evidence'));
    await writeFile(join(runDir, 'product-evidence/index.json'), JSON.stringify({ schemaVersion: 1, source: '@prodshape/core', version: '0.25.0', baselineDigest: request.baselineDigest, artifacts: [] }));
    await writeFile(join(runDir, 'request.json'), JSON.stringify(request)); await writeFile(join(runDir, 'context.json'), '{}'); await writeFile(join(root, 'prompt'), 'Check product intent');
    await writeFile(join(root, 'config'), JSON.stringify({ image: `sha256:${'a'.repeat(64)}`, uid: 20003, authVolume: 'fixture', model: 'fixture', lock: join(root, 'lock') }));
    const shim = join(bin, 'docker');
    await writeFile(shim, `#!${process.execPath}\nrequire(${JSON.stringify(resourceShim)})(process.argv.slice(2));\nconst fs=require('node:fs'); const args=process.argv.slice(2); if(args[0]==='image'){console.log(JSON.stringify({entrypoint:['/usr/local/bin/lighthouse-engine']}));process.exit(0);} if(args.includes('chown'))process.exit(0);if(args.includes('--entrypoint')&&!args.some(arg=>arg.startsWith('type=bind,'))){console.log(args[args.indexOf('--entrypoint')+1]==='opencode'?'opencode v2.1.0':'v24.22.1');process.exit(0);} if(args[0]==='run'&&!args.includes('cleanup-session')){ if(!args.some(x=>x.endsWith(',dst=/workspace,readonly')))process.exit(2); const out=args.find(x=>x.startsWith('type=bind,src=')&&x.endsWith(',dst=/output')).slice(14,-12); fs.writeFileSync(out+'/envelope.json',${JSON.stringify(JSON.stringify(envelope))}); }\n`);
    await chmod(shim, 0o755);
    const result = spawnSync(process.execPath, [await fixtureHarness(root)], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'config'), RUNNER_TEMP: root, GITHUB_REPOSITORY: 'owner/repo', GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(root, 'prompt'), GH_AW_SAFE_OUTPUTS: join(root, 'completion') } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(JSON.parse(await readFile(join(runDir, 'envelope.json'))).result.output.productChange.outcome, 'aligned');
    await assert.rejects(readFile(join(runDir, 'changes.json')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('a failed implementation retains its bounded candidate but cannot emit successful completion', async () => {
  const { mkdir, chmod } = await import('node:fs/promises');
  const { spawnSync } = await import('node:child_process');
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-recovery-'));
  try {
    const work = join(root, 'work'), bin = join(root, 'bin'), runDir = join(root, 'lighthouse-1-1');
    for (const dir of [work, bin, runDir]) await mkdir(dir);
    execFileSync('git', ['init', '-q', work]);
    await writeFile(join(work, 'demo.js'), 'old'); execFileSync('git', ['-C', work, 'add', 'demo.js']);
    const request = { repository: 'owner/repo', runId: 'a'.repeat(64), stage: 'implement', issue: 1, sourceRevision: 'b'.repeat(40), implementation: { policy: { paths: ['demo.js'] } } };
    await writeFile(join(runDir, 'request.json'), JSON.stringify(request)); await writeFile(join(runDir, 'context.json'), '{}'); await writeFile(join(root, 'prompt'), 'Implement');
    await writeFile(join(root, 'config'), JSON.stringify({ image: `sha256:${'a'.repeat(64)}`, implementationImage: `sha256:${'b'.repeat(64)}`, uid: 20003, authVolume: 'fixture', model: 'fixture', lock: join(root, 'lock') }));
    const shim = join(bin, 'docker');
    await writeFile(shim, `#!${process.execPath}\nrequire(${JSON.stringify(resourceShim)})(process.argv.slice(2));\nconst fs=require('node:fs'); const args=process.argv.slice(2); if(args[0]==='image'){console.log(JSON.stringify({entrypoint:['/usr/local/bin/lighthouse-engine']}));process.exit(0);} if(args.includes('chown'))process.exit(0);if(args.includes('--entrypoint')&&!args.some(arg=>arg.startsWith('type=bind,'))){console.log(args[args.indexOf('--entrypoint')+1]==='opencode'?'opencode v2.1.0':'v24.22.1');process.exit(0);} if(args.includes('chown')) process.exit(0); const mount=args.find(x=>x.startsWith('type=bind,src=')&&x.endsWith(',dst=/workspace')); if(mount){ const source=mount.slice(14,-15); fs.writeFileSync(source+'/demo.js','partial implementation'); const out=args.find(x=>x.startsWith('type=bind,src=')&&x.endsWith(',dst=/output')).slice(14,-12); fs.mkdirSync(out+'/execution'); fs.writeFileSync(out+'/execution/engine.json',JSON.stringify({signal:'SIGABRT',resources:{pidsLimit:1024,pidsPeak:1024,pidsDenied:2,oomKills:0}})); process.exitCode=134; }\n`);
    await chmod(shim, 0o755);
    const result = spawnSync(process.execPath, [await fixtureHarness(root)], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'config'), RUNNER_TEMP: root, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(root, 'prompt'), GH_AW_SAFE_OUTPUTS: join(root, 'completion') } });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const changes = JSON.parse(await readFile(join(runDir, 'changes.json')));
    assert.equal(Buffer.from(changes[0].content, 'base64').toString(), 'partial implementation');
    const receipt = JSON.parse(await readFile(join(runDir, 'runtime.json')));
    assert.equal(receipt.execution.status, 'process-limit');
    assert.equal(receipt.execution.exitCode, 134);
    assert.equal(receipt.execution.resources.pidsDenied, 2);
    assert.match(result.stderr, /Container process\/thread limit reached/);
    await assert.rejects(readFile(join(root, 'completion')));
    await assert.rejects(readFile(join(runDir, 'envelope.json')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('declared environment preflights before agent, validates with fresh services, and cleans failures', async () => {
  const { mkdir, chmod } = await import('node:fs/promises');
  const { spawnSync } = await import('node:child_process');
  for (const outcome of ['success', 'missing-image', 'invalid-image-entrypoint', 'missing-sdk', 'missing-agent', 'agent-failure', 'agent-cancel', 'ownership-changed']) {
    const root = await mkdtemp(join(tmpdir(), 'lighthouse-environment-'));
    try {
      const work = join(root, 'work'), bin = join(root, 'bin'), runDir = join(root, 'lighthouse-1-1'), callsFile = join(root, 'calls.jsonl');
      for (const dir of [work, bin, runDir]) await mkdir(dir);
      execFileSync('git', ['init', '-q', work]);
      await writeFile(join(work, 'demo.js'), 'old'); execFileSync('git', ['-C', work, 'add', 'demo.js']);
      const image = `sha256:${'b'.repeat(64)}`, postgresImage = `sha256:${'c'.repeat(64)}`;
      const request = { repository: 'owner/repo', runId: 'a'.repeat(64), stage: 'implement', issue: 1, sourceRevision: 'b'.repeat(40), implementation: { environment: { schemaVersion: 1, profile: 'dotnet', services: ['postgresql'] }, policy: { paths: ['demo.js'], checks: [['node', '--version']], reviewRequired: false } } };
      const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'implement', gate: 'done', status: 'passed', evidence: [{ id: 'test', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'await owner' }, effect: { type: 'issue-comment', body: 'Candidate ready.' } };
      await writeFile(join(runDir, 'request.json'), JSON.stringify(request)); await writeFile(join(runDir, 'context.json'), '{}'); await writeFile(join(root, 'prompt'), 'Implement');
      await writeFile(join(root, 'config'), JSON.stringify({ image: `sha256:${'d'.repeat(64)}`, environments: { dotnet: { image, postgresImage } }, uid: 20003, authVolume: 'fixture', model: 'fixture', lock: join(root, 'lock') }));
      const shim = join(bin, 'docker');
      await writeFile(shim, `#!${process.execPath}
require(${JSON.stringify(resourceShim)})(process.argv.slice(2));
const fs = require('node:fs'), args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(callsFile)}, JSON.stringify(args)+'\\n');
if (args[0] === 'image') {
 if (${JSON.stringify(outcome)} === 'missing-image') { console.error('No such image: '+args.at(-1)); process.exit(1); }
 console.log(JSON.stringify({entrypoint:${JSON.stringify(outcome === 'invalid-image-entrypoint' ? [] : ['/usr/local/bin/lighthouse-engine'])}})); process.exit(0);
}
const mount = dst => args.find(a => a.startsWith('type=bind,src=') && a.endsWith(',dst='+dst))?.slice(14).split(',dst=')[0];
if(args.includes('cleanup-session') || args[0]==='rm' || args[0]==='network' || args.includes('chown')) process.exit(0);
if(args.includes('-d')) process.exit(0);
if(args[0]==='exec') { if(args.includes('postgres')) console.log('postgres (PostgreSQL) 17.7'); process.exit(0); }
if(args.some(a => a.endsWith('-checks'))) { console.log(args.find(a=>a.startsWith('SOFA_TEST_DATABASE='))); process.exit(0); }
if(args.includes('--entrypoint') && !mount('/output')) {
 const cmd=args[args.indexOf('--entrypoint')+1];
 if(cmd==='dotnet' && ${JSON.stringify(outcome)}==='missing-sdk') process.exit(1);
 if(cmd==='opencode' && ${JSON.stringify(outcome)}==='missing-agent') process.exit(1);
 console.log(cmd==='node'?'v24.13.0':cmd==='dotnet'?'10.0.115 [/usr/share/dotnet/sdk]':cmd==='aspire'?'13.6.5+fixture':cmd==='opencode'?'opencode v2.1.0':'ok'); process.exit(0);
}
if(mount('/output')) {
 fs.writeFileSync(mount('/workspace')+'/demo.js','new');
 if(${JSON.stringify(outcome)}==='ownership-changed') { const stateFile=require('node:path').join(require('node:path').dirname(process.argv[1]),'.docker-resource-state.json');const rows=JSON.parse(fs.readFileSync(stateFile,'utf8'));const agent=rows.find(row=>row.name.endsWith('-engine'));agent.id='f'.repeat(64);agent.owner='e'.repeat(64);fs.writeFileSync(stateFile,JSON.stringify(rows));process.exit(1); }
  if(${JSON.stringify(outcome)}==='agent-cancel') { process.kill(process.ppid, 'SIGTERM'); setTimeout(()=>process.exit(1), 1000); return; }
 if(${JSON.stringify(outcome)}==='agent-failure') process.exit(1);
 fs.writeFileSync(mount('/output')+'/envelope.json', ${JSON.stringify(JSON.stringify(envelope))});
 console.log(JSON.stringify({type:'text',part:{text:'Checked environment.'}}));
}
`);
      await chmod(shim, 0o755);
      const execution = spawnSync(process.execPath, [await fixtureHarness(root)], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'config'), RUNNER_TEMP: root, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(root, 'prompt'), GH_AW_SAFE_OUTPUTS: join(root, 'safeoutputs', 'outputs.jsonl') } });
      const calls = (await readFile(callsFile, 'utf8')).trim().split('\n').map(JSON.parse);
      const agents = calls.filter(a => a.some(v => v.endsWith(',dst=/output')));
      const services = calls.filter(a => a[0] === 'run' && a.includes('-d'));
      if (outcome === 'missing-image' || outcome === 'invalid-image-entrypoint') {
        assert.notEqual(execution.status, 0);
        assert.equal(agents.length, 0); assert.equal(services.length, 0);
        assert.ok(calls.some(args => args[0] === 'image' && args.at(-1) === image));
        assert.ok(calls.every(args => args[0] !== 'run' && !(args[0] === 'network' && args[1] === 'create')));
        assert.match(execution.stderr, outcome === 'missing-image' ? /No such image/ : /Engine image has no valid entrypoint/);
        const receipt = JSON.parse(await readFile(join(runDir, 'runtime.json')));
        assert.equal(receipt.phases.preflight, 'failed'); assert.equal(receipt.cleanup, undefined);
        await assert.rejects(readFile(join(runDir, 'envelope.json')));
      } else if (outcome === 'missing-sdk' || outcome === 'missing-agent') {
        assert.notEqual(execution.status, 0); assert.equal(agents.length, 0); assert.equal(services.length, 0);
        assert.match(execution.stderr, outcome === 'missing-sdk' ? /prerequisite failed: .NET SDK/ : /prerequisite failed: OpenCode 2.1.0/);
      } else {
        assert.equal(agents.length, 1); assert.ok(!agents[0].join(' ').includes('docker.sock'));
        assert.ok(calls.findIndex(a => a.includes('dotnet')) < calls.indexOf(agents[0]));
        assert.equal(services.length, outcome === 'success' ? 2 : 1);
        for (const service of services) {
          const name = service[service.indexOf('--name') + 1];
          assert.ok(calls.some(a => a[0] === 'rm' && a.includes('-v') && a.includes(createHash('sha256').update(name).digest('hex'))));
          assert.ok(calls.some(a => a[0] === 'network' && a[1] === 'rm' && a.includes(createHash('sha256').update(name.replace(/-postgres$/, '-network')).digest('hex'))));
        }
        if (outcome === 'success') {
          assert.equal(execution.status, 0, execution.stdout + execution.stderr);
          const check = calls.find(a => a.some(v => v.endsWith('-checks')) && a[0] === 'run');
          assert.ok(!check.join(' ').includes('fixture,dst=')); assert.ok(!check.join(' ').includes('docker.sock'));
          for (const container of [agents[0], check]) assert.equal(container[container.indexOf('--pids-limit') + 1], '1024');
          assert.notEqual(check.find(v => v.startsWith('SOFA_TEST_DATABASE=')), agents[0].find(v => v.startsWith('SOFA_TEST_DATABASE=')));
          const receipt = JSON.parse(await readFile(join(runDir, 'checks.json'), 'utf8'));
          assert.equal(receipt.image, image); assert.equal(receipt.serviceCleanup, true);
          assert.equal(receipt.environment.services[0].image, postgresImage);
          assert.equal(JSON.parse(await readFile(join(runDir, 'runtime.json'), 'utf8')).environment.profile, 'dotnet');
          const log = await readFile(join(runDir, 'evidence/host/check-1.log'), 'utf8');
          assert.ok(!log.includes('Password=')); assert.match(log, /TEST DATABASE/);
        } else assert.notEqual(execution.status, 0);
        if (outcome === 'ownership-changed') {
          assert.equal(JSON.parse(await readFile(join(runDir, 'runtime.json'))).cleanup.status, 'unknown');
          const foreign = JSON.parse(await readFile(join(bin, '.docker-resource-state.json'))).find(row => row.id === 'f'.repeat(64));
          assert.ok(foreign); assert.equal(calls.some(args => (args[0] === 'rm' || args[1] === 'rm') && args.includes(foreign.id)), false);
        }
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});
