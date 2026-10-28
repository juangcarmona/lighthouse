import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { runImplementationChecks } from '../packages/sdlc/src/implementation-runtime.mjs';
import { executionReceipt } from '../packages/sdlc/src/execution-resources.mjs';

const image = process.env.LIGHTHOUSE_TEST_IMAGE;
const harness = fileURLToPath(new URL('../packages/sdlc/', import.meta.url));
const docker = args => execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 60000 });

test('real sequential Chromium verification fits the implementation task budget', { skip: !image, timeout: 90000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-browser-budget-'));
  try {
    const workspace = join(root, 'workspace');
    await mkdir(workspace);
    await writeFile(join(workspace, 'browser.mjs'), `import {execFileSync} from 'node:child_process'; import assert from 'node:assert/strict';
for(let i=0;i<3;i++) {
 const html=execFileSync('/usr/bin/chromium',['--headless','--no-sandbox','--disable-dev-shm-usage','--user-data-dir=/tmp/browser-'+i,'--dump-dom','data:text/html,<title>Browser check</title><h1>Ready</h1>'],{encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
 assert.ok(html.includes('<h1>Ready</h1>'));
}
console.log('Three sequential browser checks passed');
`);
    const receipt = await runImplementationChecks({ config: { image, uid: 20003 }, request: { runId: 'browser-budget', sourceRevision: 'fixture', implementation: { policy: { checks: [['node', 'browser.mjs']] } } }, changes: [], workspace, output: join(root, 'diagnostics'), name: `lighthouse-browser-budget-${process.pid}`, redact: text => text, cancelled: () => false });
    const check = receipt.checks[0];
    assert.equal(check.exitCode, 0);
    assert.equal(receipt.limits.pids, 1024);
    assert.equal(check.execution.resources.pidsDenied, 0);
    assert.equal(check.execution.resources.oomKills, 0);
    assert.ok(check.execution.resources.pidsPeak > 0 && check.execution.resources.pidsPeak < 819);
    console.log('Browser resource receipt:', JSON.stringify(check.execution));
    assert.equal(docker(['ps', '-aq', '--filter', `name=^/lighthouse-browser-budget-${process.pid}-checks$`]).trim(), '');
  } finally {
    docker(['run', '--rm', '--network', 'none', '--user', '0:0', '--mount', `type=bind,src=${root},dst=/cleanup`, '--entrypoint', 'chown', image, '-R', `${process.getuid()}:${process.getgid()}`, '/cleanup']);
    await rm(root, { recursive: true, force: true });
  }
});

test('real container receipts distinguish process exhaustion, memory kill and abort', { skip: !image, timeout: 90000 }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-resource-failures-'));
  try {
    for (const scenario of ['process-limit', 'out-of-memory', 'aborted']) {
      const output = join(root, scenario); await mkdir(output); await chmod(output, 0o777);
      const code = scenario === 'process-limit'
        ? "const {spawn}=require('node:child_process');const children=[];let denied=0;for(let i=0;i<160;i++){const child=spawn('sleep',['30'],{stdio:'ignore'});child.on('error',()=>denied++);children.push(child);}setTimeout(()=>{for(const child of children)child.kill();process.exit(denied?7:0);},500);"
        : scenario === 'out-of-memory' ? "Buffer.alloc(512*1024*1024,1);setTimeout(()=>{},1000);" : 'process.abort();';
      const name = `lighthouse-resource-${scenario}-${process.pid}`;
      const run = spawnSync('docker', ['run', '--rm', '--init', '--name', name, '--network', 'none', '--user', '20003:20003', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', scenario === 'out-of-memory' ? '128m' : '512m', '--pids-limit', '128', '--ulimit', 'core=0', '--tmpfs', '/tmp:rw,size=32m', '--mount', `type=bind,src=${harness},dst=/harness,readonly`, '--mount', `type=bind,src=${output},dst=/diagnostics`, '--entrypoint', 'node', image, '/harness/src/managed-command.mjs', 'run', '/diagnostics', 'failure', '--', 'node', '-e', code], { encoding: 'utf8', timeout: 20000, maxBuffer: 1024 * 1024 });
      assert.notEqual(run.status, 0, scenario + run.stdout + run.stderr);
      const observed = await executionReceipt(join(output, 'failure.json'), { code: run.status, signal: run.signal });
      assert.equal(observed.status, scenario, JSON.stringify(observed) + run.stderr);
      if (scenario === 'aborted') assert.equal(observed.signal, 'SIGABRT');
      console.log('Failure resource receipt:', JSON.stringify(observed));
      assert.equal(docker(['ps', '-aq', '--filter', `name=^/${name}$`]).trim(), '');
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
