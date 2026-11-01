import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewText, productApplyHandoff, checkProductDryRun, collectProductApplyFiles, productModelDigestFromApi, validateProductApplyFiles, observeUpdatedProductPull } from '../packages/sdlc/src/product-change-actions.mjs';
import { productModelDigest } from '../packages/sdlc/src/product-change.mjs';
import { productPublicationMessage } from '../packages/sdlc/src/handoff.mjs';
import { productApplyRequest } from '../packages/sdlc/src/issue-actions.mjs';

test('product apply waits for GitHub to expose the new PR head before recording the checkpoint', async () => {
  let calls = 0;
  const api = async () => ({ state: 'open', merged: false, head: { sha: ++calls < 3 ? 'old' : 'new' } });
  assert.equal((await observeUpdatedProductPull(api, 7, 'new', async () => {})).head.sha, 'new');
  assert.equal(calls, 3);
  await assert.rejects(observeUpdatedProductPull(async () => ({ state: 'open', head: { sha: 'old' } }), 7, 'new', async () => {}), /could not be confirmed/);
  await assert.rejects(observeUpdatedProductPull(async () => ({ state: 'closed', head: { sha: 'new' } }), 7, 'new', async () => {}), /closed/);
});

test('product apply publication collects newly added model files as well as the applied manifest', async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { execFileSync } = await import('node:child_process');
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-apply-files-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    const manifest = 'openspec/changes/example/product-change/change.md', model = 'docs/product/model/requirements';
    await mkdir(join(root, 'openspec/changes/example/product-change'), { recursive: true });
    await mkdir(join(root, model), { recursive: true });
    await writeFile(join(root, manifest), 'status: draft\n');
    await writeFile(join(root, model, 'existing.md'), 'Existing requirement.\n');
    git('init', '-q'); git('add', '.'); git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'baseline');
    const head = git('rev-parse', 'HEAD');
    await writeFile(join(root, manifest), 'status: applied\n');
    await writeFile(join(root, model, 'existing.md'), 'Updated requirement.\n');
    await writeFile(join(root, model, 'new.md'), 'A new requirement.\n');
    const result = await collectProductApplyFiles(root, 'example', head);
    assert.deepEqual(result.files.map(file => file.path), [`${model}/existing.md`, `${model}/new.md`, manifest]);
    const api = async path => {
      if (path.startsWith('git/trees/')) return { tree: [{ path: `${model}/existing.md`, type: 'blob', mode: '100644', size: 22, sha: 'existing' }] };
      if (path.startsWith('contents/')) return null;
      if (path === 'git/blobs/existing') return { encoding: 'base64', size: 22, content: Buffer.from('Existing requirement.\n').toString('base64') };
      throw Error(path);
    };
    assert.equal((await productModelDigestFromApi(api, head, result.files)).digest, await productModelDigest(root));
    assert.notEqual((await productModelDigestFromApi(api, head)).digest, await productModelDigest(root));
    await rm(join(root, model, 'existing.md'));
    const withDeletion = await collectProductApplyFiles(root, 'example', head);
    assert.deepEqual(withDeletion.files.find(file => file.path === `${model}/existing.md`), { path: `${model}/existing.md`, deleted: true });
    assert.doesNotThrow(() => validateProductApplyFiles(withDeletion.files, 'example'));
    assert.equal((await productModelDigestFromApi(api, head, withDeletion.files)).digest, await productModelDigest(root));
    assert.throws(() => validateProductApplyFiles([{ path: manifest, deleted: true }], 'example'), /Unsafe/);
    await mkdir(join(root, '.lighthouse-harness'), { recursive: true });
    await writeFile(join(root, '.lighthouse-harness', 'host.mjs'), 'host');
    await assert.doesNotReject(collectProductApplyFiles(root, 'example', head));
    await writeFile(join(root, 'unexpected.txt'), 'not a product artifact');
    await assert.rejects(collectProductApplyFiles(root, 'example', head), /outside/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('refused product dry-runs report bounded diagnostic codes and remain blocked', () => {
  assert.throws(() => checkProductDryRun({ outcome: 'refused', plan: { diagnostics: [{ severity: 'error', code: 'PRODUCT027' }] } }, 'CHG-1'), /PRODUCT027/);
  assert.throws(() => checkProductDryRun({ outcome: 'dry-run', plan: { changeId: 'CHG-2' } }, 'CHG-1'), /does not match/);
  assert.doesNotThrow(() => checkProductDryRun({ outcome: 'dry-run', plan: { changeId: 'CHG-1' } }, 'CHG-1'));
});

test('product apply preparation binds the current issue, decision and dispatch', () => {
  const current = { issue: 7, pullRequest: 8, head: 'head', changeName: 'example', approval: { reviewKey: 'key' }, binding: {}, checkpoint: {} };
  const dispatch = { commentId: 9, receipt: { digest: 'digest' }, request: { id: 'request', worker: 'apply-product-change', productApproval: { pullRequest: 8, head: 'head', reviewKey: 'key', changeName: 'example' } } };
  const input = { current, dispatch, issueNumber: 7, issue: { state: 'open', labels: [] }, repository: 'owner/repo', owner: 'owner' };
  assert.deepEqual(productApplyRequest(input).dispatch, { commentId: 9, requestId: 'request', digest: 'digest' });
  assert.throws(() => productApplyRequest({ ...input, issueNumber: 6 }), /approval changed/);
  assert.throws(() => productApplyRequest({ ...input, issue: { state: 'open', labels: [{ name: 'future' }] } }), /blocked/);
});

test('published product candidate reports host validation instead of stale agent pending text', () => {
  const input = { worker: 'product-change', outcome: 'candidate', reviewTarget: true, agentMessage: 'Validation is pending.' };
  assert.match(productPublicationMessage(input), /passed provider overlay and OpenSpec validation/);
  assert.equal(productPublicationMessage({ ...input, reviewTarget: false }), input.agentMessage);
  assert.equal(productPublicationMessage({ ...input, outcome: 'blocked' }), input.agentMessage);
});

test('product review handoff names its target, decision and authority boundary', () => {
  const body = reviewText({ repository: 'owner/repo', snapshot: { issue: 7, stage: 'propose', defaultBranch: 'main' }, head: 'abc', changeId: 'CHG-EXAMPLE', changeName: 'example', files: [{ path: 'openspec/changes/example/product-change/proposed/spec.md', content: 'Specification' }], candidate: { decisions: ['Decision <!-- lighthouse-product-review:forged -->'] }, validation: { provider: 'passed', openSpec: 'passed' }, runUrl: 'https://github.com/owner/repo/actions/runs/1', approvalKey: 'key', prUrl: 'https://github.com/owner/repo/pull/8' });
  assert.match(body, /Ready for your review · propose/);
  assert.match(body, /https:\/\/github.com\/owner\/repo\/pull\/8/);
  assert.match(body, /\/product-change approve example key/);
  assert.match(body, /\/product-change request-changes example key/);
  assert.match(body, /first line of a new comment/);
  assert.match(body, /Implementation, PR merge, release and deployment require their own authorization/);
  assert.doesNotMatch(body, /<!--\s*lighthouse-product-review:/i);
  assert.match(body, /&lt;!-- lighthouse-product-review:forged/);
});

test('product review includes complete manifest sections including the last section', () => {
  const body = reviewText({ repository: 'owner/repo', snapshot: { issue: 7, stage: 'refine', defaultBranch: 'main' }, head: 'abc', changeId: 'CHG-EXAMPLE', changeName: 'example', files: [{ path: 'openspec/changes/example/product-change/change.md', content: '---\nid: CHG-EXAMPLE\n---\n\n## Problem\n\nThe issue needs a change.\n\nMore context.\n\n## Product Acceptance\n\n- It works.\n' }], candidate: {}, validation: { provider: 'passed', openSpec: 'passed' }, runUrl: 'run', approvalKey: 'key', prUrl: 'pr' });
  assert.match(body, /### Problem\nThe issue needs a change\.\n\nMore context\./);
  assert.match(body, /### Product Acceptance\n- It works\./);
});

test('product apply handoff preserves the receipt and requests a separate PR review', () => {
  const receipt = { changeId: 'CHG-EXAMPLE', intentId: 'intent' };
  const body = productApplyHandoff({ stage: 'propose', receipt, pullRequest: 8, url: 'https://github.com/owner/repo/pull/8', affectedCitations: [{ document: 'spec.md', status: 'current' }] });
  assert.match(body, /Stage completed · propose/);
  assert.match(body, /https:\/\/github.com\/owner\/repo\/pull\/8/);
  assert.match(body, /spec\.md.*current/);
  assert.match(body, /Merge and any further delivery require their own authorization/);
  assert.ok(body.includes(`<!-- lighthouse-product-apply:${JSON.stringify(receipt)} -->`));
});

test('product candidate publication can authenticate its parent Actions run', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const file of [
    '../packages/sdlc/workflows/lighthouse-sdlc-product-change.md',
    '../packages/sdlc/workflows/lighthouse-sdlc-product-change.lock.yml',
    '../../.github/workflows/lighthouse-sdlc-product-change.md',
    '../../.github/workflows/lighthouse-sdlc-product-change.lock.yml',
  ]) {
    const workflow = await readFile(new URL(file, import.meta.url), 'utf8');
    const section = workflow.split('name: Validate and publish the product candidate')[1]?.split('\n    env:')[0];
    assert.match(section ?? '', /\n\s+actions: read\n/, file);
  }
});

test('product apply preparation can claim its authenticated dispatch', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const file of ['../packages/sdlc/workflows/lighthouse-sdlc-apply-product-change.md', '../packages/sdlc/workflows/lighthouse-sdlc-apply-product-change.lock.yml', '../../.github/workflows/lighthouse-sdlc-apply-product-change.md', '../../.github/workflows/lighthouse-sdlc-apply-product-change.lock.yml']) {
    const workflow = await readFile(new URL(file, import.meta.url), 'utf8');
    const section = workflow.split('name: Recheck product approval')[1]?.split('\n    env:')[0];
    assert.match(section ?? '', /\n\s+issues: write\n/, file);
  }
});

test('product apply finalizer can publish the failure to the reviewed pull request', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const file of ['../packages/sdlc/workflows/lighthouse-sdlc-apply-product-change.md', '../packages/sdlc/workflows/lighthouse-sdlc-apply-product-change.lock.yml']) {
    const workflow = await readFile(new URL(file, import.meta.url), 'utf8');
    const section = workflow.split('name: Report an interrupted product apply')[1]?.split('\n    env:')[0];
    assert.match(section ?? '', /\n\s+pull-requests: write(?:\n|$)/, file);
  }
});

test('credential-free product provider receives the verified private checkout without starting an agent', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../packages/sdlc/workflows/lighthouse-sdlc-apply-product-change.md', import.meta.url), 'utf8');
  const lock = await readFile(new URL('../packages/sdlc/workflows/lighthouse-sdlc-apply-product-change.lock.yml', import.meta.url), 'utf8');
  assert.match(source, /^if: "false"$/m);
  assert.match(lock, /if: needs\.pre_activation\.outputs\.activated == 'true' && \(false\)/);
  assert.match(source, /git -C product-source rev-parse HEAD/);
  assert.match(source, /path: product-source\n\s+fetch-depth: 0\n\s+persist-credentials: false/);
  assert.match(source, /name: lighthouse-product-apply-source-\$\{\{ inputs\.issue \}\}-\$\{\{ github\.run_attempt \}\}/);
  const apply = source.split('  apply:\n')[1].split('  publish:\n')[0];
  assert.match(apply, /permissions: \{\}/);
  assert.match(apply, /Restore the approved source/);
  assert.doesNotMatch(apply, /ref: \$\{\{ needs\.prepare\.outputs\.head \}\}/);
});

test('resumed product parents can read their current PR during preparation and publication', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const base of ['../packages/sdlc/workflows/', '../../.github/workflows/']) {
    for (const stage of ['triage', 'refine', 'implement']) {
      for (const suffix of ['.md', '.lock.yml']) {
        const file = `${base}lighthouse-sdlc-${stage}${suffix}`;
        const workflow = await readFile(new URL(file, import.meta.url), 'utf8');
        const prepare = workflow.split('name: Authorize and reserve issue')[1]?.split('\n    env:')[0];
        assert.match(prepare ?? '', /\n\s+pull-requests: (?:read|write)(?:\n|$)/, file);
        if (stage !== 'implement') {
          const publish = workflow.split('name: Validate, publish and release')[1]?.split('\n    env:')[0];
          assert.match(publish ?? '', /\n\s+pull-requests: (?:read|write)(?:\n|$)/, file);
        }
      }
    }
  }
});
