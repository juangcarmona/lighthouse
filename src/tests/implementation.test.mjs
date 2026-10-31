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
  const api = async (path, method, body) => { calls.push({ path, method, body }); return path === 'pulls/34' && method !== 'PATCH' ? { head: { sha: request.sourceRevision }, body: `<!-- lighthouse-implementation:${'a'.repeat(64)} -->` } : { sha: 'created', tree: { sha: 'tree' } }; };
  const reviewed = { ...request, implementationReview: { number: 34, branch: 'lighthouse/implement-18-aaaaaaaaaaaa', url: 'https://example.test/pr/34' } };
  const pr = await createImplementationPullRequest(api, reviewed, [change], 'Updated', '', false, async () => calls.push({ path: 'recheck' }));
  assert.equal(pr.number, 34);
  assert.deepEqual(calls.find(c => c.path === 'git/refs/heads/lighthouse/implement-18-aaaaaaaaaaaa'), { path: 'git/refs/heads/lighthouse/implement-18-aaaaaaaaaaaa', method: 'PATCH', body: { sha: 'created', force: false } });
  assert.match(calls.at(-1).body.body, /Refs #18/);
  assert.doesNotMatch(calls.at(-1).body.body, /Closes #18/);
  assert.equal(calls.some(c => c.path === 'pulls'), false);
  assert.ok(calls.findIndex(c => c.path === 'recheck') < calls.findIndex(c => c.path === 'git/refs/heads/lighthouse/implement-18-aaaaaaaaaaaa'));
});

test('an approved product prerequisite resumes on its existing branch and retains review evidence', async () => {
  const repository = 'owner/repo', head = request.sourceRevision, after = 'c'.repeat(40), intent = 'd'.repeat(64);
  const parent = { issue: 18, stage: 'implement', predecessor: { runId: '200', attempt: 1 }, gap: { summary: 'Missing intent', scope: 'Issue scope' }, sourceRevision: 'e'.repeat(40), baseRevision: 'e'.repeat(40), taskDigest: 'f'.repeat(64), autoImplement: false };
  const checkpoint = { schemaVersion: 1, kind: 'checkpoint', identity: { repository, issue: 18, parentRunId: '200', authorizationDigest: '1'.repeat(64), policyDigest: '2'.repeat(64), workflowRevision: '3'.repeat(40), head }, requestDigest: '4'.repeat(64), changeName: 'example', changeId: 'CHG-EXAMPLE', proposalDigest: '5'.repeat(64), baselineDigest: '6'.repeat(64), state: 'applied', effectIds: [`apply:${intent}:${head}`], parent };
  const branch = 'lighthouse/implement-18-aaaaaaaaaaaa';
  const resume = { issue: 18, parent, pullRequest: 34, head, branch, receiptIntent: intent };
  const productPr = { number: 34, state: 'open', merged: false, draft: true, user: { login: 'github-actions[bot]', type: 'Bot' }, head: { sha: head, ref: branch, repo: { full_name: repository } }, base: { ref: 'main', repo: { full_name: repository } }, html_url: 'https://example.test/pr/34', body: `Product decision retained.\n<!-- lighthouse-product-change:{"changeId":"CHG-EXAMPLE"} -->\n<!-- lighthouse-product-change-checkpoint:${JSON.stringify(checkpoint)} -->` };
  const calls = [];
  const api = async (path, method, body) => { calls.push({ path, method, body }); if (path === 'pulls/34' && method !== 'PATCH') return productPr; if (path === 'git/commits' && method === 'POST') return { sha: after }; return { sha: 'blob', tree: { sha: 'tree' } }; };
  const result = await createImplementationPullRequest(api, { ...request, repository, productResume: resume }, [change], 'Implemented the bounded issue.', 'https://example.test/run', true, async () => {});
  assert.equal(result.number, 34);
  assert.deepEqual(calls.find(call => call.path === `git/refs/heads/${branch}`).body, { sha: after, force: false });
  assert.equal(calls.some(call => call.path === 'pulls' || call.path === 'git/refs'), false);
  const body = calls.find(call => call.path === 'pulls/34' && call.method === 'PATCH').body.body;
  assert.match(body, /Product decision retained/);
  const { checkImplementationPullRequest } = await import('../packages/sdlc/src/proposal-review.mjs');
  assert.equal(checkImplementationPullRequest({ ...productPr, head: { ...productPr.head, sha: after }, body }, repository).issue, 18);
  assert.throws(() => checkImplementationPullRequest({ ...productPr, head: { ...productPr.head, sha: '9'.repeat(40) }, body }, repository));
  const staleWithLegacyMarker = `${body}\n<!-- lighthouse-implementation:${'a'.repeat(64)} -->`;
  assert.throws(() => checkImplementationPullRequest({ ...productPr, head: { ...productPr.head, sha: '9'.repeat(40) }, body: staleWithLegacyMarker }, repository));
  const correctedHead = '7'.repeat(40), reviewCalls = [];
  const reviewedPr = { ...productPr, head: { ...productPr.head, sha: after }, body };
  const reviewApi = async (path, method, payload) => { reviewCalls.push({ path, method, body: payload }); if (path === 'pulls/34' && method !== 'PATCH') return reviewedPr; if (path === 'git/commits' && method === 'POST') return { sha: correctedHead }; return { sha: 'blob', tree: { sha: 'tree' } }; };
  await createImplementationPullRequest(reviewApi, { ...request, repository, sourceRevision: after, implementationReview: { number: 34, branch, url: productPr.html_url } }, [change], 'Reviewed correction.', 'https://example.test/review-run', true, async () => {});
  const correctedBody = reviewCalls.find(call => call.path === 'pulls/34' && call.method === 'PATCH').body.body;
  assert.equal(checkImplementationPullRequest({ ...reviewedPr, head: { ...reviewedPr.head, sha: correctedHead }, body: correctedBody }, repository).issue, 18);
  assert.match(correctedBody, /Product decision retained/);
  productPr.head.sha = '9'.repeat(40);
  await assert.rejects(createImplementationPullRequest(api, { ...request, repository, productResume: resume }, [change], 'Implemented.', '', true, async () => {}), /changed/);
});
