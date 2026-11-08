import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, lstat, readlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const exact = (value, names) => value && !Array.isArray(value) && typeof value === 'object'
  && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const pathSafe = path => typeof path === 'string' && path.length < 300 && !/[\\\x00-\x1f\x7f]/.test(path)
  && !path.split('/').some(part => !part || ['.', '..', '.git'].includes(part));
const compare = (a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path));

export function validateSourceLinks(value, revision) {
  if (value === undefined) return;
  if (!sha(revision) || !exact(value, ['schemaVersion', 'sourceRevision', 'entries']) || value.schemaVersion !== 1 || value.sourceRevision !== revision
      || !Array.isArray(value.entries) || !value.entries.length || value.entries.length > 5000) throw Error('Invalid admitted source-link metadata');
  const seen = new Set();
  for (const entry of value.entries) {
    if (!exact(entry, ['path', 'mode', 'sha']) || !pathSafe(entry.path) || entry.mode !== '120000' || !sha(entry.sha) || seen.has(entry.path))
      throw Error('Invalid opaque source-link entry');
    seen.add(entry.path);
  }
  if (value.entries.some((entry, i) => i && compare(value.entries[i - 1], entry) >= 0
      || entry.path.split('/').slice(0, -1).some((_, n, parts) => seen.has(parts.slice(0, n + 1).join('/'))))) throw Error('Source-link metadata is not canonical');
}

export function sourceLinksFromTree(revision, tree) {
  if (!sha(revision) || tree?.truncated !== false || !Array.isArray(tree.tree) || tree.tree.length > 10000) throw Error('Admitted source-link inventory is incomplete');
  const seen = new Set(), entries = [];
  for (const entry of tree.tree) {
    if (!pathSafe(entry.path) || !sha(entry.sha) || seen.has(entry.path)) throw Error('Invalid admitted source tree');
    seen.add(entry.path);
    if (entry.type === 'tree' && entry.mode === '040000') continue;
    if (entry.type !== 'blob' || !['100644', '100755', '120000'].includes(entry.mode)) throw Error('Unsupported admitted source tree member');
    if (entry.mode === '120000') entries.push({ path: entry.path, mode: entry.mode, sha: entry.sha });
  }
  if (!entries.length) return undefined;
  const value = { schemaVersion: 1, sourceRevision: revision, entries: entries.sort(compare) };
  validateSourceLinks(value, revision); return value;
}

export function sourceLinksDigest(value, revision) {
  validateSourceLinks(value, revision);
  return value === undefined ? undefined : createHash('sha256').update(JSON.stringify({ schemaVersion: 1, sourceRevision: value.sourceRevision, entries: value.entries.map(({ path, mode, sha }) => ({ path, mode, sha })) })).digest('hex');
}

export async function committedSourceLinks(root, revision) {
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 30000, env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_COUNT: '0' } });
  if (!sha(revision) || git(['rev-parse', 'HEAD']).trim() !== revision) throw Error('Source-link checkout revision changed');
  const tree = git(['ls-tree', '-rz', '--full-tree', revision]).split('\0').filter(Boolean).map(row => {
    const match = /^(\d{6}) (\w+) ([a-f0-9]{40})\t(.+)$/s.exec(row);
    if (!match) throw Error('Unsupported admitted Git member');
    return { mode: match[1], type: match[2], sha: match[3], path: match[4] };
  });
  const value = sourceLinksFromTree(revision, { truncated: false, tree });
  for (const entry of value?.entries ?? []) {
    const parts = entry.path.split('/');
    for (let i = 1; i < parts.length; i++) if (!(await lstat(join(root, ...parts.slice(0, i)))).isDirectory()) throw Error('Admitted source-link ancestor changed');
    const target = join(root, entry.path);
    if (!(await lstat(target)).isSymbolicLink()) throw Error('Admitted source link changed');
    const bytes = await readlink(target, { encoding: 'buffer' });
    if (createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !== entry.sha) throw Error('Admitted source link changed');
  }
  return value;
}

export async function sourceLinksFromApi(api, revision) {
  if (!sha(revision)) throw Error('Invalid source-link revision');
  const commit = await api(`git/commits/${revision}`);
  if (commit.sha !== revision || !sha(commit.tree?.sha)) throw Error('Admitted source-link commit changed');
  return sourceLinksFromTree(revision, await api(`git/trees/${commit.tree.sha}?recursive=1`));
}

export async function checkedCandidateTree(workspace, value, revision) {
  validateSourceLinks(value, revision);
  const baseEnv = { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_COUNT: '0' };
  const git = (args, env = baseEnv, input) => execFileSync('git', ['-c', `safe.directory=${workspace}`, '-C', workspace, ...args], { env, input, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 30000 });
  if (value === undefined) return git(['rev-parse', 'HEAD^{tree}']).trim();
  const regular = git(['ls-tree', '-rz', '--name-only', 'HEAD']).split('\0').filter(Boolean);
  if (value.entries.some(entry => regular.some(path => path === entry.path || path.startsWith(entry.path + '/') || entry.path.startsWith(path + '/'))))
    throw Error('Opaque source-link metadata collides with checked source');
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-tree-index-'));
  try {
    const env = { ...baseEnv, GIT_INDEX_FILE: join(directory, 'index') };
    git(['read-tree', 'HEAD'], env);
    git(['update-index', '--add', '-z', '--index-info'], env, value.entries.map(entry => `120000 ${entry.sha}\t${entry.path}\0`).join(''));
    return git(['write-tree', '--missing-ok'], env).trim();
  } finally { await rm(directory, { recursive: true, force: true }); }
}
