import { constants } from 'node:fs';
import { open, lstat, rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { StringDecoder } from 'node:string_decoder';
import { retainedInventory, composeRetainedProduct, parseCompositionJson } from './product-composition.mjs';
import { inspectRetainedAnswer } from './product-context.mjs';

const referenceSchema = { type: 'object', additionalProperties: false, required: ['source', 'sha256'], properties: { source: { type: 'string' }, sha256: { type: 'string' } } };
export const compositionTools = [
  { name: 'inspect', description: 'Inspect admitted retained Product Change objects and current binding. No arguments returns the measured catalog; reference returns one exact inert document. Exclusive history retrieves an indexed original answer in at most 1024 UTF-8 bytes, bound to the raw audit digest, current binding and whole-answer source/hash/bytes. Follow nextOffset and verify the reconstructed whole answer before reviewing its decisions. No approval or execution authority.', inputSchema: { type: 'object', additionalProperties: false, properties: {
    reference: { ...referenceSchema, required: ['path', 'source', 'sha256'], properties: { ...referenceSchema.properties, path: { type: 'string' } } },
    history: { type: 'object', additionalProperties: false, required: ['binding', 'auditSha256', 'answer', 'offset', 'limit'], properties: {
      binding: { type: 'object' }, auditSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
      answer: { ...referenceSchema, required: ['source', 'sha256', 'bytes'], properties: { ...referenceSchema.properties, bytes: { type: 'integer', minimum: 0 } } },
      offset: { type: 'integer', minimum: 0 }, limit: { type: 'integer', minimum: 1, maximum: 1024 },
    } },
  }, not: { required: ['reference', 'history'] } } },
  { name: 'compose', description: 'Compose explicit latest-per-path retained selections into /output/envelope.json atomically. Requires exhaustive selections/omissions, current binding, and a caller-authored candidate envelope without files or digest, with provider validation pending. Returns measured counts, bytes and digest; never runs provider validation or approval.', inputSchema: { type: 'object', additionalProperties: false, required: ['binding', 'plan', 'envelope'], properties: { binding: { type: 'object' }, envelope: { type: 'object' }, plan: { type: 'array', maxItems: 128, items: { type: 'object', additionalProperties: false, required: ['path', 'selected', 'omitted'], properties: { path: { type: 'string' }, selected: { anyOf: [referenceSchema, { type: 'null' }] }, omitted: { type: 'array', maxItems: 128, items: referenceSchema } } } } } } },
];

async function safeRegular(path, maxBytes) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maxBytes) throw Error('Composition input is not a bounded regular file');
    const raw = await file.readFile('utf8');
    if (Buffer.byteLength(raw) > maxBytes) throw Error('Composition input exceeds bounds');
    return raw;
  } finally { await file.close(); }
}

// These paths are host-owned constructor parameters, never tool-call arguments.
export function compositionService(contextFile = '/input/context.json', outputDirectory = '/output') {
  let busy = false;
  return async (name, args = {}) => {
    if (busy) throw Error('Composition already active');
    busy = true;
    try {
      if (!compositionTools.some(tool => tool.name === name)) throw Error('Unsupported composition capability');
      const raw = await safeRegular(contextFile, 4 * 1024 * 1024);
      const context = parseCompositionJson(raw);
      if (name === 'inspect') {
        if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some(key => !['reference', 'history'].includes(key)) || (Object.hasOwn(args, 'reference') && Object.hasOwn(args, 'history'))) throw Error('Unsupported inspection arguments');
        if (Object.hasOwn(args, 'history')) return inspectRetainedAnswer(context, createHash('sha256').update(raw).digest('hex'), args.history);
        if (Object.hasOwn(args, 'reference') && args.reference === undefined) throw Error('Invalid inspection reference');
        return retainedInventory(context, args.reference);
      }
      const candidate = composeRetainedProduct(context, args);
      const directory = await lstat(outputDirectory);
      if (!directory.isDirectory() || directory.isSymbolicLink()) throw Error('Unsafe composition output directory');
      const target = join(outputDirectory, 'envelope.json');
      try {
        const existing = await lstat(target);
        if (!existing.isFile() || existing.isSymbolicLink() || existing.nlink !== 1) throw Error('Unsafe existing composition output');
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const pending = join(outputDirectory, `.composition-${randomUUID()}.json`);
      let file;
      try {
        file = await open(pending, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o644);
        await file.writeFile(JSON.stringify(candidate.envelope)); await file.sync();
        await file.close(); file = null;
        await rename(pending, target);
      } finally {
        await file?.close();
        await unlink(pending).catch(error => { if (error.code !== 'ENOENT') throw error; });
      }
      return candidate.summary;
    } finally { busy = false; }
  };
}

export function compositionRpc(call) {
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const fields = (value, allowed) => record(value) && Object.keys(value).every(key => allowed.includes(key));
  const metadata = value => {
    if (!fields(value, ['progressToken', 'ai.opencode/sessionID']) || (Object.hasOwn(value, 'progressToken') && typeof value.progressToken !== 'string' && !(typeof value.progressToken === 'number' && Number.isFinite(value.progressToken))) || (Object.hasOwn(value, 'ai.opencode/sessionID') && typeof value['ai.opencode/sessionID'] !== 'string')) throw Error('Unsupported composition request metadata');
  };
  return async request => {
    let result;
    try {
      if (!fields(request, ['jsonrpc', 'id', 'method', 'params']) || request.jsonrpc !== '2.0' || typeof request.method !== 'string') throw Error('Invalid composition protocol');
      if (!Object.hasOwn(request, 'id')) {
        if (request.method !== 'notifications/initialized' || (request.params !== undefined && !fields(request.params, []))) throw Error('Unsupported composition notification');
        return null;
      }
      if (typeof request.id !== 'string' && !(typeof request.id === 'number' && Number.isFinite(request.id))) throw Error('Invalid composition request ID');
      if (request.params !== undefined && !record(request.params)) throw Error('Invalid composition method parameters');
      if (Object.hasOwn(request.params ?? {}, '_meta')) metadata(request.params._meta);
      if (request.method === 'initialize') {
        const params = request.params;
        if (!fields(params, ['protocolVersion', 'capabilities', 'clientInfo', '_meta']) || typeof params.protocolVersion !== 'string' || (params.capabilities !== undefined && !record(params.capabilities)) || (params.clientInfo !== undefined && !record(params.clientInfo))) throw Error('Unsupported composition initialization fields');
        const versions = ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'];
        result = { protocolVersion: versions.includes(params.protocolVersion) ? params.protocolVersion : versions[0], capabilities: { tools: {} }, serverInfo: { name: 'lighthouse-product-composition', version: '1.0.0' } };
      } else if (request.method === 'ping' || request.method === 'tools/list') {
        if (request.params !== undefined && !fields(request.params, ['_meta'])) throw Error('Unsupported composition discovery fields');
        result = request.method === 'ping' ? {} : { tools: compositionTools };
      }
      else if (request.method === 'tools/call') {
        if (!fields(request.params, ['name', 'arguments', '_meta']) || !['inspect', 'compose'].includes(request.params.name) || (Object.hasOwn(request.params, 'arguments') && !record(request.params.arguments))) throw Error('Unsupported composition call fields');
        const value = await call(request.params.name, request.params.arguments ?? {});
        result = { content: [{ type: 'text', text: JSON.stringify(value) }] };
      } else throw Error('Unsupported composition method');
      return { jsonrpc: '2.0', id: request.id, result };
    } catch (error) {
      // Do not echo input bodies, file paths from I/O errors or retained content into diagnostics.
      const message = error.code ? 'Composition I/O unavailable; preserve inputs and prior output and ask the workflow maintainer to inspect installation.' : error instanceof SyntaxError ? 'Malformed retained JSON input' : error.message;
      return { jsonrpc: '2.0', id: typeof request?.id === 'string' || (typeof request?.id === 'number' && Number.isFinite(request.id)) ? request.id : null, error: { code: -32602, message } };
    }
  };
}

export async function runCompositionServer(input = process.stdin, output = process.stdout, service = compositionService()) {
  const dispatch = compositionRpc(service);
  let buffer = '';
  const decoder = new StringDecoder('utf8');
  for await (const chunk of input) {
    buffer += typeof chunk === 'string' ? chunk : decoder.write(chunk);
    if (Buffer.byteLength(buffer) > 1024 * 1024) throw Error('Composition protocol message exceeds bounds');
    let end;
    while ((end = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      if (!line.trim()) continue;
      let response;
      try { response = await dispatch(parseCompositionJson(line)); }
      catch { response = { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Invalid composition protocol message' } }; }
      if (response) output.write(JSON.stringify(response) + '\n');
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { await runCompositionServer(process.stdin, process.stdout, compositionService('/workspace/.lighthouse-product-audit.json')); }
  catch { process.stderr.write('Product composition unavailable; preserve prior output and report a technical blocker.\n'); process.exitCode = 1; }
}
