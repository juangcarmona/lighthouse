import test from 'node:test';
import assert from 'node:assert/strict';
import { productContextFixture, embedDraft } from './fixtures/product-context.mjs';
import { hash } from './fixtures/product-composition.mjs';
import { productWorkingContext } from '../packages/sdlc/src/product-context.mjs';
import { currentRetainedInventory, retainedInventory, composeRetainedProduct } from '../packages/sdlc/src/product-composition.mjs';
import { productEvidenceScopeText } from '../packages/sdlc/src/product-change.mjs';

test('large repeated history projects exact current documents once and keeps every decision and audit binding', () => {
  const { context, files, envelope } = productContextFixture(), original = JSON.stringify(context);
  const working = productWorkingContext(context, hash(original));
  const catalog = working.productChange.currentDocuments;
  assert.ok(Buffer.byteLength(original) > 256 * 1024);
  assert.ok(Buffer.byteLength(JSON.stringify(working)) < 64 * 1024);
  assert.deepEqual(catalog.measured, { objects: 64, paths: 64, bytes: 276250, references: 128, duplicateBytes: 276250 });
  assert.equal(catalog.paths.length, 64);
  assert.equal(working.productChange.audit.sha256, hash(original));
  assert.deepEqual(working.request, context.request);
  assert.equal(working.productChange.schemaPin, context.productChange.schemaPin);
  assert.equal(working.productChange.baselineDigest, context.productChange.baselineDigest);
  assert.match(working.issue.body, /^Keep the original unique requirement FR-ONE\./);
  assert.match(working.issue.ownerAnswers[0].body, /^Current decision: keep exact Unicode and every path; BR-ANSWER\./);
  assert.equal(working.continuation.question, context.continuation.question);
  assert.match(working.continuation.answer.body, /Original issue.ownerAnswers\[0\].body/);
  assert.equal(working.productChange.files, undefined);
  assert.doesNotMatch(JSON.stringify(working), /Exact UTF-8 text/);
  for (const path of catalog.paths) {
    assert.equal(path.current.revision, 2);
    assert.equal(path.history[0].revision, 1);
    for (const object of [path.current, ...path.history]) {
      const read = retainedInventory(context, { path: path.path, ...object.ref });
      assert.equal(read.content, files.find(file => file.path === path.path).content);
      assert.equal(hash(read.content), object.ref.sha256);
    }
  }
  const plan = catalog.paths.map(({ path, current, history }) => ({ path, selected: current.ref, omitted: history.map(object => object.ref) }));
  assert.deepEqual(composeRetainedProduct(context, { binding: catalog.binding, plan, envelope }).envelope.result.output.productChange.files, files);
  assert.equal(JSON.stringify(context), original);
});

test('explicit higher revisions replace only their paths, never unique earlier paths or prose decisions', () => {
  const { context, draft } = productContextFixture();
  const replacement = { ...structuredClone(draft), revision: 3, files: [structuredClone(draft.files[3])] };
  replacement.files[0].content += '\nExplicitly revised document.\n';
  replacement.files[0].sha256 = hash(replacement.files[0].content);
  context.issue.ownerAnswers.push({ body: `Earlier decision still applies. Conflicting decision needs resolution, not last-comment-wins.\n${embedDraft(replacement)}` });
  const working = productWorkingContext(context), catalog = working.productChange.currentDocuments;
  assert.equal(catalog.paths.length, 64);
  assert.equal(catalog.paths.find(path => path.path === replacement.files[0].path).current.revision, 3);
  assert.equal(catalog.paths[0].current.revision, 2);
  assert.match(working.issue.body, /original unique requirement/);
  assert.match(working.issue.ownerAnswers[0].body, /Current decision/);
  assert.match(working.issue.ownerAnswers[1].body, /Conflicting decision needs resolution/);
  context.issue.ownerAnswers.push({ body: 'Explicit current decision: supersedes the earlier Unicode decision only for the new artifact; retain all other decisions.' });
  const explicit = productWorkingContext(context);
  assert.equal(explicit.issue.ownerAnswers[2].body, context.issue.ownerAnswers[2].body);
  assert.match(explicit.issue.ownerAnswers[0].body, /Current decision/);
});

test('working projection refuses malformed, stale and ambiguous declarations without mutating authority', () => {
  for (const mutation of [
    f => { f.repeated.binding.sourceRevision = 'a'.repeat(40); },
    f => { f.repeated.binding.baselineDigest = 'a'.repeat(64); },
    f => { f.repeated.binding.schemaPinSha256 = 'a'.repeat(64); },
    f => { f.repeated.files[0].sha256 = 'a'.repeat(64); },
    f => { delete f.repeated.files[0].path; },
    f => { f.repeated.files[0].path = f.repeated.files[1].path; },
    f => { f.repeated.revision = 1; },
    f => { f.repeated.revision = null; },
    f => { f.repeated.supersedes = 'last arbitrary comment'; },
    f => { f.repeated.files = []; },
  ]) {
    const f = productContextFixture(); mutation(f);
    f.context.issue.ownerAnswers[0].body = embedDraft(f.repeated);
    const original = JSON.stringify(f.context);
    assert.throws(() => productWorkingContext(f.context));
    assert.equal(JSON.stringify(f.context), original);
  }
  for (const body of ['```json\n{"kind":"lighthouse-retained-product-draft/v1",\n```\n', '{"kind":"lighthouse-retained-product-draft/v1"}', '```json\n' + '['.repeat(65) + '"lighthouse-retained-product-draft/v1"' + ']'.repeat(65) + '\n```\n']) {
    const { context } = productContextFixture(); context.issue.body = body;
    assert.throws(() => productWorkingContext(context));
  }
});

test('reference projection separates input, nesting and unique-reference bounds without truncation', () => {
  assert.equal(productEvidenceScopeText({ body: 'FR-ONE FR-ONE', answers: ['BR-ANSWER'] }), 'FR-ONE\nBR-ANSWER');
  assert.equal(productEvidenceScopeText('λ'.repeat(1024 * 1024 - 4) + ' FR-ONE'), 'FR-ONE');
  assert.equal(productEvidenceScopeText('x'.repeat(2 * 1024 * 1024 - 7) + ' FR-ONE'), 'FR-ONE');
  assert.equal(Buffer.byteLength(productEvidenceScopeText('FR-' + 'A'.repeat(256 * 1024 - 3))), 256 * 1024);
  assert.throws(() => productEvidenceScopeText('FR-' + 'A'.repeat(256 * 1024 - 2)), /reference selection/);
  assert.throws(() => productEvidenceScopeText('λ'.repeat(1024 * 1024 + 1)), /input text/);
  assert.throws(() => productEvidenceScopeText(Array.from({ length: 30000 }, (_, i) => `FR-LONG-REFERENCE-${i}`).join(' ')), /reference selection/);
  let nested = 'FR-ONE'; for (let i = 0; i < 65; i++) nested = [nested];
  assert.throws(() => productEvidenceScopeText(nested), /nesting/);
  assert.equal(productEvidenceScopeText(nested[0]), 'FR-ONE');
  assert.throws(() => productEvidenceScopeText(Array(100001).fill(null)), /inventory/);
  const { context } = productContextFixture();
  context.issue.ownerAnswers.push({ body: 'x'.repeat(2 * 1024 * 1024) });
  assert.throws(() => currentRetainedInventory(context), /input text/);
});

test('admitted issue text has its own bound, independent of metadata and exact continuation copies', () => {
  const body = 'x'.repeat(2 * 1024 * 1024 - 7) + ' FR-ONE';
  assert.equal(productEvidenceScopeText({ issue: { title: 'BR-METADATA', body, ownerAnswers: [] }, parentEvidence: { gap: 'UC-PARENT' } }), 'BR-METADATA\nFR-ONE\nUC-PARENT');
  assert.throws(() => productEvidenceScopeText({ issue: { body, ownerAnswers: [{ body: 'x' }] } }), /authenticated input text/);
  const repeated = 'x'.repeat(1100000) + ' FR-ONE';
  assert.equal(productEvidenceScopeText({ issue: { body: repeated }, continuation: { answer: { body: repeated } } }), 'FR-ONE');
  assert.throws(() => productEvidenceScopeText({ issue: { body: repeated }, continuation: { body: 'x'.repeat(4 * 1024 * 1024) } }), /evidence input text/);
});

test('literal drafting keeps small input and short bodies cannot rewrite identity or unrelated prose', () => {
  const { context } = productContextFixture();
  context.issue.body = '1'; context.issue.ownerAnswers = [];
  delete context.continuation; delete context.answerHistory; delete context.productChange.parent;
  context.productChange.idea = 'A unique idea'; context.productChange.scope = 'A unique scope';
  const working = productWorkingContext(context);
  assert.equal(working.productChange.currentDocuments, null);
  assert.equal(working.issue.body, '1');
  assert.deepEqual(working.request, context.request);
  assert.equal(working.productChange.idea, 'A unique idea');
  assert.equal(working.productChange.scope, 'A unique scope');
  context.issue.body = 'x'.repeat(256 * 1024);
  assert.throws(() => productWorkingContext(context), /working context exceeds bounds/);
});

test('retained input text and declaration bounds remain inclusive and fail closed', () => {
  const { context } = productContextFixture();
  const inputBytes = Buffer.byteLength(context.issue.body) + Buffer.byteLength(context.issue.ownerAnswers[0].body);
  context.issue.body += 'x'.repeat(2 * 1024 * 1024 - inputBytes);
  assert.equal(currentRetainedInventory(context).measured.bytes, 276250);
  context.issue.body += 'x';
  assert.throws(() => currentRetainedInventory(context), /input text/);
  const f = productContextFixture();
  f.context.issue.ownerAnswers = Array.from({ length: 101 }, () => ({ body: '' }));
  assert.throws(() => productWorkingContext(f.context), /answer inventory/);
  f.context.issue.ownerAnswers = Array.from({ length: 8 }, (_, i) => ({ body: embedDraft({ ...f.draft, files: [f.draft.files[0]], revision: i + 2 }) }));
  // Each declaration is valid; nine declarations exceed the existing inventory bound.
  assert.throws(() => productWorkingContext(f.context), /document inventory/);
});

test('six admitted complete history revisions retain all references without replaying duplicate bodies', () => {
  const { context, draft } = productContextFixture();
  context.issue.ownerAnswers.push(...Array.from({ length: 4 }, (_, i) => ({ body: `Unique historical decision ${i} remains.\n${embedDraft({ ...draft, revision: i + 3 })}` })));
  const working = productWorkingContext(context), catalog = working.productChange.currentDocuments;
  assert.equal(catalog.measured.objects, 64);
  assert.equal(catalog.measured.references, 384);
  assert.equal(catalog.measured.duplicateBytes, 5 * 276250);
  assert.equal(catalog.measured.bytes, 276250);
  assert.equal(catalog.paths[0].current.revision, 6);
  for (let i = 0; i < 4; i++) assert.match(working.issue.ownerAnswers[i + 1].body, new RegExp(`Unique historical decision ${i} remains`));
});
