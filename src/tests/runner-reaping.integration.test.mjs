import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const image = process.env.LIGHTHOUSE_TEST_RUNNER_IMAGE;
test('runner image reaps orphaned grandchildren through its default entrypoint', { skip: !image, timeout: 15000 }, async () => {
  assert.match(image, /^sha256:[a-f0-9]{64}$/);
  const directory = await mkdtemp(join(tmpdir(), 'lh-runner-reaping-'));
  const name = `lighthouse-runner-reaping-${randomUUID()}`;
  try {
    await writeFile(join(directory, 'run.sh'), 'exec node /runner/probe.cjs\n');
    await writeFile(join(directory, 'probe.cjs'), `
const {spawn}=require('node:child_process'), fs=require('node:fs');
const child=spawn(process.execPath,['-e',
  'const c=require("node:child_process").spawn(process.execPath,["-e","setTimeout(()=>{},200)"],{detached:true,stdio:"ignore"});console.log(c.pid);c.unref();'
],{stdio:['ignore','pipe','inherit']});
let output='';child.stdout.on('data',chunk=>output+=chunk);
child.on('close',()=>{
  const pid=Number(output.trim());if(!Number.isSafeInteger(pid)||pid<1)process.exit(2);
  const deadline=Date.now()+3000;
  const timer=setInterval(()=>{
    if(!fs.existsSync('/proc/'+pid)){clearInterval(timer);console.log('orphan reaped');}
    else if(Date.now()>deadline){clearInterval(timer);console.error('orphan remains');process.exitCode=1;}
  },25);
});
`);
    const output = execFileSync('docker', ['run', '--rm', '--name', name, '--network', 'none', '--user', `${process.getuid()}:${process.getgid()}`, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:rw,size=16m,mode=1777', '--env', 'LIGHTHOUSE_TELEMETRY_DIR=/tmp/telemetry', '--mount', `type=bind,src=${directory},dst=/runner,readonly`, '--workdir', '/runner', image], { encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] });
    assert.match(output, /orphan reaped/);
  } finally {
    try { execFileSync('docker', ['rm', '-f', '-v', name], { timeout: 10000, stdio: 'ignore' }); } catch {}
    await rm(directory, { recursive: true, force: true });
  }
});
