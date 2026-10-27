import { closeSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, symlink, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { snapshotSource, redactLog, acquireEngineSlot, completionOutput } from '../packages/sdlc/src/opencode-execute.mjs';

async function fixtureHarness(root) {
  const harness = join(root, 'harness');
  await cp(new URL('../packages/sdlc/', import.meta.url), harness, { recursive: true });
  execFileSync('git', ['init', '-q', harness]);
  execFileSync('git', ['-C', harness, 'add', '.']);
  execFileSync('git', ['-C', harness, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'Fixture harness']);
  return join(harness, 'src/opencode-execute.mjs');
}

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
    const fd = acquireEngineSlot(lock, 0);
    try { assert.throws(() => acquireEngineSlot(lock, 0), /capacity unavailable/); }
    finally { closeSync(fd); }
    closeSync(acquireEngineSlot(lock, 0));
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
    execFileSync('git', ['-C', work, 'add', 'README.md']);
    const request = { runId: 'b'.repeat(64), stage: 'refine', issue: 1, sourceRevision: 'c'.repeat(40) };
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
if (args[0] === 'run' && !args.includes('cleanup-session')) {
  const output = args.find(x => x.startsWith('type=bind,src=') && x.endsWith(',dst=/output')).slice(14, -12);
  fs.writeFileSync(output + '/envelope.json', ${JSON.stringify(JSON.stringify(envelope))});
  for (const event of ${JSON.stringify(events)}) process.stdout.write(JSON.stringify(event) + '\\n');
}
`);
    await chmod(shim, 0o755);
    const execution = spawnSync(process.execPath, [await fixtureHarness(root)], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'config.json'), RUNNER_TEMP: root, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(root, 'prompt.txt'), GH_AW_SAFE_OUTPUTS: join(root, 'safeoutputs', 'outputs.jsonl') } });
    assert.equal(execution.status, 0, execution.stdout + execution.stderr);
    assert.match(execution.stdout, /\[OpenCode\] Checking scope/);
    assert.match(execution.stdout, /\[Result\] Scope is ready/);
    assert.ok(!execution.stdout.includes('Full file content'));
    assert.ok(!execution.stdout.includes('"tokens"'));
    assert.ok(!execution.stdout.split('\n').some(line => line.startsWith('::')));
    const recorded = (await readFile(join(root, 'gh-aw', 'opencode-events-1-1.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.deepEqual(recorded, events);
    assert.equal(JSON.parse(await readFile(join(root, 'safeoutputs', 'outputs.jsonl'))).type, 'noop');
    assert.deepEqual(JSON.parse(await readFile(join(runDir, 'envelope.json'))), envelope);
  } finally { await rm(root, { recursive: true, force: true }); }
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
  for (const scenario of ['plan', 'fast', 'apply-review', 'unavailable', 'provider-error']) {
    const root = await mkdtemp(join(tmpdir(), 'lighthouse-models-'));
    try {
      const work = join(root, 'work'), bin = join(root, 'bin'), runDir = join(root, 'lighthouse-1-1');
      for (const dir of [work, bin, runDir]) await mkdir(dir);
      await mkdir(join(work, '.lighthouse'));
      await writeFile(join(work, '.lighthouse/models.json'), JSON.stringify({ schemaVersion: 1, workers: { refine: 'plan', propose: 'plan', review: 'fast', 'apply-review': 'fast' }, profiles: { plan: { model: 'openai/test-sol', reasoningEffort: 'high' }, fast: { model: 'openai/test-luna', reasoningEffort: 'medium' } } }));
      execFileSync('git', ['init', '-q', work]); execFileSync('git', ['-C', work, 'add', '.']);
      const stage = scenario === 'apply-review' ? 'propose' : scenario === 'fast' ? 'review' : 'refine';
      const request = { runId: 'd'.repeat(64), stage, issue: 1, sourceRevision: 'e'.repeat(40) };
      const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage, gate: stage === 'propose' ? 'planned' : stage === 'refine' ? 'ready' : null, status: scenario === 'apply-review' ? 'blocked' : 'passed', evidence: [{ id: 'fixture', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'await owner' }, effect: { type: 'issue-comment', body: 'Fixture only.' } };
      await writeFile(join(runDir, 'request.json'), JSON.stringify(request)); await writeFile(join(runDir, 'context.json'), '{}'); await writeFile(join(root, 'prompt'), 'Fixture');
      if (scenario === 'unavailable') for (const file of ['envelope.json', 'runtime.json', 'changes.json', 'checks.json']) await writeFile(join(runDir, file), 'stale output');
      await writeFile(join(root, 'config'), JSON.stringify({ image: `sha256:${'a'.repeat(64)}`, uid: 20003, authVolume: 'fixture-auth', model: 'legacy-unchanged', lock: join(root, 'lock'), modelProfiles: { schemaVersion: 1, enabled: true }, modelCapabilities: { 'openai/test-sol': { available: scenario !== 'unavailable', tools: true, reasoningEfforts: ['high'] }, 'openai/test-luna': { available: true, tools: true, reasoningEfforts: ['medium'] } } }));
      const callsFile = join(root, 'calls.jsonl'), shim = join(bin, 'docker');
      await writeFile(shim, `#!${process.execPath}
const fs = require('node:fs'), args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(callsFile)}, JSON.stringify(args)+'\\n');
const mount=args.find(a=>a.startsWith('type=bind,src=')&&a.endsWith(',dst=/output'));
if(mount) {
  fs.writeFileSync(mount.slice(14,-12)+'/envelope.json', ${JSON.stringify(JSON.stringify(envelope))});
  if(${JSON.stringify(scenario)}==='provider-error') console.log(JSON.stringify({type:'error',error:{message:'model unavailable'}}));
}
`);
      await chmod(shim, 0o755);
      const execution = spawnSync(process.execPath, [await fixtureHarness(root)], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'config'), RUNNER_TEMP: root, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(root, 'prompt'), GH_AW_SAFE_OUTPUTS: join(root, 'completion'), LIGHTHOUSE_WORKER: scenario === 'apply-review' ? 'apply-review' : stage } });
      if (scenario === 'unavailable') {
        assert.notEqual(execution.status, 0); assert.match(execution.stderr, /unavailable/);
        await assert.rejects(readFile(callsFile));
        for (const file of ['envelope.json', 'runtime.json', 'changes.json', 'checks.json']) await assert.rejects(readFile(join(runDir, file)));
      } else {
        const calls = (await readFile(callsFile, 'utf8')).trim().split('\n').map(JSON.parse);
        const agents = calls.filter(args => args.some(arg => arg.endsWith(',dst=/output')));
        assert.equal(agents.length, 1);
        const model = ['fast', 'apply-review'].includes(scenario) ? 'openai/test-luna#medium' : 'openai/test-sol#high';
        assert.ok(agents[0].includes(`ENGINE_MODEL=${model}`));
        assert.ok(!agents[0].some(arg => /(?:TIER|API_KEY)=/.test(arg)));
        const receipt = JSON.parse(await readFile(join(runDir, 'runtime.json'), 'utf8'));
        assert.equal(receipt.modelExecution.resolved.engineModel, model);
        assert.equal(receipt.modelExecution.providerReported.status, 'unverified');
        if (scenario === 'provider-error') {
          assert.notEqual(execution.status, 0); assert.match(execution.stderr, /no model fallback/);
          await assert.rejects(readFile(join(root, 'completion')));
        } else assert.equal(execution.status, 0, execution.stdout + execution.stderr);
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  }
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
    const request = { runId: 'a'.repeat(64), stage: 'implement', issue: 1, sourceRevision: 'b'.repeat(40), implementation: { policy: { paths: ['demo.js'] } } };
    await writeFile(join(runDir, 'request.json'), JSON.stringify(request)); await writeFile(join(runDir, 'context.json'), '{}'); await writeFile(join(root, 'prompt'), 'Implement');
    await writeFile(join(root, 'config'), JSON.stringify({ image: `sha256:${'a'.repeat(64)}`, implementationImage: `sha256:${'b'.repeat(64)}`, uid: 20003, authVolume: 'fixture', model: 'fixture', lock: join(root, 'lock') }));
    const shim = join(bin, 'docker');
    await writeFile(shim, `#!${process.execPath}\nconst fs=require('node:fs'); const args=process.argv.slice(2); if(args.includes('chown')) process.exit(0); const mount=args.find(x=>x.startsWith('type=bind,src=')&&x.endsWith(',dst=/workspace')); if(mount){ const source=mount.slice(14,-15); fs.writeFileSync(source+'/demo.js','partial implementation'); process.exitCode=1; }\n`);
    await chmod(shim, 0o755);
    const result = spawnSync(process.execPath, [await fixtureHarness(root)], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIGHTHOUSE_ENGINE_CONFIG: join(root, 'config'), RUNNER_TEMP: root, GITHUB_RUN_ID: '1', GITHUB_RUN_ATTEMPT: '1', GITHUB_WORKSPACE: work, GH_AW_PROMPT: join(root, 'prompt'), GH_AW_SAFE_OUTPUTS: join(root, 'completion') } });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const changes = JSON.parse(await readFile(join(runDir, 'changes.json')));
    assert.equal(Buffer.from(changes[0].content, 'base64').toString(), 'partial implementation');
    await assert.rejects(readFile(join(root, 'completion')));
    await assert.rejects(readFile(join(runDir, 'envelope.json')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('declared environment preflights before agent, validates with fresh services, and cleans failures', async () => {
  const { mkdir, chmod } = await import('node:fs/promises');
  const { spawnSync } = await import('node:child_process');
  for (const outcome of ['success', 'missing-sdk', 'missing-agent', 'agent-failure', 'agent-cancel']) {
    const root = await mkdtemp(join(tmpdir(), 'lighthouse-environment-'));
    try {
      const work = join(root, 'work'), bin = join(root, 'bin'), runDir = join(root, 'lighthouse-1-1'), callsFile = join(root, 'calls.jsonl');
      for (const dir of [work, bin, runDir]) await mkdir(dir);
      execFileSync('git', ['init', '-q', work]);
      await writeFile(join(work, 'demo.js'), 'old'); execFileSync('git', ['-C', work, 'add', 'demo.js']);
      const image = `sha256:${'b'.repeat(64)}`, postgresImage = `sha256:${'c'.repeat(64)}`;
      const request = { runId: 'a'.repeat(64), stage: 'implement', issue: 1, sourceRevision: 'b'.repeat(40), implementation: { environment: { schemaVersion: 1, profile: 'dotnet', services: ['postgresql'] }, policy: { paths: ['demo.js'], checks: [['node', '--version']], reviewRequired: false } } };
      const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'implement', gate: 'done', status: 'passed', evidence: [{ id: 'test', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'await owner' }, effect: { type: 'issue-comment', body: 'Candidate ready.' } };
      await writeFile(join(runDir, 'request.json'), JSON.stringify(request)); await writeFile(join(runDir, 'context.json'), '{}'); await writeFile(join(root, 'prompt'), 'Implement');
      await writeFile(join(root, 'config'), JSON.stringify({ image: `sha256:${'d'.repeat(64)}`, environments: { dotnet: { image, postgresImage } }, uid: 20003, authVolume: 'fixture', model: 'fixture', lock: join(root, 'lock') }));
      const shim = join(bin, 'docker');
      await writeFile(shim, `#!${process.execPath}
const fs = require('node:fs'), args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(callsFile)}, JSON.stringify(args)+'\\n');
const mount = dst => args.find(a => a.startsWith('type=bind,src=') && a.endsWith(',dst='+dst))?.slice(14).split(',dst=')[0];
if(args.includes('cleanup-session') || args[0]==='rm' || args[0]==='network' || args.includes('chown')) process.exit(0);
if(args.includes('-d')) process.exit(0);
if(args[0]==='exec') { if(args.includes('postgres')) console.log('postgres (PostgreSQL) 17.7'); process.exit(0); }
if(args.some(a => a.endsWith('-checks'))) { console.log(args.find(a=>a.startsWith('SOFA_TEST_DATABASE='))); process.exit(0); }
if(args.includes('--entrypoint')) {
 const cmd=args[args.indexOf('--entrypoint')+1];
 if(cmd==='dotnet' && ${JSON.stringify(outcome)}==='missing-sdk') process.exit(1);
 if(cmd==='opencode' && ${JSON.stringify(outcome)}==='missing-agent') process.exit(1);
 console.log(cmd==='node'?'v24.13.0':cmd==='dotnet'?'10.0.100':cmd==='opencode'?'opencode v2.1.0':'ok'); process.exit(0);
}
if(mount('/output')) {
 fs.writeFileSync(mount('/workspace')+'/demo.js','new');
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
      if (outcome === 'missing-sdk' || outcome === 'missing-agent') {
        assert.notEqual(execution.status, 0); assert.equal(agents.length, 0); assert.equal(services.length, 0);
        assert.match(execution.stderr, outcome === 'missing-sdk' ? /prerequisite failed: .NET SDK/ : /prerequisite failed: OpenCode 2.1.0/);
      } else {
        assert.equal(agents.length, 1); assert.ok(!agents[0].join(' ').includes('docker.sock'));
        assert.ok(calls.findIndex(a => a.includes('dotnet')) < calls.indexOf(agents[0]));
        assert.equal(services.length, outcome === 'success' ? 2 : 1);
        for (const service of services) {
          const name = service[service.indexOf('--name') + 1];
          assert.ok(calls.some(a => a[0] === 'rm' && a.includes('-v') && a.includes(name)));
          assert.ok(calls.some(a => a[0] === 'network' && a[1] === 'rm' && a.includes(name.replace(/-postgres$/, '-network'))));
        }
        if (outcome === 'success') {
          assert.equal(execution.status, 0, execution.stdout + execution.stderr);
          const check = calls.find(a => a.some(v => v.endsWith('-checks')) && a[0] === 'run');
          assert.ok(!check.join(' ').includes('fixture,dst=')); assert.ok(!check.join(' ').includes('docker.sock'));
          assert.notEqual(check.find(v => v.startsWith('SOFA_TEST_DATABASE=')), agents[0].find(v => v.startsWith('SOFA_TEST_DATABASE=')));
          const receipt = JSON.parse(await readFile(join(runDir, 'checks.json'), 'utf8'));
          assert.equal(receipt.image, image); assert.equal(receipt.serviceCleanup, true);
          assert.equal(receipt.environment.services[0].image, postgresImage);
          assert.equal(JSON.parse(await readFile(join(runDir, 'runtime.json'), 'utf8')).environment.profile, 'dotnet');
          const log = await readFile(join(runDir, 'evidence/host/check-1.log'), 'utf8');
          assert.ok(!log.includes('Password=')); assert.match(log, /TEST DATABASE/);
        } else assert.notEqual(execution.status, 0);
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  }
});
