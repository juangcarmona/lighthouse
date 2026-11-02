import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { createInterface } from 'node:readline';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { codegraphCall, codegraphTools } from './codegraph-mcp.mjs';

const socket = '/codegraph/codegraph.sock';
const allowed = new Set(codegraphTools);
mkdirSync('/tmp/codegraph-home', { recursive: true });
const backend = spawn('/codegraph-server', ['--mcp', '--graph-only', '--profile', 'core', '--workspace', '/workspace'], {
  env: { HOME: '/tmp/codegraph-home', PATH: '/usr/bin:/bin' }, stdio: ['pipe', 'pipe', 'ignore'],
});
const pending = new Map();
let sequence = 0;
createInterface({ input: backend.stdout }).on('line', line => {
  try { const response = JSON.parse(line); pending.get(response.id)?.(response); pending.delete(response.id); } catch {}
});
function call(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(Error('CodeGraph timed out')); }, 30000);
    pending.set(id, response => { clearTimeout(timeout); resolve(response); });
    backend.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}
const initialized = await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'lighthouse', version: '1' } });
if (!initialized.result) throw Error('CodeGraph initialization failed');
backend.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');
const probe = await call('tools/call', { name: 'codegraph_symbol_search', arguments: { query: 'a', limit: 1, compact: true } });
if (probe.result?.isError || !probe.result?.content?.[0]?.text) throw Error('CodeGraph indexing failed');
const list = await call('tools/list', {});
const tools = list.result?.tools?.filter(tool => allowed.has(tool.name)) ?? [];
if (tools.length !== 2 || !existsSync('/tmp/codegraph-home/.codegraph/projects')) throw Error('CodeGraph index or tools unavailable');

const server = createServer(peer => {
  const lines = createInterface({ input: peer });
  lines.on('line', async line => {
    let request;
    try {
      if (Buffer.byteLength(line) > 16384) throw Error('Request exceeds bound');
      request = JSON.parse(line);
      if (request.method === 'notifications/initialized') return;
      let result;
      if (request.method === 'initialize') result = initialized.result;
      else if (request.method === 'tools/list') result = { tools };
      else if (request.method === 'tools/call' && allowed.has(request.params?.name)) {
        const response = await call('tools/call', codegraphCall(request.params));
        if (response.error || response.result?.isError) throw Error('CodeGraph query unavailable');
        result = response.result;
        if (Buffer.byteLength(JSON.stringify(result)) > 65536) throw Error('CodeGraph result exceeds bound');
      } else throw Error('MCP method denied');
      peer.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }) + '\n');
    } catch (error) {
      peer.write(JSON.stringify({ jsonrpc: '2.0', id: request?.id ?? null, error: { code: -32602, message: error.message } }) + '\n');
    }
  });
});
server.listen(socket, () => {
  chmodSync(socket, 0o666);
  writeFileSync('/codegraph/ready.json', JSON.stringify({ status: 'available', tools: [...allowed] }));
});
backend.on('exit', () => process.exit(1));
