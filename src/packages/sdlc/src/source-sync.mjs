import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const safePath = path => typeof path === 'string' && path.length < 300 && !/[\\\x00-\x1f\x7f]/.test(path) && !path.split('/').some(part => !part || ['.', '..', '.git'].includes(part));
const same = (a, b) => a?.sha === b?.sha && a?.mode === b?.mode;
const json = value => JSON.stringify(value);
const blobSha = content => createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex');
const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === expected;

function inventory(tree) {
  if (tree?.truncated !== false || !Array.isArray(tree.tree) || tree.tree.length > 10000) throw Error('Source synchronization needs a complete bounded Git tree');
  const files = new Map(), seen = new Set();
  for (const item of tree.tree) {
    if (!safePath(item.path) || seen.has(item.path) || !sha(item.sha)) throw Error('Unsafe source synchronization tree');
    seen.add(item.path);
    if (item.type === 'tree' && item.mode === '040000') continue;
    if (item.type !== 'blob' || !['100644', '100755'].includes(item.mode) || !Number.isSafeInteger(item.size) || item.size < 0 || item.size > 4 * 1024 * 1024) throw Error('Unsupported source synchronization entry');
    files.set(item.path, { sha: item.sha, mode: item.mode, size: item.size });
  }
  return files;
}

function overlay(source, base, ancestor) {
  const files = []; let bytes = 0;
  for (const path of [...new Set([...source.keys(), ...base.keys(), ...ancestor.keys()])].sort()) {
    const current = source.get(path), next = base.get(path), old = ancestor.get(path);
    if (same(current, next) || same(next, old)) continue;
    if (!same(current, old)) throw Error(`Conflicting source synchronization: ${path}`);
    files.push({ path, sha: next?.sha ?? null, mode: next?.mode ?? current.mode, size: next?.size ?? 0, before: current ? { sha: current.sha, mode: current.mode } : null });
    bytes += next?.size ?? 0;
  }
  if (files.length > 512 || bytes > 16 * 1024 * 1024) throw Error('Source synchronization exceeds bounds');
  return files;
}

export function validateSourceSynchronization(value) {
  if (!keys(value, 'ancestor,base,baseTree,files,schemaVersion,source,sourceTree') || value.schemaVersion !== 1 || !['source', 'base', 'ancestor', 'sourceTree', 'baseTree'].every(key => sha(value[key])) || value.source === value.base || !Array.isArray(value.files) || value.files.length > 512) throw Error('Invalid source synchronization');
  let previous = '', bytes = 0;
  for (const file of value.files) {
    if (!keys(file, 'before,mode,path,sha,size') || !safePath(file.path) || file.path <= previous || !['100644', '100755'].includes(file.mode) || file.sha !== null && !sha(file.sha) || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > 4 * 1024 * 1024 || file.sha === null && file.size !== 0 || file.before !== null && (!keys(file.before, 'mode,sha') || !sha(file.before.sha) || !['100644', '100755'].includes(file.before.mode)) || file.sha === null && file.before === null) throw Error('Invalid source synchronization file');
    previous = file.path; bytes += file.size;
  }
  if (bytes > 16 * 1024 * 1024 || Buffer.byteLength(json(value)) > 48000) throw Error('Source synchronization exceeds byte bounds');
  return value;
}

export const synchronizationDigest = value => value === undefined ? undefined : createHash('sha256').update(json(validateSourceSynchronization(value))).digest('hex');

export async function prepareSourceSynchronization(api, source, base) {
  if (!sha(source) || !sha(base)) throw Error('Invalid source synchronization revisions');
  if (source === base) return null;
  const comparison = await api(`compare/${base}...${source}`);
  if (comparison.base_commit?.sha !== base || !Number.isSafeInteger(comparison.behind_by) || comparison.behind_by < 0 || !sha(comparison.merge_base_commit?.sha)) throw Error('Source synchronization ancestry is unavailable');
  if (!comparison.behind_by) return null;
  const ancestor = comparison.merge_base_commit.sha;
  const commits = await Promise.all([source, base, ancestor].map(async ref => {
    const commit = await api(`git/commits/${ref}`);
    if (commit.sha !== ref || !sha(commit.tree?.sha)) throw Error('Source synchronization commit identity changed');
    return commit;
  }));
  const trees = await Promise.all(commits.map(async commit => inventory(await api(`git/trees/${commit.tree.sha}?recursive=1`))));
  return validateSourceSynchronization({ schemaVersion: 1, source, base, ancestor, sourceTree: commits[0].tree.sha, baseTree: commits[1].tree.sha, files: overlay(...trees) });
}

// Only the trusted host reads immutable Git objects; the model receives no Git credentials.
export function synchronizedSource(root, baseline, value) {
  validateSourceSynchronization(value);
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { maxBuffer: 32 * 1024 * 1024, timeout: 30000 });
  const ref = (...args) => git(...args).toString('utf8').trim();
  if (ref('rev-parse', 'HEAD') !== value.source || ref('rev-parse', `${value.source}^{tree}`) !== value.sourceTree || ref('rev-parse', `${value.base}^{tree}`) !== value.baseTree || ref('merge-base', value.source, value.base) !== value.ancestor) throw Error('Local synchronization authority changed');
  const tree = revision => inventory({ truncated: false, tree: git('ls-tree', '-rz', '--long', revision).toString('utf8').split('\0').filter(Boolean).map(row => {
    const match = /^(\d{6}) (\w+) ([a-f0-9]{40}) +([0-9]+)\t([\s\S]+)$/.exec(row);
    if (!match) throw Error('Unsupported local Git entry');
    return { mode: match[1], type: match[2], sha: match[3], size: Number(match[4]), path: match[5] };
  }) });
  const original = tree(value.source), base = tree(value.base), ancestor = tree(value.ancestor);
  if (json(overlay(original, base, ancestor)) !== json(value.files) || baseline.size !== original.size || [...baseline].some(([path, file]) => !original.has(path) || blobSha(file.content) !== original.get(path).sha || file.mode !== original.get(path).mode)) throw Error('Local synchronization source or manifest changed');
  const result = new Map(baseline);
  for (const file of value.files) {
    if (file.sha === null) result.delete(file.path);
    else {
      const content = git('cat-file', 'blob', file.sha);
      if (content.length !== file.size || blobSha(content) !== file.sha) throw Error('Synchronization blob integrity mismatch');
      result.set(file.path, { content, mode: file.mode });
    }
  }
  return result;
}
