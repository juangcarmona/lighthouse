import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, symlink, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateImplementationPolicy, loadImplementation, collectChanges, sourceFiles, validateChanges, changesDigest, validateCheckReceipt, createImplementationPullRequest, materializeCandidate } from '../packages/sdlc/src/implementation.mjs';
import { routeIssue, checkPublication } from '../packages/sdlc/src/issue-actions.mjs';

const policy = { proposal: 33, reviewRequired: true, scope: 'Implement the approved slice; owner visual review remains required.', paths: ['src/', 'package.json', 'openspec/changes/issue-18-proposal/tasks.md'], checks: [['npm', 'test']] };
const change = { path: 'src/app.js', mode: '100644', content: Buffer.from('export const value = 2;').toString('base64') };
const request = { issue: 18, runId: 'a'.repeat(64), sourceRevision: 'b'.repeat(40), title: 'An approved feature', defaultBranch: 'main', implementation: { policy, proposal: { url: 'https://example.test/pr/33' } } };

test('implement requires an owner event; replies do not advance a stage', () => {
  const event = { inputs: { issue: '18', stage: 'implement' } };
  assert.equal(routeIssue(event, 'owner', 'owner', 'workflow_dispatch').stage, 'implement');
  assert.equal(routeIssue(event, 'stranger', 'owner', 'workflow_dispatch').run, false);
  const labeled = { action: 'labeled', label: { name: 'implement' }, issue: { number: 18, state: 'open', labels: [] } };
  assert.equal(routeIssue(labeled, 'owner', 'owner', 'issues').stage, 'implement');
  labeled.issue.labels = [{ name: 'agent-working' }];
  assert.equal(routeIssue(labeled, 'owner', 'owner', 'issues').run, false);
});
test('policy and change boundaries reject traversal, control files, changed plans and credential material', () => {
  assert.equal(validateImplementationPolicy(policy, 18), policy);
  for (const path of ['../src/', './', '.lighthouse/', '.agents/', 'openspec/', '.github/', '.github/workflows/lighthouse-sdlc-router.yml']) assert.throws(() => validateImplementationPolicy({ ...policy, paths: [path] }, 18));
  for (const path of ['src2/test.js', 'src/../../etc/passwd', 'src/../file', 'src/.env', '/src/a', 'src/a\\b', 'openspec/changes/issue-18-proposal/design.md']) assert.throws(() => validateChanges([{ ...change, path }], policy));
  assert.throws(() => validateChanges([change, change], policy));
  assert.throws(() => validateChanges([{ ...change, content: 'not base64!' }], policy));
  assert.throws(() => validateChanges([{ ...change, content: Buffer.from('ghp_' + 'a'.repeat(30)).toString('base64') }], policy));
  assert.throws(() => validateImplementationPolicy({ ...policy, checks: [] }, 18));
});
test('snapshot captures additions and deletions, excludes build output and rejects symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-implement-'));
  try {
    await mkdir(join(root, 'src')); await writeFile(join(root, 'src/old.js'), 'old'); await writeFile(join(root, '.gitignore'), 'node_modules/\n');
    const before = await sourceFiles(root);
    await rm(join(root, 'src/old.js')); await writeFile(join(root, 'src/app.js'), 'new');
    await mkdir(join(root, 'node_modules')); await writeFile(join(root, 'node_modules/ignored'), 'dependency');
    const changes = collectChanges(before, await sourceFiles(root, before), policy);
    assert.equal(changes.length, 2); assert.equal(changes.find(c => c.path.endsWith('old.js')).content, null);
    const candidate = join(root, 'candidate'); await mkdir(candidate);
    await materializeCandidate(before, changes, candidate);
    assert.equal(await readFile(join(candidate, 'src/app.js'), 'utf8'), 'new');
    await symlink('/etc/passwd', join(root, 'src/link')); await assert.rejects(sourceFiles(root), /Unsafe/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('approved proposal is bound to the owner merge and unchanged artifacts on the current revision', async () => {
  const files = ['proposal.md', 'design.md', 'tasks.md', 'specs/feature/spec.md'].map(filename => ({ filename: `openspec/changes/issue-18-proposal/${filename}`, sha: filename, status: 'added' }));
  let mergedBy = 'owner', edited = false;
  const api = async path => {
    if (path.startsWith('contents/.lighthouse/implement.json')) return { content: Buffer.from(JSON.stringify({ 18: policy })).toString('base64') };
    if (path === 'pulls/33') return { number: 33, merged: true, merged_by: { login: mergedBy }, changed_files: 4, base: { ref: 'main', repo: { full_name: 'owner/repo' } }, head: { sha: 'c'.repeat(40), repo: { full_name: 'owner/repo' } }, merge_commit_sha: 'd'.repeat(40) };
    if (path === 'pulls/33/files?per_page=100') return files;
    return { sha: edited ? 'changed' : files.find(f => path.startsWith(`contents/${f.filename}?`)).sha };
  };
  assert.equal((await loadImplementation(api, 18, 'owner', request.sourceRevision, 'main')).proposal.number, 33);
  mergedBy = 'bot'; await assert.rejects(loadImplementation(api, 18, 'owner', request.sourceRevision, 'main'), /merged by/);
  mergedBy = 'owner'; edited = true; await assert.rejects(loadImplementation(api, 18, 'owner', request.sourceRevision, 'main'), /changed/);
});
test('host checks bind the exact candidate and commands, preserving failures', () => {
  const receipt = { runId: request.runId, sourceRevision: request.sourceRevision, changesDigest: changesDigest([change]), checks: [{ command: ['npm', 'test'], exitCode: 0 }] };
  assert.equal(validateCheckReceipt(receipt, request, [change]), true);
  assert.throws(() => validateCheckReceipt(receipt, request, []), /identity/);
  receipt.checks[0].exitCode = 1; assert.equal(validateCheckReceipt(receipt, request, [change]), false);
  receipt.checks[0].command = ['true']; assert.throws(() => validateCheckReceipt(receipt, request, [change]), /command/);
});
test('publisher rechecks authority before a create-only branch and preserves draft state', async () => {
  const calls = [], api = async (path, method, body) => { calls.push({ path, method, body }); return path.startsWith('git/commits/') ? { tree: { sha: 'tree' } } : { sha: 'created', html_url: 'https://example.test/pr/34' }; };
  await createImplementationPullRequest(api, request, [change], 'Owner review pending', 'https://example.test/run', true, async () => calls.push({ path: 'recheck' }));
  assert.equal(calls.find(c => c.path === 'pulls').body.draft, true);
  assert.ok(calls.findIndex(c => c.path === 'recheck') < calls.findIndex(c => c.path === 'git/refs'));
  assert.equal(calls.find(c => c.path === 'git/refs').method, 'POST');
  assert.ok(calls.every(c => !['PATCH', 'DELETE'].includes(c.method)));
  calls.length = 0;
  await assert.rejects(createImplementationPullRequest(api, request, [change], '', '', false, async () => { throw Error('revoked'); }), /revoked/);
  assert.ok(!calls.some(c => ['git/refs', 'pulls'].includes(c.path)));
  assert.throws(() => checkPublication(request, { state: 'open', labels: [] }, [], 'changed'), /revision/);
});

test('implementation shell progress identifies the command without dumping its output', async () => {
  const { formatOpenCodeEvent } = await import('../packages/sdlc/src/opencode-progress.mjs');
  const visible = formatOpenCodeEvent(JSON.stringify({ type: 'tool_use', part: { tool: 'shell', state: { status: 'completed', input: { command: 'npm run build' }, output: 'raw protocol and payload' } } }));
  assert.match(visible, /shell npm run build/);
  assert.ok(!visible.includes('payload'));
});

test('patch progress names changed files without exposing the patch contents', async () => {
  const { formatOpenCodeEvent } = await import('../packages/sdlc/src/opencode-progress.mjs');
  const visible = formatOpenCodeEvent(JSON.stringify({ type: 'tool_use', part: { tool: 'patch', state: { status: 'completed', input: { patchText: '*** Begin Patch\n*** Add File: /workspace/src/app.ts\n+private payload\n*** Update File: /workspace/tests/app.test.ts\n*** End Patch' } } } }));
  assert.match(visible, /src\/app.ts.*tests\/app.test.ts/);
  assert.ok(!visible.includes('payload'));
});

test('Git-ignored new reports are excluded while newly ignored tracked edits remain subject to scope', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-ignore-'));
  try {
    await writeFile(join(root, '.gitignore'), 'test-reports/\n');
    await writeFile(join(root, 'protected.md'), 'original');
    const before = await sourceFiles(root);
    await mkdir(join(root, 'test-reports')); await writeFile(join(root, 'test-reports/output.json'), 'generated');
    assert.equal(collectChanges(before, await sourceFiles(root, before), policy).length, 0);
    await writeFile(join(root, '.gitignore'), 'test-reports/\nprotected.md\n'); await writeFile(join(root, 'protected.md'), 'changed');
    const after = await sourceFiles(root, before);
    assert.equal(after.get('protected.md').content.toString(), 'changed');
    assert.throws(() => collectChanges(before, after, policy), /out-of-scope/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('an immutable recovery seed cannot overwrite newer source or expand its write scope', async () => {
  const { loadImplementationSeed } = await import('../packages/sdlc/src/implementation.mjs');
  const base = 'a'.repeat(40), head = 'b'.repeat(40), revision = 'c'.repeat(40);
  const seeded = { ...policy, seed: { base, head } };
  validateImplementationPolicy(seeded, 18);
  let conflict = false, extraParent = false, path = 'src/app.js';
  const api = async route => {
    if (route === `git/commits/${head}`) return { parents: extraParent ? [{ sha: base }, { sha: revision }] : [{ sha: base }] };
    if (route.startsWith('git/trees/')) {
      const sha = route.split('/')[2].split('?')[0];
      return { truncated: false, tree: [{ path, type: 'blob', mode: '100644', sha: sha === head ? 'new' : sha === revision && conflict ? 'someone-elses-edit' : 'old' }] };
    }
    assert.equal(route, 'git/blobs/new'); return { encoding: 'base64', size: 3, content: Buffer.from('new').toString('base64') };
  };
  assert.equal((await loadImplementationSeed(api, seeded, revision))[0].path, 'src/app.js');
  conflict = true; await assert.rejects(loadImplementationSeed(api, seeded, revision), /conflicts/);
  conflict = false; extraParent = true; await assert.rejects(loadImplementationSeed(api, seeded, revision), /one commit/);
  extraParent = false; path = '.github/workflows/agent.yml'; await assert.rejects(loadImplementationSeed(api, seeded, revision), /scope/);
  assert.throws(() => validateImplementationPolicy({ ...policy, seed: { base, head: 'main' } }, 18), /immutable/);
});
