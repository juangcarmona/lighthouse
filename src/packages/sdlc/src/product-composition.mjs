import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { PRODUCT_FILE_LIMITS, validateProductChangeFiles } from './product-change.mjs';
import { validateStageEnvelope } from './host-contract.mjs';
import { PRODUCT_ENVELOPE_BYTES } from './engine-result-limits.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
const hex = /^[a-f0-9]{64}$/;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function exact(value, keys, name) {
  if (!record(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw Error(`Invalid ${name} fields`);
}
function text(value) {
  if (typeof value !== 'string' || value.includes('\0') || Buffer.from(value, 'utf8').toString('utf8') !== value) throw Error('Retained content must be regular UTF-8 text');
  return value;
}

export function parseCompositionJson(raw) {
  const value = JSON.parse(raw), stack = [];
  // JSON.parse defines syntax; this token pass additionally refuses duplicate keys and deep nesting.
  for (const match of raw.matchAll(/"(?:[^"\\]|\\[\s\S])*"|[{}\[\]:,]/g)) {
    const token = match[0], frame = stack.at(-1);
    if (token === '{' || token === '[') {
      if (stack.length >= 64) throw Error('Composition JSON nesting exceeds bounds');
      stack.push({ object: token === '{', key: token === '{', keys: new Set() });
    } else if (token === '}' || token === ']') stack.pop();
    else if (token === ',' && frame?.object) frame.key = true;
    else if (token === ':' && frame?.object) frame.key = false;
    else if (token.startsWith('"') && frame?.object && frame.key) {
      const key = JSON.parse(token);
      if (frame.keys.has(key)) throw Error('Duplicate composition JSON key');
      frame.keys.add(key); frame.key = false;
    }
  }
  return value;
}

export function compositionBinding(context) {
  const request = context?.request, product = context?.productChange;
  if (request?.worker !== 'product-change' || !['triage', 'refine', 'propose', 'implement'].includes(request.stage) || !hex.test(request.runId ?? '') || !hex.test(request.taskDigest ?? '') || !/^[a-f0-9]{40}$/.test(request.sourceRevision ?? '') || !hex.test(request.baselineDigest ?? '') || request.baselineDigest !== product?.baselineDigest || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product?.changeName ?? '') || typeof product?.schemaPin !== 'string' || !/^schema: product-change$/m.test(product.schemaPin)) throw Error('Unsupported Product Change composition context or binding');
  return { runId: request.runId, taskDigest: request.taskDigest, sourceRevision: request.sourceRevision, baselineDigest: request.baselineDigest, changeName: product.changeName, schemaPinSha256: hash(product.schemaPin) };
}

function artifactId(file) {
  if (!file.path.includes('/product-change/proposed/')) return null;
  let id;
  if (file.path.endsWith('.json')) {
    id = parseCompositionJson(file.content).id;
  } else {
    const body = file.path.endsWith('.md') ? file.content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1] : file.content;
    const matches = [...(body ?? '').matchAll(/^id:\s*([A-Z][A-Z0-9-]*)\s*$/gm)];
    if (matches.length !== 1 || [...(body ?? '').matchAll(/^id\s*:/gm)].length !== 1) throw Error('Retained provider artifact needs one unambiguous plain ID');
    id = matches[0][1];
  }
  if (typeof id !== 'string' || !/^[A-Z][A-Z0-9-]*$/.test(id)) throw Error('Invalid retained provider artifact ID');
  return id;
}

// Only these admitted structured/text fields are inspected. No reference is a filesystem path.
function documents(context, binding) {
  const result = [];
  if (context.productChange.files !== undefined) {
    validateProductChangeFiles(context.productChange.files, { changeName: binding.changeName });
    result.push({ source: 'productChange.files', revision: 0, files: context.productChange.files.map(file => ({ ...file, sha256: hash(file.content) })) });
  }
  const inputs = [{ source: 'issue.body', body: context.issue?.body }];
  if (Array.isArray(context.issue?.ownerAnswers)) {
    if (context.issue.ownerAnswers.length > 100) throw Error('Retained answer inventory exceeds bounds');
    context.issue.ownerAnswers.forEach((answer, i) => inputs.push({ source: `issue.ownerAnswers[${i}].body`, body: answer.body }));
  }
  let inputBytes = 0;
  const { runId: _runId, taskDigest: _taskDigest, ...draftBinding } = binding;
  for (const input of inputs) {
    if (input.body === undefined || input.body === null) continue;
    if (typeof input.body !== 'string' || (inputBytes += Buffer.byteLength(input.body)) > 2 * 1024 * 1024) throw Error('Retained input text exceeds bounds');
    const blocks = [...input.body.matchAll(/^```json[ \t]*\r?\n([\s\S]*?)^```[ \t]*\r?$/gm)];
    const outside = input.body.replace(/^```json[ \t]*\r?\n([\s\S]*?)^```[ \t]*\r?$/gm, '');
    if (/"kind"\s*:\s*"lighthouse-retained-product-draft\//.test(outside)) throw Error('Malformed or unfenced retained draft declaration');
    for (let i = 0; i < blocks.length; i++) {
      const raw = blocks[i][1];
      // Unrelated JSON is not a retained-input declaration. A malformed declaration fails closed.
      if (!raw.includes('lighthouse-retained-product-draft/')) continue;
      const draft = parseCompositionJson(raw);
      exact(draft, ['kind', 'revision', 'binding', 'files'], 'retained draft');
      if (draft.kind !== 'lighthouse-retained-product-draft/v1' || !Number.isSafeInteger(draft.revision) || draft.revision < 1 || !isDeepStrictEqual(draft.binding, draftBinding)) throw Error('Unsupported or stale retained draft binding');
      result.push({ source: `${input.source}#json-${i}`, revision: draft.revision, files: draft.files });
    }
  }
  if (!result.length) throw Error('No supported retained Product Change inputs; use literal drafting or supply a bound retained draft');
  if (result.length > 8) throw Error('Retained document inventory exceeds bounds');
  return result;
}

function inventory(context) {
  const binding = compositionBinding(context), paths = new Map(), unique = new Set();
  let bytes = 0, count = 0, references = 0, duplicateBytes = 0;
  for (const document of documents(context, binding)) {
    if (!Array.isArray(document.files) || !document.files.length || document.files.length > PRODUCT_FILE_LIMITS.files) throw Error('Retained file inventory exceeds bounds');
    const seen = new Set();
    for (const file of document.files) {
      exact(file, ['path', 'content', 'sha256', ...(Object.hasOwn(file ?? {}, 'mode') ? ['mode'] : [])], 'retained file');
      text(file.content);
      if (!hex.test(file.sha256 ?? '') || hash(file.content) !== file.sha256) throw Error('Missing or changed retained content hash');
      // Reuse the complete candidate validator for every path/type/mode, even omitted objects.
      const prefix = `openspec/changes/${binding.changeName}/`;
      const scaffolding = [
        { path: `${prefix}.openspec.yaml`, content: context.productChange.schemaPin },
        { path: `${prefix}product-change/change.md`, content: '---\nid: CHG-COMPOSITION-CHECK\nstatus: draft\n---\n' },
        { path: `${prefix}product-change/proposed/composition-check.md`, content: 'Text' },
      ];
      const candidateFile = { path: file.path, content: file.content, ...(file.mode !== undefined ? { mode: file.mode } : {}) };
      validateProductChangeFiles([...scaffolding.filter(item => item.path !== file.path), candidateFile], { changeName: binding.changeName });
      if (seen.has(file.path)) throw Error('Duplicate retained path');
      seen.add(file.path);
      const size = Buffer.byteLength(file.content);
      if (++references > 512) throw Error('Retained reference inventory exceeds bounds');
      const identity = JSON.stringify([file.path, file.sha256, file.mode ?? '100644']);
      if (!unique.has(identity)) {
        unique.add(identity);
        if (++count > 128 || (bytes += size) > PRODUCT_FILE_LIMITS.totalBytes) throw Error('Retained aggregate inventory exceeds bounds');
      } else duplicateBytes += size;
      const objects = paths.get(file.path) ?? [];
      if (objects.some(item => item.revision === document.revision)) throw Error('Ambiguous retained path revision');
      objects.push({ ref: { source: document.source, sha256: file.sha256 }, revision: document.revision, bytes: size, id: artifactId(candidateFile), file: candidateFile });
      paths.set(file.path, objects);
    }
  }
  return { binding, paths, count, bytes, references, duplicateBytes };
}

export function retainedInventory(context, reference) {
  const data = inventory(context);
  if (reference !== undefined) {
    exact(reference, ['path', 'source', 'sha256'], 'inspection reference');
    const item = data.paths.get(reference.path)?.find(item => item.ref.source === reference.source && item.ref.sha256 === reference.sha256);
    if (!item) throw Error('Unknown retained object reference');
    return { ...item.file, sha256: item.ref.sha256, source: item.ref.source, revision: item.revision };
  }
  return { binding: data.binding, measured: { objects: data.count, paths: data.paths.size, bytes: data.bytes }, paths: [...data.paths].map(([path, objects]) => ({ path, objects: objects.map(({ file: _file, ...item }) => item) })) };
}

export function currentRetainedInventory(context) {
  const data = inventory(context);
  return {
    binding: data.binding,
    measured: { objects: data.count, paths: data.paths.size, bytes: data.bytes, references: data.references, duplicateBytes: data.duplicateBytes },
    paths: [...data.paths].map(([path, objects]) => {
      const current = objects.reduce((a, b) => a.revision > b.revision ? a : b);
      const describe = ({ file: _file, ...item }) => item;
      return { path, current: describe(current), history: objects.filter(item => item !== current).map(describe) };
    }),
  };
}

export function composeRetainedProduct(context, args) {
  exact(args, ['binding', 'plan', 'envelope'], 'composition');
  const data = inventory(context);
  if (!isDeepStrictEqual(args.binding, data.binding)) throw Error('Stale composition request/source/baseline/schema binding');
  if (!Array.isArray(args.plan) || args.plan.length !== data.paths.size) throw Error('Incomplete composition path plan');
  const files = [], seen = new Set(), ids = new Set();
  for (const selection of args.plan) {
    exact(selection, ['path', 'selected', 'omitted'], 'path selection');
    const objects = data.paths.get(selection.path);
    if (!objects || seen.has(selection.path) || !Array.isArray(selection.omitted)) throw Error('Unknown or duplicate composition path');
    seen.add(selection.path);
    const refs = [...selection.omitted, ...(selection.selected === null ? [] : [selection.selected])];
    if (refs.length !== objects.length) throw Error('Every retained object must be selected or explicitly omitted');
    const acknowledged = new Set();
    for (const ref of refs) {
      exact(ref, ['source', 'sha256'], 'object reference');
      const item = objects.find(item => isDeepStrictEqual(item.ref, ref));
      if (!item || acknowledged.has(item)) throw Error('Unknown, changed or duplicate retained reference');
      acknowledged.add(item);
    }
    if (selection.selected !== null) {
      const selected = objects.find(item => isDeepStrictEqual(item.ref, selection.selected));
      if (selected.revision !== Math.max(...objects.map(item => item.revision))) throw Error('Stale replacement: select the latest retained revision');
      if (selected.id && ids.has(selected.id)) throw Error('Duplicate retained artifact ID');
      if (selected.id) ids.add(selected.id);
      files.push(selected.file);
    }
  }
  const summary = validateProductChangeFiles(files, { changeName: data.binding.changeName });
  if (files.find(file => file.path.endsWith('/.openspec.yaml')).content !== context.productChange.schemaPin) throw Error('Retained schema pin differs from the current host pin');
  const envelope = structuredClone(args.envelope), product = envelope?.result?.output?.productChange;
  if (!record(product) || Object.hasOwn(product, 'files') || Object.hasOwn(product, 'proposalDigest') || product.outcome !== 'candidate' || product.changeName !== data.binding.changeName || product.changeId !== summary.changeId || product.baselineDigest !== data.binding.baselineDigest || !isDeepStrictEqual(product.providerValidation, { status: 'pending', diagnosticCount: 0 })) throw Error('Composition needs candidate metadata with pending host validation and no literal files or supplied digest');
  product.files = files;
  const errors = validateStageEnvelope(envelope, context.request);
  if (errors.length) throw Error(`Invalid composed envelope: ${errors.join('; ')}`);
  if (Buffer.byteLength(JSON.stringify(envelope)) > PRODUCT_ENVELOPE_BYTES) throw Error('Composed envelope exceeds the existing artifact member bound');
  return { envelope, summary: { ...summary, providerValidation: 'pending' } };
}
