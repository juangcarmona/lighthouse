import { readFile, writeFile, mkdir, readdir, lstat, mkdtemp, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { proposalRoot, changeName } from './proposal.mjs';
import { validateEnvironment } from './execution-environment.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const safePath = path => typeof path === 'string' && path.length < 300 && !path.startsWith('/') && !path.includes('\\') && !path.split('/').some(p => !p || p === '.' || p === '..' || p === '.git');
const protectedPath = path => /^(?:\.lighthouse|\.agents|\.product|\.git|\.opencode)(?:\/|$)/.test(path) || /(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|\.netrc|id_rsa|id_ed25519)$/.test(path) || path.startsWith('.github/') || /(?:^|\/)(?:AGENTS|CLAUDE)\.md$/.test(path);
export const changesDigest = changes => hash(JSON.stringify(changes));
export function validateImplementationPolicy(policy, issue) {
  if (!policy || Object.keys(policy).filter(k => !['seed', 'proposal'].includes(k)).sort().join(',') !== 'checks,paths,reviewRequired,scope' || typeof policy.reviewRequired !== 'boolean' || ('proposal' in policy && (!Number.isSafeInteger(policy.proposal) || policy.proposal < 1)) || typeof policy.scope !== 'string' || !policy.scope.trim() || policy.scope.length > 4000) throw Error('Invalid implementation policy');
  if (!Array.isArray(policy.paths) || !policy.paths.length || policy.paths.length > 40 || policy.paths.some(p => p !== '*' && (!safePath(p.replace(/\/$/, '')) || protectedPath(p) || p.startsWith('openspec/') && p !== `${proposalRoot(issue)}/tasks.md` && p !== `${proposalRoot(issue)}/` || p.startsWith('.github/') && !/^\.github\/workflows\/[\w-]+\.ya?ml$/.test(p)))) throw Error('Implementation policy needs safe paths');
  if (!Array.isArray(policy.checks) || !policy.checks.length || policy.checks.length > 12 || policy.checks.some(c => !Array.isArray(c) || !c.length || c.length > 30 || c.some(a => typeof a !== 'string' || !a || a.length > 1000 || /[\0\r\n]/.test(a)))) throw Error('Implementation policy needs bounded command argument arrays');
  if ('seed' in policy && (!policy.seed || typeof policy.seed !== 'object' || Object.keys(policy.seed).sort().join(',') !== 'base,head' || !/^[a-f0-9]{40}$/.test(policy.seed.base ?? '') || !/^[a-f0-9]{40}$/.test(policy.seed.head ?? ''))) throw Error('Seed must identify immutable base and head commits');
  return policy;
}
export const withinScope = (path, policy) => safePath(path) && !protectedPath(path) && policy.paths.some(p => p === '*' || (p.endsWith('/') ? path.startsWith(p) : path === p));

export async function loadImplementation(api, issue, owner, revision, defaultBranch, route = null) {
  const config = await api(`contents/.lighthouse/implement.json?ref=${revision}`, 'GET', undefined, true);
  const configured = config ? JSON.parse(Buffer.from(config.content, 'base64').toString()) : {};
  let policy = configured[issue] ?? configured.defaults;
  if (!policy) {
    const manifest = await api(`contents/package.json?ref=${revision}`, 'GET', undefined, true);
    const pkg = manifest ? JSON.parse(Buffer.from(manifest.content, 'base64').toString()) : {};
    if (!pkg.scripts?.verify) throw Error('Configure repository implementation checks in .lighthouse/implement.json defaults, or provide npm run verify');
    policy = { scope: 'Implement only this issue and its acceptance criteria.', paths: ['*'], checks: [['npm', 'ci', '--ignore-scripts'], ['npm', 'run', 'verify']], reviewRequired: false };
  }
  const planCheck = ['npx', '--yes', '--package=@fission-ai/openspec@1.15.0', 'openspec', 'validate', changeName(issue), '--strict', '--no-interactive'];
  policy = validateImplementationPolicy(policy, issue);
  policy = { ...policy, checks: [...policy.checks, ...(route === 'hotfix' ? [] : [planCheck])] };
  const environmentFile = await api(`contents/.lighthouse/environment.json?ref=${revision}`, 'GET', undefined, true);
  const environment = environmentFile ? validateEnvironment(JSON.parse(Buffer.from(environmentFile.content, 'base64').toString())) : null;
  return { policy, proposal: { root: proposalRoot(issue) }, ...(environment ? { environment } : {}) };
}

// A reviewed immutable seed recovers a failed attempt without updating its branch.
export async function loadImplementationSeed(api, policy, revision) {
  if (!policy.seed) return null;
  const { base, head } = policy.seed;
  const commit = await api(`git/commits/${head}`);
  if (commit.parents?.length !== 1 || commit.parents[0].sha !== base) throw Error('Seed must be one commit directly based on the declared revision');
  const trees = [];
  for (const sha of [base, head, revision]) {
    const tree = await api(`git/trees/${sha}?recursive=1`);
    if (tree.truncated || !Array.isArray(tree.tree) || tree.tree.length > 10000) throw Error('Seed tree exceeds bounds');
    trees.push(new Map(tree.tree.filter(f => f.type !== 'tree').map(f => [f.path, f])));
  }
  const [before, after, current] = trees, changes = [];
  let bytes = 0;
  for (const path of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const old = before.get(path), next = after.get(path), live = current.get(path);
    if (old?.sha === next?.sha && old?.mode === next?.mode) continue;
    if (!withinScope(path, policy) || old?.sha !== live?.sha || old?.mode !== live?.mode) throw Error('Seed conflicts with current source or write scope');
    if ([old, next].filter(Boolean).some(f => f.type !== 'blob' || !['100644', '100755'].includes(f.mode))) throw Error('Seed contains a link or non-regular change');
    if (changes.length >= 512) throw Error('Seed exceeds changed-file bound');
    let content = null;
    if (next) {
      const blob = await api(`git/blobs/${next.sha}`);
      if (blob.encoding !== 'base64' || blob.size > 4 * 1024 * 1024) throw Error('Seed blob exceeds bounds');
      content = blob.content.replaceAll('\n', '');
      bytes += Buffer.byteLength(content, 'base64');
      if (bytes > 16 * 1024 * 1024) throw Error('Seed exceeds byte bounds');
    }
    changes.push({ path, mode: next?.mode ?? old.mode, content });
  }
  return validateChanges(changes, policy);
}

// Honor Git ignores for new output without hiding tracked edits or following source links.
export async function sourceFiles(root, baseline) {
  const metadata = baseline ? await mkdtemp(join(tmpdir(), 'lighthouse-ignore-')) : null;
  const gitEnv = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_COUNT: '0' };
  if (metadata) execFileSync('git', ['init', '--bare', '-q', metadata], { env: gitEnv });
  const trackedDirectories = new Set();
  for (const path of baseline?.keys() ?? []) { let parent = dirname(path); while (parent !== '.') { trackedDirectories.add(parent); parent = dirname(parent); } }
  const files = new Map(); let bytes = 0;
  async function visit(dir, relative = '') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const path = relative ? `${relative}/${entry.name}` : entry.name, target = join(dir, entry.name);
      if (metadata && !baseline.has(path) && !trackedDirectories.has(path)) {
        const ignored = spawnSync('git', ['--git-dir', metadata, '--work-tree', root, 'check-ignore', '--no-index', '-z', '--stdin'], { input: path + '\0', env: gitEnv, timeout: 10000, maxBuffer: 4096 });
        if (ignored.status === 0) continue;
        if (ignored.status !== 1) throw Error('Unable to resolve ignored implementation output');
      }
      const stat = await lstat(target);
      if (!safePath(path) || stat.isSymbolicLink() || !stat.isDirectory() && !stat.isFile()) throw Error(`Unsafe implementation file: ${path}`);
      if (stat.isDirectory()) await visit(target, path);
      else {
        bytes += stat.size;
        if (bytes > 64 * 1024 * 1024 || files.size >= 5000) throw Error('Implementation source exceeds bounds');
        files.set(path, { content: await readFile(target), mode: stat.mode & 0o111 ? '100755' : '100644' });
      }
    }
  }
  try { await visit(root); return files; } finally { if (metadata) await rm(metadata, { recursive: true, force: true }); }
}
export function collectChanges(before, after, policy) {
  const changes = [];
  for (const path of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const old = before.get(path), current = after.get(path);
    if (old && current && old.content.equals(current.content) && old.mode === current.mode) continue;
    changes.push({ path, mode: current?.mode ?? old?.mode ?? '100644', content: current ? current.content.toString('base64') : null });
  }
  return validateChanges(changes, policy);
}
export function validateChanges(changes, policy) {
  if (!Array.isArray(changes) || changes.length > 512) throw Error('Implementation exceeds 512 changed files');
  const seen = new Set(); let bytes = 0;
  for (const file of changes) {
    if (!file || Object.keys(file).sort().join(',') !== 'content,mode,path' || !withinScope(file.path, policy) || seen.has(file.path) || !['100644', '100755'].includes(file.mode) || file.content !== null && (typeof file.content !== 'string' || Buffer.from(file.content, 'base64').toString('base64') !== file.content)) throw Error('Invalid or out-of-scope implementation change');
    seen.add(file.path);
    const buffer = Buffer.from(file.content ?? '', 'base64'); bytes += buffer.length;
    if (buffer.length > 4 * 1024 * 1024 || bytes > 16 * 1024 * 1024) throw Error('Implementation exceeds byte bounds');
    if (/\b(?:sk-|ghp_|github_pat_)[A-Za-z0-9_-]{15,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/.test(buffer.toString())) throw Error(`Credential-shaped content rejected in ${file.path}`);
  }
  return changes;
}
export async function materializeCandidate(before, changes, destination) {
  const files = new Map(before);
  for (const file of changes) if (file.content === null) files.delete(file.path); else files.set(file.path, { content: Buffer.from(file.content, 'base64'), mode: file.mode });
  for (const [path, file] of files) { await mkdir(dirname(join(destination, path)), { recursive: true, mode: 0o777 }); await writeFile(join(destination, path), file.content, { mode: file.mode === '100755' ? 0o777 : 0o666 }); }
}
export function validateCheckReceipt(receipt, request, changes) {
  if (receipt?.runId !== request.runId || receipt.sourceRevision !== request.sourceRevision || receipt.changesDigest !== changesDigest(changes) || !Array.isArray(receipt.checks) || receipt.checks.length !== request.implementation.policy.checks.length) throw Error('Implementation check receipt identity mismatch');
  for (let i = 0; i < receipt.checks.length; i++) if (JSON.stringify(receipt.checks[i].command) !== JSON.stringify(request.implementation.policy.checks[i]) || !Number.isInteger(receipt.checks[i].exitCode)) throw Error('Implementation check receipt command mismatch');
  if (request.implementation.environment) {
    const declaration = validateEnvironment(request.implementation.environment);
    if (!/^sha256:[a-f0-9]{64}$/.test(receipt.image ?? '') || receipt.environment?.image !== receipt.image || receipt.environment?.profile !== declaration.profile || !Array.isArray(receipt.environment.services) || receipt.environment.services.length !== declaration.services.length || receipt.environment.services.some(s => s.type !== 'postgresql' || !/^sha256:[a-f0-9]{64}$/.test(s.image ?? ''))) throw Error('Implementation environment receipt mismatch');
  }
  return receipt.serviceCleanup !== false && receipt.checks.every(c => c.exitCode === 0);
}
export async function createImplementationPullRequest(api, snapshot, changes, body, runUrl, draft, beforeWrite) {
  validateChanges(changes, snapshot.implementation.policy);
  if (!changes.length) throw Error('No implementation changes to publish');
  const epic = snapshot.epic;
  if (epic && (!Number.isSafeInteger(epic.parent) || epic.parent < 1 || epic.parent === snapshot.issue || epic.base !== `lighthouse/epic-${epic.parent}` || !/^[a-f0-9]{40}$/.test(epic.baseSha ?? '') || epic.baseSha !== snapshot.sourceRevision || snapshot.implementationReview)) throw Error('Invalid epic publication base');
  const checkEpicBase = async () => {
    if (epic && (await api(`git/ref/heads/${epic.base}`)).object?.sha !== epic.baseSha) throw Error('Epic base changed; revalidate the child');
  };
  await checkEpicBase();
  const commit = await api(`git/commits/${snapshot.sourceRevision}`), entries = [];
  for (const file of changes) {
    const sha = file.content === null ? null : (await api('git/blobs', 'POST', { content: file.content, encoding: 'base64' })).sha;
    entries.push({ path: file.path, mode: file.mode, type: 'blob', sha });
  }
  const tree = await api('git/trees', 'POST', { base_tree: commit.tree.sha, tree: entries });
  const created = await api('git/commits', 'POST', { message: `feat: implement issue #${snapshot.issue}`, tree: tree.sha, parents: [snapshot.sourceRevision] });
  await beforeWrite();
  await checkEpicBase();
  const description = marker => `${body.trim()}\n\nRefs #${snapshot.issue}.\n\nNext: ${draft ? 'complete the candidate and its checks' : 'wait for required CI, then review this PR'}. [Run and evidence](${runUrl}).\n\n<!-- lighthouse-implementation:${marker} -->`;
  if (snapshot.implementationReview) {
    await api(`git/refs/heads/${snapshot.implementationReview.branch}`, 'PATCH', { sha: created.sha, force: false });
    const current = await api(`pulls/${snapshot.implementationReview.number}`);
    const marker = current.body?.match(/<!-- lighthouse-implementation:([a-f0-9]{64}) -->/)?.[1];
    if (!marker) throw Error('Implementation PR marker missing during update');
    await api(`pulls/${snapshot.implementationReview.number}`, 'PATCH', { body: description(marker) });
    return { number: snapshot.implementationReview.number, html_url: snapshot.implementationReview.url, head: { sha: created.sha, ref: snapshot.implementationReview.branch } };
  }
  const branch = `lighthouse/implement-${snapshot.issue}-${snapshot.runId.slice(0, 12)}`;
  await api('git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: created.sha });
  if (epic) { await beforeWrite(); await checkEpicBase(); }
  return api('pulls', 'POST', { title: snapshot.title.slice(0, 180), head: branch, base: epic?.base ?? snapshot.defaultBranch, draft, body: description(snapshot.runId) });
}
