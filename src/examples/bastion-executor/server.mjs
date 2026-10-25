// Optional operator-owned executor. GitHub owns jobs, authorizations and publication.
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, readFile, rm, chmod, lstat } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateInput(input) {
  if (!/^[a-f0-9]{64}$/.test(input?.id ?? '')) throw Error('Invalid execution identity');
  if (!Array.isArray(input.files) || input.files.length > 5000) throw Error('Invalid source snapshot');
  let bytes = 0;
  const paths = new Set();
  for (const file of input.files) {
    if (typeof file.path !== 'string' || !file.path || file.path.startsWith('/') || file.path.includes('\\') || file.path.split('/').some(p => !p || p === '.' || p === '..' || p === '.git') || file.path.includes('\0') || paths.has(file.path)) throw Error('Invalid source path');
    // A repeated-group regexp exhausts V8's stack on ordinary image assets.
    if (typeof file.data !== 'string' || Buffer.from(file.data, 'base64').toString('base64') !== file.data) throw Error('Invalid source bytes');
    bytes += Buffer.byteLength(file.data, 'base64'); paths.add(file.path);
  }
  if (bytes > 32 * 1024 * 1024 || !input.context || JSON.stringify(input.context).length > 262144) throw Error('Execution input exceeds bounds');
}
const run = (args) => new Promise((resolveRun, reject) => {
  const p = spawn('docker', args, { stdio: ['ignore', 'ignore', 'pipe'], timeout: 30000, killSignal: 'SIGKILL' });
  p.stderr.on('data', () => {});
  p.on('error', reject); p.on('exit', code => code === 0 ? resolveRun() : reject(Error(`Container command failed (${code})`)));
});
export async function serve(config) {
  if (!/^sha256:[a-f0-9]{64}$/.test(config.image)) throw Error('Pin the engine image digest');
  await mkdir(dirname(config.socket), { recursive: true, mode: 0o750 });
  await mkdir(config.work, { recursive: true, mode: 0o700 });
  // Do not remove a live or stale socket implicitly: operator resolves ownership.
  let active = false, cancelActive = () => {};
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') { res.end(JSON.stringify({ ready: true, busy: active })); return; }
    if (req.method !== 'POST' || req.url !== '/execute') { res.writeHead(404).end(); return; }
    if (active) { res.writeHead(409).end('Executor busy'); return; }
    active = true;
    let dir, timer, heartbeat, child, name, finished = false, cancelled = false;
    const emit = (event) => { if (!res.destroyed) res.write(JSON.stringify(event) + '\n'); };
    const cancel = () => { if (!finished) { cancelled = true; child?.kill('SIGTERM'); if (name) void run(['rm', '-f', name]).catch(() => {}); } };
    cancelActive = cancel;
    res.on('close', cancel);
    try {
      let size = 0, chunks = [];
      for await (const chunk of req) { size += chunk.length; if (size > 48 * 1024 * 1024) throw Error('Request too large'); chunks.push(chunk); }
      const input = JSON.parse(Buffer.concat(chunks)); validateInput(input);
      dir = await mkdtemp(join(config.work, 'execution-'));
      await chmod(dir, 0o755);
      const source = join(dir, 'source'), output = join(dir, 'output'), context = join(dir, 'context.json');
      await mkdir(source); await mkdir(output); await chmod(output, 0o777);
      for (const file of input.files) { const dest = join(source, file.path); await mkdir(dirname(dest), { recursive: true }); await writeFile(dest, Buffer.from(file.data, 'base64'), { mode: 0o444 }); }
      await writeFile(context, JSON.stringify(input.context), { mode: 0o444 });
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      name = `lighthouse-engine-${input.id}`;
      const args = ['run', '--rm', '--name', name, '--user', `${config.uid}:${config.uid}`, '--cpus', '2', '--memory', '2g', '--pids-limit', '128', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
        '--tmpfs', '/tmp:rw,size=256m,mode=1777', '--tmpfs', `/home/engine/.cache:rw,size=256m,uid=${config.uid},gid=${config.uid}`, '--tmpfs', `/home/engine/.config:rw,size=16m,uid=${config.uid},gid=${config.uid}`, '--tmpfs', `/home/engine/.local/state:rw,size=64m,uid=${config.uid},gid=${config.uid}`,
        '--mount', `type=bind,src=${source},dst=/workspace,readonly`, '--mount', `type=bind,src=${output},dst=/output`, '--mount', `type=bind,src=${context},dst=/input/context.json,readonly`, '--mount', `type=volume,src=${config.authVolume},dst=/home/engine/.local/share/opencode`, '--env', `ENGINE_SESSION=ses_${input.id}`, '--env', `ENGINE_MODEL=${config.model}`, config.image];
      emit({ type: 'progress', phase: 'engine-starting', model: config.model });
      const start = Date.now(); let tools = 0;
      heartbeat = setInterval(() => emit({ type: 'progress', phase: 'engine-running', elapsedSeconds: Math.round((Date.now() - start) / 1000), toolEvents: tools }), 15000);
      await new Promise((done, fail) => {
        child = spawn('docker', args, { stdio: ['ignore', 'ignore', 'pipe'] });
        // Only metadata crosses into public logs; never stream provider or source text.
        child.stderr.on('data', chunk => { tools += (chunk.toString().match(/→/g) ?? []).length; });
        child.on('error', fail); child.on('exit', code => code === 0 && !cancelled ? done() : fail(Error('Engine failed or was cancelled')));
        timer = setTimeout(() => { cancel(); }, 600000);
      });
      const path = join(output, 'envelope.json'), stat = await lstat(path);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 128000) throw Error('Invalid engine result file');
      const envelope = JSON.parse(await readFile(path, 'utf8'));
      emit({ type: 'result', envelope });
    } catch (error) {
      if (!res.headersSent) res.writeHead(400, { 'content-type': 'application/x-ndjson' });
      emit({ type: 'error', message: error.message });
    } finally {
      clearTimeout(timer); clearInterval(heartbeat);
      if (name) {
        await run(['rm', '-f', name]).catch(() => {});
        // Keep auth, remove this invocation's conversation from the engine volume.
        await run(['run', '--rm', '--network', 'none', '--user', `${config.uid}:${config.uid}`, '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--mount', `type=volume,src=${config.authVolume},dst=/home/engine/.local/share/opencode`, config.image, 'cleanup-session', `ses_${name.slice('lighthouse-engine-'.length)}`]).catch(() => {});
      }
      if (dir) await rm(dir, { recursive: true, force: true });
      finished = true; active = false; cancelActive = () => {}; res.end();
    }
  });
  server.requestTimeout = 30000;
  await new Promise((ok, no) => { server.once('error', no); server.listen(config.socket, ok); });
  await chmod(config.socket, 0o660);
  server.cancelActive = () => cancelActive();
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const server = await serve(config); console.log('Executor ready');
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {
    server.cancelActive();
    server.close(async () => { await rm(config.socket, { force: true }); process.exit(0); });
    setTimeout(() => process.exit(1), 35000).unref();
  });
}
