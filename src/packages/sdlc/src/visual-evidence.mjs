import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open, lstat, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validatePublishable } from './process-publication.mjs';

export const visualStages = new Set(['refine', 'propose', 'implement']);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim() && value.length <= 500;
const exact = (value, allowed) => record(value) && Object.keys(value).every(key => allowed.includes(key));
const relative = path => typeof path === 'string' && path.length <= 180 && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*\.png$/.test(path) && path.split('/').every(part => part && !['.', '..', '.git'].includes(part));

export function validateVisualEvidence(value, request) {
  if (value === undefined && !request.visualEvidence) return [];
  const errors = [];
  if (!exact(value, ['schemaVersion', 'status', 'reason', 'items']) || value.schemaVersion !== 1 || !['provided', 'unavailable', 'not-applicable'].includes(value.status) || !text(value.reason) || !Array.isArray(value.items) || value.items.length > 6) return ['Invalid visual evidence assessment'];
  if (value.status !== 'provided' && value.items.length || value.status === 'provided' && !value.items.length) errors.push('Visual evidence status and items disagree');
  const ids = new Set();
  for (const item of value.items) {
    if (!exact(item, ['id', 'kind', 'view', 'state', 'viewport', 'path', 'html', 'revision', 'baseline', 'baselineReason']) || !/^[a-z][a-z0-9-]{0,47}$/.test(item.id ?? '') || ids.has(item.id) || !['proposal', 'before', 'candidate'].includes(item.kind) || !text(item.view) || !text(item.state) || !exact(item.viewport, ['width', 'height']) || ![item.viewport.width, item.viewport.height].every(n => Number.isSafeInteger(n) && n >= 240 && n <= 2560)) {
      errors.push('Invalid visual evidence item, identity or viewport'); continue;
    }
    ids.add(item.id);
    if (item.html !== undefined) {
      if (item.kind !== 'proposal' || item.path !== undefined || typeof item.html !== 'string' || !item.html.trim() || Buffer.byteLength(item.html) > 16000) errors.push('Only a bounded proposed design can use inline HTML');
    } else if (!relative(item.path)) errors.push('Visual captures need a safe relative PNG path');
    if (item.kind === 'candidate' && request.stage !== 'implement') errors.push('Only implementation can produce candidate captures');
    if (item.kind === 'before' && item.revision !== request.sourceRevision || item.kind !== 'before' && item.revision !== undefined) errors.push('Before captures must name the admitted source revision; candidate identity belongs to the host');
    if (item.kind === 'candidate') {
      if (!['existing', 'new'].includes(item.baseline) || item.baseline === 'new' && !text(item.baselineReason)) errors.push('Candidate captures need an existing baseline or a reason for a new view');
      if (item.baseline === 'existing' && !value.items.some(before => before?.kind === 'before' && before.view === item.view && before.state === item.state && before.viewport?.width === item.viewport.width && before.viewport?.height === item.viewport.height)) errors.push('An existing view needs a matching before capture');
    } else if (item.baseline !== undefined || item.baselineReason !== undefined) errors.push('Only candidate captures can declare a baseline');
  }
  if (request.stage === 'implement' && value.status === 'provided' && !value.items.some(item => item?.kind === 'candidate')) errors.push('Visual implementation needs actual candidate captures');
  if (['refine', 'propose'].includes(request.stage) && value.status === 'provided' && !value.items.some(item => item?.kind === 'proposal')) errors.push('Visual planning needs a concrete proposed example');
  try { validatePublishable({ 'visual-assessment.json': JSON.stringify(value) }); } catch (error) { errors.push(error.message); }
  return errors;
}

export function validatePng(bytes, viewport) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 33 || bytes.length > 2 * 1024 * 1024 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.readUInt32BE(16) !== viewport.width || bytes.readUInt32BE(20) !== viewport.height) throw Error('Visual evidence must be a bounded PNG matching its viewport');
  return bytes;
}

export async function readVisualFile(root, path, maximum = 2 * 1024 * 1024) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path) || path.split('/').some(part => !part || ['.', '..', '.git'].includes(part))) throw Error('Unsafe visual evidence path');
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw Error('Unsafe visual evidence root');
  let parent = root;
  for (const part of path.split('/').slice(0, -1)) {
    parent = join(parent, part);
    const stat = await lstat(parent);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Unsafe visual evidence directory');
  }
  const file = await open(join(root, path), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > maximum) throw Error('Visual evidence file exceeds bounds or is not regular');
    const bytes = await file.readFile();
    if (bytes.length !== stat.size) throw Error('Visual evidence changed during collection');
    return bytes;
  } finally { await file.close(); }
}

export async function retainVisualEvidence(request, envelope, output, runDir, { render, candidateTree = null } = {}) {
  const value = envelope.result.output?.visualEvidence;
  if (!visualStages.has(request.stage) || request.worker === 'product-change' || value === undefined && !request.visualEvidence) return;
  const errors = validateVisualEvidence(value, request);
  if (errors.length) throw Error(errors.join('\n'));
  const items = [];
  await mkdir(join(runDir, 'evidence', 'visual'), { recursive: true });
  for (const item of value.items) {
    const bytes = validatePng(item.html === undefined ? await readVisualFile(output, item.path) : await render(item), item.viewport);
    const digest = sha256(bytes), path = `evidence/visual/${digest}.png`;
    await writeFile(join(runDir, path), bytes, { mode: 0o600 });
    const { html, path: originalPath, ...metadata } = item;
    items.push({ ...metadata, path, sha256: digest, bytes: bytes.length, producer: html === undefined ? 'agent-declared capture' : 'isolated proposed-design renderer', ...(html === undefined ? {} : { htmlSha256: sha256(html) }) });
  }
  const receipt = { schemaVersion: 1, repository: request.repository, issue: request.issue, runId: request.runId, workflowRunId: String(request.workflowRunId), attempt: Number(request.attempt), stage: request.stage, sourceRevision: request.sourceRevision, candidateTree, assessmentSha256: sha256(JSON.stringify(value)), status: value.status, reason: value.reason, items };
  await writeFile(join(runDir, 'visual-evidence.json'), JSON.stringify(receipt));
  return receipt;
}
