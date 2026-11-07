import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { prepareSourceSynchronization, validateSourceSynchronization, synchronizedSource, synchronizationDigest } from '../packages/sdlc/src/source-sync.mjs';
import { sourceFiles, materializeCandidate, collectChanges, validateImplementationPolicy, createImplementationPullRequest, validateCheckReceipt, changesDigest } from '../packages/sdlc/src/implementation.mjs';
import { commandEvidenceBinding } from '../packages/sdlc/src/implementation-evidence.mjs';
import { digest } from '../packages/sdlc/src/host-contract.mjs';

async function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'lh-sync-'));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
  git('init', '-q'); git('config', 'user.name', 'test'); git('config', 'user.email', 'test@example.test');
  const write = (path, content) => { mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), content); };
  const commit = message => { git('add', '.'); git('commit', '-qm', message); return git('rev-parse', 'HEAD'); };
  write('.github/workflows/ci.yml', 'old'); write('delete.txt', 'obsolete'); write('src/app.mjs', 'old'); write('docs/product/model.md', 'old');
  const ancestor = commit('initial');
  write('src/app.mjs', 'feature'); write('docs/product/model.md', 'approved product');
  const source = commit('product and feature'), baseline = await sourceFiles(root);
  git('checkout', '-q', '--detach', ancestor);
  write('.github/workflows/ci.yml', 'new'); write('script.sh', 'echo test\n'); chmodSync(join(root, 'script.sh'), 0o755); rmSync(join(root, 'delete.txt'));
  const base = commit('managed update'); git('checkout', '-q', '--detach', source);
  const calls = [];
  const api = async (path, method = 'GET') => {
    calls.push({ path, method }); if (path.startsWith('contents/lighthouse.json?ref=')) return null; assert.equal(method, 'GET');
    if (path === `compare/${base}...${source}`) return { base_commit: { sha: base }, merge_base_commit: { sha: ancestor }, behind_by: 1 };
    if (path.startsWith('git/commits/')) { const sha = path.slice(12); return { sha, tree: { sha: git('rev-parse', `${sha}^{tree}`) } }; }
    if (path.startsWith('git/trees/')) {
      const sha = path.slice(10).split('?')[0];
      return { truncated: false, tree: git('ls-tree', '-rz', '--long', sha).split('\0').filter(Boolean).map(row => {
        const [, mode, type, sha, size, path] = /^(\d+) (\w+) (\w+) +(\d+)\t([\s\S]+)$/.exec(row);
        return { mode, type, sha, size: Number(size), path };
      }) };
    }
    throw Error(path);
  };
  return { root, git, source, base, ancestor, baseline, api, calls, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('trusted base synchronization preserves product/application changes and authenticates modes and deletions', async () => {
  const f = await fixture();
  try {
    const manifest = await prepareSourceSynchronization(f.api, f.source, f.base);
    const result = synchronizedSource(f.root, f.baseline, manifest);
    assert.equal(result.get('src/app.mjs').content.toString(), 'feature');
    assert.equal(result.get('docs/product/model.md').content.toString(), 'approved product');
    assert.equal(result.get('.github/workflows/ci.yml').content.toString(), 'new');
    assert.equal(result.get('script.sh').mode, '100755'); assert.equal(result.has('delete.txt'), false);
    assert.equal(f.baseline.get('.github/workflows/ci.yml').content.toString(), 'old');
    assert.equal(f.git('rev-parse', 'HEAD'), f.source); assert.equal(f.calls.length, 7);
    const candidate = mkdtempSync(join(tmpdir(), 'lh-sync-candidate-'));
    try {
      await materializeCandidate(result, [], candidate);
      execFileSync('git', ['-C', candidate, 'init', '-q']); execFileSync('git', ['-C', candidate, 'add', '--force', '.']);
      const actualTree = execFileSync('git', ['-C', candidate, 'write-tree'], { encoding: 'utf8' }).trim();
      assert.equal(actualTree, f.git('merge-tree', '--write-tree', f.source, f.base));
    } finally { rmSync(candidate, { recursive: true, force: true }); }
    assert.throws(() => collectChanges(result, new Map(result).set('.github/workflows/ci.yml', { content: Buffer.from('tamper'), mode: '100644' }), { paths: ['*'] }), /out-of-scope/);
    const changed = new Map(f.baseline); changed.set('src/app.mjs', { content: Buffer.from('tamper'), mode: '100644' });
    assert.throws(() => synchronizedSource(f.root, changed, manifest), /source or manifest/);
    for (const mutate of [m => m.files.pop(), m => m.files[0].sha = 'a'.repeat(40), m => m.baseTree = 'a'.repeat(40), m => m.files[0].before = null]) {
      const altered = structuredClone(manifest); mutate(altered);
      assert.throws(() => synchronizedSource(f.root, f.baseline, altered));
    }
    for (const path of ['../x', '/x', 'a/.git/config', 'a\\b', 'a\0b']) {
      const altered = structuredClone(manifest); altered.files[0].path = path;
      assert.throws(() => validateSourceSynchronization(altered));
    }
  } finally { f.cleanup(); }
});

test('synchronization rejects conflicts, incomplete inventories and unsupported entries', async () => {
  const f = await fixture();
  try {
    const original = f.api;
    for (const mutate of [t => t.truncated = true, t => t.tree.push(t.tree[0]), t => t.tree[0].mode = '120000', t => t.tree[0].size = 4 * 1024 * 1024 + 1]) {
      const api = async path => { if (path.startsWith('contents/lighthouse.json?ref=')) return null; const value = await original(path); if (path.startsWith('git/trees/')) mutate(value); return value; };
      await assert.rejects(prepareSourceSynchronization(api, f.source, f.base));
    }
    const api = async path => { if (path.startsWith('contents/lighthouse.json?ref=')) return null;
      const value = await original(path);
      if (path === `git/trees/${f.git('rev-parse', `${f.base}^{tree}`)}?recursive=1`) value.tree.find(file => file.path === 'src/app.mjs').sha = 'a'.repeat(40);
      return value;
    };
    await assert.rejects(prepareSourceSynchronization(api, f.source, f.base), /Conflicting/);
    assert.equal(await prepareSourceSynchronization(async () => ({ base_commit: { sha: f.base }, merge_base_commit: { sha: f.ancestor }, behind_by: 0 }), f.source, f.base), null);
  } finally { f.cleanup(); }
});

test('sync publication uses the independently checked tree and two parents; failed checks cannot publish', async () => {
  const f = await fixture();
  try {
    const synchronization = await prepareSourceSynchronization(f.api, f.source, f.base);
    const repository = 'owner/repo', identity = 'a'.repeat(64), branch = 'lighthouse/implement-18-aaaaaaaaaaaa';
    const feedback = { user: { login: 'owner' }, body: 'Verify with admitted base.' };
    const policy = { paths: ['src/'], checks: [['node', '--test']], scope: 'Verify immutable inputs', reviewRequired: false, verification: { paths: ['.github/'], corrections: {}, synchronizeBase: true } };
    validateImplementationPolicy(policy, 18);
    const review = { number: 34, issue: 18, head: f.source, branch, base: 'main', implementationIdentity: identity, path: 'issues/comments/10', feedbackDigest: digest(JSON.stringify(feedback)), approved: false };
    const request = { repository, issue: 18, stage: 'implement', worker: 'apply-review', runId: identity, taskDigest: identity, workflowRunId: '100', attempt: 1, sourceRevision: f.source, baseRevision: f.base, defaultBranch: 'main', implementationReview: review, implementation: { policy }, sourceSynchronization: synchronization };
    const current = { number: 34, state: 'open', merged: false, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: f.source, ref: branch, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, body: `<!-- lighthouse-implementation:${identity} -->` };
    const checkedTree = 'd'.repeat(40), newHead = 'e'.repeat(40);
    for (const scenario of ['passed', 'lost-ack', 'unknown', 'tree-mismatch', 'failed', 'model-change', 'epic']) {
      const writes = [];
      const api = async (path, method = 'GET', body) => { if (path.startsWith('contents/lighthouse.json?ref=')) return null;
        if (method === 'GET') {
          if (path === 'pulls/34') return structuredClone(current);
          if (path === review.path) return feedback;
          if (path === `git/ref/heads/${branch}`) return { ref: `refs/heads/${branch}`, object: { sha: scenario === 'unknown' ? f.source : newHead } };
          return f.api(path);
        }
        writes.push({ path, method, body });
        if (path === 'git/trees') { assert.deepEqual(body.tree, synchronization.files.map(({ path, sha, mode }) => ({ path, sha, mode, type: 'blob' }))); return { sha: scenario === 'tree-mismatch' ? 'f'.repeat(40) : checkedTree }; }
        if (path === 'git/commits') { assert.deepEqual(body.parents, [f.source, f.base]); assert.equal(body.tree, checkedTree); return { sha: newHead }; }
        if (path.startsWith('git/refs/') && ['lost-ack', 'unknown'].includes(scenario)) throw Error('lost acknowledgement');
        return {};
      };
      const snapshot = scenario === 'epic' ? { ...request, epic: {} } : request;
      const changes = scenario === 'model-change' ? [{ path: 'src/app.mjs', mode: '100644', content: Buffer.from('change').toString('base64') }] : [];
      const publish = () => createImplementationPullRequest(api, snapshot, changes, 'Verified', '', true, async () => {}, async () => {}, { refreshVerification: scenario !== 'failed', checkedTree });
      if (['passed', 'lost-ack'].includes(scenario)) assert.equal((await publish()).head.sha, newHead);
      else await assert.rejects(publish);
      assert.equal(writes.filter(call => call.path.startsWith('git/refs/')).length, ['passed', 'lost-ack', 'unknown'].includes(scenario) ? 1 : 0);
    }
    const binding = commandEvidenceBinding(request);
    assert.equal(binding.synchronization, synchronizationDigest(synchronization));
    const receipt = { schemaVersion: 2, binding, candidateTree: checkedTree, runId: identity, sourceRevision: f.source, changesDigest: changesDigest([]), checks: [{ command: policy.checks[0], exitCode: 0 }] };
    assert.equal(validateCheckReceipt(receipt, request, []), true);
    const tampered = structuredClone(request); tampered.sourceSynchronization.files.pop();
    assert.throws(() => validateCheckReceipt(receipt, tampered, []), /input mismatch/);
    assert.throws(() => validateCheckReceipt({ ...receipt, schemaVersion: 1 }, request, []), /bound command/);
    const legacy = { ...request }; delete legacy.sourceSynchronization;
    assert.equal('synchronization' in commandEvidenceBinding(legacy), false);
  } finally { f.cleanup(); }
});

test('the unattended adapter preserves the sanitized hosting refusal and optional response behavior', async () => {
  const { githubJson } = await import('../packages/sdlc/src/unattended-actions.mjs');
  const original = globalThis.fetch;
  const env = { GITHUB_REPOSITORY: 'owner/repo', GH_TOKEN: 'private-test-credential' };
  try {
    globalThis.fetch = async () => Response.json({ message: 'Required status check "repository" is expected. ' + env.GH_TOKEN }, { status: 405 });
    await assert.rejects(githubJson(env, 'pulls/34/merge', 'PUT', { sha: 'a'.repeat(40) }), error => {
      assert.equal(error.status, 405); assert.match(error.message, /Required status check "repository" is expected/); assert.ok(!error.message.includes(env.GH_TOKEN)); return true;
    });
    globalThis.fetch = async () => new Response(null, { status: 404 });
    assert.equal(await githubJson(env, 'missing', 'GET', undefined, true), null);
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await githubJson(env, 'pulls/34', 'PATCH', {}), null);
  } finally { globalThis.fetch = original; }
});
