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
  assert.throws(() => validateChanges([{ ...change, content: Buffer.from('ghp_' + 'a'.repeat(30)).toString('base64') }], policy), /Credential-shaped content rejected in src\/app\.js/);
  assert.throws(() => validateImplementationPolicy({ ...policy, checks: [] }, 18));
});
test('redaction fixtures remain publishable without exempting test files from credential checks', async () => {
  const content = await readFile(new URL('./opencode-execute.test.mjs', import.meta.url));
  assert.doesNotThrow(() => validateChanges([{ ...change, path: 'src/tests/opencode-execute.test.mjs', content: content.toString('base64') }], policy));
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
test('an issue uses repository checks without a proposal PR or per-issue configuration', async () => {
  const api = async path => {
    if (path.startsWith('contents/.lighthouse/environment.json')) return null;
    if (path.startsWith('contents/.lighthouse/implement.json')) return null;
    assert.ok(path.startsWith('contents/package.json'));
    return { content: Buffer.from(JSON.stringify({ scripts: { verify: 'node verify.mjs' } })).toString('base64') };
  };
  const actual = await loadImplementation(api, 18, 'owner', request.sourceRevision, 'main');
  assert.equal(actual.proposal.root, 'openspec/changes/issue-18-proposal');
  assert.equal(actual.policy.reviewRequired, false);
  assert.deepEqual(actual.policy.checks.slice(0, 2), [['npm', 'ci', '--ignore-scripts'], ['npm', 'run', 'verify']]);
  validateChanges([{ ...change, path: 'openspec/changes/issue-18-proposal/design.md' }], actual.policy);
  for (const path of ['.github/workflows/run.yml', '.lighthouse/implement.json', '.git/config', '.opencode/config.json', 'src/.env', 'AGENTS.md']) assert.throws(() => validateChanges([{ ...change, path }], actual.policy));
  await assert.rejects(loadImplementation(async () => null, 18, 'owner', request.sourceRevision, 'main'), /checks/);
});
test('repository defaults and existing bounded per-issue policies remain usable without merging a proposal', async () => {
  for (const configured of [{ defaults: policy }, { 18: policy }]) {
    const api = async path => {
      if (path.startsWith('contents/.lighthouse/environment.json')) return null;
      assert.ok(path.startsWith('contents/.lighthouse/implement.json'));
      return { content: Buffer.from(JSON.stringify(configured)).toString('base64') };
    };
    const actual = (await loadImplementation(api, 18, 'owner', request.sourceRevision, 'main')).policy;
    assert.deepEqual(actual.paths, policy.paths);
    assert.deepEqual(actual.checks[0], policy.checks[0]);
    assert.ok(actual.checks.at(-1).includes('--strict'));
  }
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
  assert.match(calls.find(c => c.path === 'pulls').body.body, /Refs #18/);
  assert.doesNotMatch(calls.find(c => c.path === 'pulls').body.body, /Closes #18/);
  assert.ok(calls.findIndex(c => c.path === 'recheck') < calls.findIndex(c => c.path === 'git/refs'));
  assert.equal(calls.find(c => c.path === 'git/refs').method, 'POST');
  assert.ok(calls.every(c => !['PATCH', 'DELETE'].includes(c.method)));
  calls.length = 0;
  await assert.rejects(createImplementationPullRequest(api, request, [change], '', '', false, async () => { throw Error('revoked'); }), /revoked/);
  assert.ok(!calls.some(c => ['git/refs', 'pulls'].includes(c.path)));
  assert.throws(() => checkPublication(request, { state: 'open', labels: [] }, [], 'changed'), /revision/);
});

test('an epic child targets the recorded shared base and stops if it advances', async () => {
  for (const changedAt of [0, 1, 2, 3]) {
    const epic = { parent: 146, base: 'lighthouse/epic-146', baseSha: request.sourceRevision };
    const calls = []; let reads = 0;
    const api = async (path, method, body) => {
      calls.push({ path, method, body });
      if (path === 'git/ref/heads/lighthouse/epic-146') return { object: { sha: ++reads === changedAt ? 'c'.repeat(40) : epic.baseSha } };
      return path.startsWith('git/commits/') ? { tree: { sha: 'tree' } } : { sha: 'created' };
    };
    const publish = () => createImplementationPullRequest(api, { ...request, epic }, [change], 'Child candidate', '', true, async () => calls.push({ path: 'authorize' }));
    if (changedAt) {
      await assert.rejects(publish(), /Epic base changed/);
      assert.equal(calls.some(call => call.path === 'pulls'), false);
      if (changedAt < 3) assert.equal(calls.some(call => call.path === 'git/refs'), false);
    } else {
      await publish();
      assert.equal(calls.find(call => call.path === 'pulls').body.base, epic.base);
      assert.equal(calls.filter(call => call.path === 'authorize').length, 2);
    }
  }
});

test('epic publication rejects an invalid base and revoked authority', async () => {
  const epic = { parent: 146, base: 'lighthouse/epic-146', baseSha: request.sourceRevision };
  const calls = []; let authorizations = 0;
  const api = async (path, method, body) => {
    calls.push({ path, method, body });
    if (path.startsWith('git/ref/heads/')) return { object: { sha: epic.baseSha } };
    return path.startsWith('git/commits/') ? { tree: { sha: 'tree' } } : { sha: 'created' };
  };
  await assert.rejects(createImplementationPullRequest(api, { ...request, epic: { ...epic, base: 'main' } }, [change], '', '', true, async () => {}), /Invalid epic/);
  assert.equal(calls.length, 0);
  await assert.rejects(createImplementationPullRequest(api, { ...request, epic }, [change], '', '', true, async () => { if (++authorizations === 2) throw Error('revoked'); }), /revoked/);
  assert.equal(calls.some(call => call.path === 'pulls'), false);
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

test('review feedback updates the existing implementation branch without a force push or second PR', async () => {
  const calls = [];
  const api = async (path, method, body) => { calls.push({ path, method, body }); return path === 'pulls/34' && method !== 'PATCH' ? { body: `<!-- lighthouse-implementation:${'a'.repeat(64)} -->` } : { sha: 'created', tree: { sha: 'tree' } }; };
  const reviewed = { ...request, implementationReview: { number: 34, branch: 'lighthouse/implement-18-aaaaaaaaaaaa', url: 'https://example.test/pr/34' } };
  const pr = await createImplementationPullRequest(api, reviewed, [change], 'Updated', '', false, async () => calls.push({ path: 'recheck' }));
  assert.equal(pr.number, 34);
  assert.deepEqual(calls.find(c => c.path === 'git/refs/heads/lighthouse/implement-18-aaaaaaaaaaaa'), { path: 'git/refs/heads/lighthouse/implement-18-aaaaaaaaaaaa', method: 'PATCH', body: { sha: 'created', force: false } });
  assert.match(calls.at(-1).body.body, /Refs #18/);
  assert.doesNotMatch(calls.at(-1).body.body, /Closes #18/);
  assert.equal(calls.some(c => c.path === 'pulls'), false);
  assert.ok(calls.findIndex(c => c.path === 'recheck') < calls.findIndex(c => c.path === 'git/refs/heads/lighthouse/implement-18-aaaaaaaaaaaa'));
});

test('epic review updates the same PR after rechecking its shared base and authority', async () => {
  for (const revoked of [false, true]) {
    const calls = [], epic = { parent: 146, base: 'lighthouse/epic-146', baseSha: 'c'.repeat(40) };
    const reviewed = { ...request, epic, implementationReview: { number: 34, head: request.sourceRevision, base: epic.base, branch: 'lighthouse/implement-18-aaaaaaaaaaaa', url: 'https://example.test/pr/34' } };
    const api = async (path, method, body) => {
      calls.push({ path, method, body });
      if (path === `git/ref/heads/${epic.base}`) return { object: { sha: epic.baseSha } };
      if (path === 'pulls/34' && method !== 'PATCH') return { body: `<!-- lighthouse-implementation:${'a'.repeat(64)} -->`, head: { sha: 'created' }, base: { ref: epic.base } };
      return { sha: 'created', tree: { sha: 'tree' } };
    };
    const publish = () => createImplementationPullRequest(api, reviewed, [change], 'Updated', '', true, async () => calls.push({ path: 'before' }), async () => { calls.push({ path: 'after' }); if (revoked) throw Error('revoked'); });
    if (revoked) await assert.rejects(publish(), /revoked/); else await publish();
    assert.equal(calls.filter(call => call.path === 'pulls/34' && call.method === 'PATCH').length, revoked ? 0 : 1);
    assert.equal(calls.some(call => call.path === 'pulls' && call.method === 'POST'), false);
    assert.ok(calls.findIndex(call => call.path === 'after') > calls.findIndex(call => call.path.startsWith('git/refs/heads/')));
  }
});
