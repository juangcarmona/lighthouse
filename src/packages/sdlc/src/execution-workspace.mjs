// Host-side only. Never infer disposable ownership from a directory name alone.
import { mkdir, lstat, realpath, readFile, writeFile, rename, rm, readdir, open } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const maxBundles = 32, maxBytes = 512 * 1024 * 1024;
const identity = stat => ({ dev: stat.dev, ino: stat.ino });
const matches = (stat, expected) => stat.isDirectory() && !stat.isSymbolicLink() && stat.dev === expected.dev && stat.ino === expected.ino;
async function sync(path) {
  const fd = await open(path, 'r');
  try { await fd.sync(); } finally { await fd.close(); }
}
async function seal(root) {
  const files = []; let bytes = 0;
  async function visit(path, relative = '') {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isFile() && !stat.isDirectory()) throw Error('Unsafe retained workspace evidence');
    if (stat.isDirectory()) {
      for (const name of (await readdir(path)).sort()) await visit(join(path, name), join(relative, name));
    } else {
      bytes += stat.size;
      if (bytes > 90 * 1024 * 1024 || files.length >= 202) throw Error('Retained workspace evidence exceeds bounds');
      files.push([relative, hash(await readFile(path))]);
    }
    await sync(path);
  }
  await visit(root);
  return hash(JSON.stringify(files));
}
async function size(path) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink() || !stat.isDirectory() && !stat.isFile()) throw Error('Unsafe local recovery storage');
  if (stat.isFile()) return stat.size;
  let bytes = 0;
  for (const name of await readdir(path)) bytes += await size(join(path, name));
  return bytes;
}
export async function checkRetentionCapacity(directory, additionalBytes = 0, additionalBundles = 1) {
  const root = join(directory, 'retained');
  await mkdir(root, { recursive: true, mode: 0o700 });
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Unsafe local recovery storage');
  const entries = await readdir(root);
  if (entries.length + additionalBundles > maxBundles || await size(root) + additionalBytes > maxBytes) throw Error('Local recovery retention limit reached; operator must archive and explicitly release retained bundles before admission');
}
export async function allocateWorkspace(record, parent, persist, directory) {
  await checkRetentionCapacity(directory);
  if (record.workspace) throw Error('Workspace ownership already allocated');
  const root = await realpath(parent);
  if (resolve(parent) !== root) throw Error('Workspace parent must be canonical');
  const path = join(root, `lighthouse-engine-${record.key}`);
  record.workspace = { path, parent: identity(await lstat(root)), status: 'allocating' };
  persist(); // Intent before allocation; a lost acknowledgement remains unknown.
  await mkdir(path, { mode: 0o755 });
  await sync(root);
  record.workspace.root = identity(await lstat(path));
  record.workspace.status = 'allocated'; persist();
  return path;
}
async function verify(record) {
  const workspace = record.workspace;
  if (!workspace || !workspace.root || !workspace.parent || !workspace.path || workspace.path !== join(dirname(workspace.path), `lighthouse-engine-${record.key}`) || !workspace.path.startsWith('/')) throw Error('Workspace ownership is unknown; operator reconciliation required');
  if (!matches(await lstat(dirname(workspace.path)), workspace.parent)) throw Error('Workspace parent identity changed');
  if (!matches(await lstat(workspace.path), workspace.root)) throw Error('Workspace filesystem identity changed; preserve substituted path');
  return workspace;
}
export async function checkpointWorkspace(record, baseline, tracked, policy, persist) {
  const workspace = await verify(record);
  const content = JSON.stringify({ baseline: baseline ? [...baseline].map(([path, file]) => [path, { ...file, content: file.content.toString('base64') }]) : null, tracked: tracked ? [...tracked.keys()] : null, policy });
  if (Buffer.byteLength(content) > 90 * 1024 * 1024) throw Error('Workspace recovery baseline exceeds bounds');
  await writeFile(join(workspace.path, 'recovery.json'), content, { mode: 0o600 });
  await sync(join(workspace.path, 'recovery.json')); await sync(workspace.path);
  workspace.checkpoint = hash(content); persist();
}
export async function disposeWorkspace(record, persist, directory, { remove = rm } = {}) {
  if (!record.workspace) return { status: 'not-applicable' };
  const workspace = record.workspace;
  if (record.cleanup?.status !== 'clean') throw Error('Owned runtime cleanup must be clean before workspace disposal');
  try {
    if (workspace.status === 'retaining') {
      await verify(record);
      const staging = join(directory, 'retained', `${record.key}.pending`);
      const destination = join(directory, 'retained', record.key);
      const committed = await lstat(destination).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
      if (await seal(committed ? destination : staging) !== workspace.retentionDigest) throw Error('Retained workspace evidence changed; preserve source');
      if (!committed) { await rename(staging, destination); await sync(dirname(destination)); }
      workspace.status = 'retained'; persist();
    }
    // A committed retention bundle makes an interrupted remove retryable without recollecting a partial tree.
    if (workspace.status === 'retained') {
      if (workspace.retained !== join(directory, 'retained', record.key) || await seal(workspace.retained) !== workspace.retentionDigest) throw Error('Retained workspace evidence changed; preserve source');
      try { await verify(record); } catch (error) {
        if (error.code !== 'ENOENT' || await lstat(workspace.path).then(() => true, e => { if (e.code === 'ENOENT') return false; throw e; })) throw error;
        workspace.status = 'clean'; persist(); return { status: 'clean', retained: workspace.retained };
      }
    } else {
      await verify(record);
      const { copyEvidence } = await import('./implementation-runtime.mjs');
      const { sourceFiles, collectChanges } = await import('./implementation.mjs');
      let changes = [];
      if (workspace.checkpoint) {
        const path = join(workspace.path, 'recovery.json'), stat = await lstat(path);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 90 * 1024 * 1024) throw Error('Unsafe workspace recovery baseline');
        const raw = await readFile(path);
        if (hash(raw) !== workspace.checkpoint) throw Error('Workspace recovery baseline changed');
        const checkpoint = JSON.parse(raw);
        if (checkpoint.baseline) {
          const baseline = new Map(checkpoint.baseline.map(([path, file]) => [path, { ...file, content: Buffer.from(file.content, 'base64') }]));
          const tracked = new Map(checkpoint.tracked.map(path => [path, baseline.get(path) ?? {}]));
          changes = collectChanges(baseline, await sourceFiles(join(workspace.path, 'source'), tracked), checkpoint.policy);
        }
      } else {
        // Preparation never exposed a worker; any source present must still be retained, not guessed disposable.
        const source = join(workspace.path, 'source');
        if (await readdir(source).then(names => names.length > 0, e => { if (e.code === 'ENOENT') return false; throw e; })) throw Error('Workspace has source but no recovery checkpoint; preserve for operator reconciliation');
      }
      const root = join(directory, 'retained'), staging = join(root, `${record.key}.pending`), destination = join(root, record.key);
      // Staging is itself journal-owned and never follows an outside path.
      await checkRetentionCapacity(directory, 0, 0);
      try { await mkdir(staging, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; throw Error('Interrupted retention staging requires operator reconciliation'); }
      try {
        await copyEvidence(join(workspace.path, 'output/evidence'), join(staging, 'evidence'));
        await writeFile(join(staging, 'changes.json'), JSON.stringify(changes), { mode: 0o600 });
        await writeFile(join(staging, 'receipt.json'), JSON.stringify({ identity: record.identity, owner: record.key, recoveredAt: new Date().toISOString(), candidateFiles: changes.length }), { mode: 0o600 });
        await checkRetentionCapacity(directory, 0, 0);
        workspace.retained = destination; workspace.retentionDigest = await seal(staging); workspace.status = 'retaining'; persist();
        await rename(staging, destination); await sync(root);
      } catch (error) { if (workspace.status !== 'retaining') await rm(staging, { recursive: true, force: true }); throw error; }
      workspace.retained = destination; workspace.status = 'retained'; persist();
    }
    if (workspace.retained !== join(directory, 'retained', record.key) || await seal(workspace.retained) !== workspace.retentionDigest) throw Error('Retained workspace evidence changed; preserve source');
    await verify(record);
    await remove(workspace.path, { recursive: true, force: true });
    await lstat(workspace.path).then(() => { throw Error('Workspace remains after removal'); }, error => { if (error.code !== 'ENOENT') throw error; });
    await sync(dirname(workspace.path));
    workspace.status = 'clean'; persist();
    return { status: 'clean', retained: workspace.retained };
  } catch (error) {
    workspace.error = 'Workspace retention or disposal failed; preserve state for operator reconciliation'; persist();
    throw error;
  }
}
