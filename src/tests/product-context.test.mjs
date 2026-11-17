import test from 'node:test';
import assert from 'node:assert/strict';
import { productContextFixture, combinedHistoryFixture, singleLineHistoryFixture, embedDraft, embedLiteralFiles, embedMarkdownFile } from './fixtures/product-context.mjs';
import { hash } from './fixtures/product-composition.mjs';
import { productWorkingContext, inspectRetainedAnswer } from '../packages/sdlc/src/product-context.mjs';
import { bindRetainedCopies, currentRetainedInventory, retainedInventory, composeRetainedProduct, historicalMarkdown } from '../packages/sdlc/src/product-composition.mjs';
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

test('review reproduction: earlier literal JSON inventories bind exact bytes without acquiring revision authority', () => {
  const { context, files, envelope } = productContextFixture();
  context.issue.ownerAnswers.push({ body: `Keep this distinct historical decision.\n${embedLiteralFiles(files)}\nKeep the decision after the inventory too.` });
  const original = JSON.stringify(context), working = productWorkingContext(context, hash(original));
  assert.ok(Buffer.byteLength(context.issue.ownerAnswers[1].body) > 256 * 1024);
  assert.ok(Buffer.byteLength(JSON.stringify(working)) < 256 * 1024);
  assert.equal(working.issue.ownerAnswers[1].body, 'Keep this distinct historical decision.\n[Exact historical copy issue.ownerAnswers[1].body#json-0; inspect historicalCopies and currentDocuments and the read-only audit input for exact content. No decision or revision authority is implied.]\n\nKeep the decision after the inventory too.');
  assert.deepEqual(working.request, context.request);
  assert.equal(working.productChange.audit.sha256, hash(original));
  assert.equal(working.productChange.historicalCopies[0].files.length, 64);
  const catalog = working.productChange.currentDocuments;
  assert.equal(catalog.measured.references, 128);
  for (const alias of working.productChange.historicalCopies[0].files) {
    const expected = files.find(file => file.path === alias.path);
    assert.equal(alias.sha256, hash(expected.content));
    for (const source of alias.sources) assert.equal(retainedInventory(context, { path: alias.path, sha256: alias.sha256, source }).content, expected.content);
  }
  const plan = catalog.paths.map(({ path, current, history }) => ({ path, selected: current.ref, omitted: history.map(item => item.ref) }));
  const composed = composeRetainedProduct(context, { binding: catalog.binding, plan, envelope }).envelope.result.output.productChange.files;
  assert.deepEqual(composed, files);
  assert.deepEqual(composed.map(file => [file.path, file.content, hash(file.content)]), files.map(file => [file.path, file.content, hash(file.content)]));
  assert.equal(JSON.stringify(context), original);
});

test('recoverable Markdown copies preserve interleaved decisions and exact newline identities', () => {
  const { context, files } = productContextFixture();
  context.issue.ownerAnswers.push({ body: 'Before.\n' + files.map((file, i) => `${embedMarkdownFile(file)}Decision ${i} remains.\n`).join('') + 'After.' });
  const original = JSON.stringify(context), working = productWorkingContext(context);
  assert.ok(Buffer.byteLength(JSON.stringify(working)) < 256 * 1024);
  assert.equal(working.productChange.historicalCopies.length, 64);
  for (let i = 0; i < files.length; i++) {
    assert.ok(working.issue.ownerAnswers[1].body.includes(`Decision ${i} remains.\n`));
    assert.equal(working.productChange.historicalCopies[i].files[0].sha256, hash(files[i].content));
  }
  assert.match(working.issue.ownerAnswers[1].body, /^Before\.\n/);
  assert.match(working.issue.ownerAnswers[1].body, /After\.$/);
  assert.equal(JSON.stringify(context), original);
});

test('literal aliases retain older unique paths, explicit replacements and conflicting prose decisions', () => {
  const { context, draft, repeated, files } = productContextFixture();
  repeated.files.pop();
  context.issue.ownerAnswers[0].body = `Current decision remains.\n${embedDraft(repeated)}`;
  context.continuation.answer.body = context.issue.ownerAnswers[0].body;
  context.answerHistory[0].answer.body = context.issue.ownerAnswers[0].body;
  const revised = { ...structuredClone(draft), revision: 3, files: [structuredClone(draft.files[3])] };
  revised.files[0].content += '\nRevised explicitly.\n'; revised.files[0].sha256 = hash(revised.files[0].content);
  context.issue.ownerAnswers.push({ body: `Explicitly supersede only this document, not the prior decisions.\n${embedDraft(revised)}` });
  context.issue.ownerAnswers.push({ body: `Conflicting older decision still needs resolution.\n${embedLiteralFiles(files)}` });
  const working = productWorkingContext(context), catalog = working.productChange.currentDocuments;
  assert.equal(catalog.paths.length, 64);
  assert.equal(catalog.paths[3].current.revision, 3);
  assert.equal(catalog.paths[4].current.revision, 2);
  assert.equal(catalog.paths.at(-1).current.revision, 1);
  assert.deepEqual(working.productChange.historicalCopies[0].files[3].sources, ['issue.body#json-0', 'issue.ownerAnswers[0].body#json-0']);
  assert.match(working.issue.ownerAnswers[2].body, /^Conflicting older decision still needs resolution\./);
  assert.match(working.issue.ownerAnswers[1].body, /^Explicitly supersede only this document, not the prior decisions\./);
});

test('unbound, malformed and ambiguous literal inventories refuse without altering original inputs', () => {
  for (const build of [
    files => embedLiteralFiles([{ ...files[3], path: '../unsafe.md' }]),
    files => embedLiteralFiles([{ ...files[3], content: '\0' }]),
    files => embedLiteralFiles([{ ...files[3], sha256: 'a'.repeat(64) }]),
    files => embedLiteralFiles([{ ...files[3], mode: '100600' }]),
    files => embedLiteralFiles([files[3], files[3]]),
    files => embedLiteralFiles([{ ...files[3], decision: 'Do not discard this.' }]),
    files => '```json\n{"files":' + JSON.stringify(files) + ',"files":[]}\n```\n',
    files => '```json\n{"decision":"one","files":' + JSON.stringify([files[3]]) + ',"decision":"two"}\n```\n',
    () => '```json\n{"files": [\n```\n',
    () => embedLiteralFiles([]),
    files => embedMarkdownFile({ ...files[3], path: files[3].path.replace('/product-change/proposed/', '/not-allowed/') }),
    files => embedMarkdownFile(files[3]) + embedMarkdownFile(files[3]),
  ]) {
    const { context, files } = productContextFixture();
    context.issue.ownerAnswers.push({ body: build(files) });
    const original = JSON.stringify(context);
    assert.throws(() => productWorkingContext(context), /historical|composition JSON/);
    assert.equal(JSON.stringify(context), original);
  }
});

test('Markdown recovery refuses when a structural newline could select different retained bytes', () => {
  const { context, draft, files } = productContextFixture();
  const replacement = { ...structuredClone(draft), revision: 3, files: [structuredClone(draft.files.at(-1))] };
  replacement.files[0].content += '\n'; replacement.files[0].sha256 = hash(replacement.files[0].content);
  context.issue.ownerAnswers.push({ body: embedDraft(replacement) });
  context.issue.ownerAnswers.push({ body: embedMarkdownFile(files.at(-1)) });
  assert.throws(() => productWorkingContext(context), /ambiguous historical.*explicitly bound/);
});

test('literal aliases retain existing reference, file inventory and unique-prose limits, not typed declaration slots', () => {
  const { context, files, draft, repeated } = productContextFixture();
  for (const file of files) file.content = file.content.replace(/Exact UTF-8 text:[\s\S]*/, 'Small retained body.\n');
  draft.files = files.map(file => ({ ...file, sha256: hash(file.content) }));
  repeated.files = structuredClone(draft.files);
  context.issue.body = embedDraft(draft); context.issue.ownerAnswers[0].body = embedDraft(repeated);
  delete context.continuation; delete context.answerHistory; delete context.productChange.parent;
  context.productChange.idea = 'Boundaries'; context.productChange.scope = 'Boundaries';
  context.issue.ownerAnswers.push(...Array.from({ length: 6 }, () => ({ body: embedLiteralFiles(files) })));
  assert.equal(productWorkingContext(context).productChange.historicalCopies.length, 6);
  context.issue.ownerAnswers[6].body = embedLiteralFiles([...files, { ...files[0], path: 'unknown' }]);
  assert.throws(() => productWorkingContext(context), /historical/);
  context.issue.ownerAnswers[6].body = embedLiteralFiles(files);
  context.issue.ownerAnswers.push({ body: embedLiteralFiles([files[0]]) });
  assert.throws(() => productWorkingContext(context), /reference inventory/);
  const f = productContextFixture();
  f.context.issue.ownerAnswers.push({ body: embedLiteralFiles(f.files) });
  f.context.issue.body += 'Unique decision. '.repeat(20000);
  assert.throws(() => productWorkingContext(f.context), /working context exceeds bounds/);
});

test('untagged prose and unrelated JSON stay verbatim and cannot create a retained catalog', () => {
  const { context, files } = productContextFixture();
  const prose = `An arbitrary path ${files[3].path} is not a binding.\n${embedDraft({ decision: files[3].content })}`;
  context.issue.ownerAnswers.push({ body: prose });
  assert.equal(productWorkingContext(context).issue.ownerAnswers[1].body, prose);
  context.issue.body = 'Literal drafting'; context.issue.ownerAnswers = [{ body: embedLiteralFiles([files[0]]) }];
  delete context.continuation; delete context.answerHistory; delete context.productChange.parent;
  context.productChange.idea = 'Literal drafting'; context.productChange.scope = 'Literal drafting';
  const working = productWorkingContext(context);
  assert.equal(working.productChange.currentDocuments, null);
  assert.equal(working.issue.ownerAnswers[0].body, context.issue.ownerAnswers[0].body);
});

test('Markdown structural CRLF recovery preserves content bytes without normalizing documents', () => {
  const { context, files } = productContextFixture();
  const file = files.at(-1);
  context.issue.ownerAnswers.push({ body: `Before.\r\n### \`${file.path}\`\r\n\x60\x60\x60text\r\n${file.content}\r\n\x60\x60\x60\r\nAfter.` });
  const working = productWorkingContext(context);
  assert.equal(working.productChange.historicalCopies[0].files[0].sha256, hash(file.content));
  assert.ok(working.issue.ownerAnswers[1].body.startsWith(`Before.\r\n### \`${file.path}\`\r\n`));
  assert.ok(working.issue.ownerAnswers[1].body.endsWith('\nAfter.'));
  context.issue.ownerAnswers[1].body = embedMarkdownFile({ ...file, content: file.content.replaceAll('\n', '\r\n') });
  const distinct = productWorkingContext(context).productChange.historicalCopies[0].files[0];
  assert.equal(distinct.historicalOnly, true);
  assert.equal(distinct.sha256, hash([...context.issue.ownerAnswers[1].body.matchAll(historicalMarkdown)][0][2]));
});

test('literal aliases can bind the existing host file route without adding revisions', () => {
  const { context, files } = productContextFixture();
  context.productChange.files = files;
  context.issue.body = 'Host retained files only.';
  context.issue.ownerAnswers = [{ body: embedLiteralFiles(files) }];
  delete context.continuation; delete context.answerHistory; delete context.productChange.parent;
  context.productChange.idea = 'Host retained files only.'; context.productChange.scope = context.issue.body;
  const working = productWorkingContext(context);
  assert.equal(working.productChange.currentDocuments.paths[0].current.revision, 0);
  assert.deepEqual(working.productChange.historicalCopies[0].files[0].sources, ['productChange.files']);
});

test('combined mixed histories preserve metadata, exact current composition and every audit document without typed admission', () => {
  const { context, files, envelope, metadata, mixedIndex, olderFiles, markdownFile } = combinedHistoryFixture();
  const original = JSON.stringify(context), working = productWorkingContext(context, hash(original));
  const catalog = working.productChange.currentDocuments;
  assert.ok(Buffer.byteLength(JSON.stringify(working)) < 256 * 1024);
  assert.equal(working.productChange.audit.sha256, hash(original));
  assert.equal(catalog.paths.length, 64);
  assert.equal(catalog.measured.references, 176);
  assert.deepEqual(working.request, context.request);
  for (let i = 0; i < 3; i++) assert.match(working.issue.ownerAnswers[i + 1].body, new RegExp(`Typed shard decision ${i}`));
  for (let i = 0; i < 9; i++) assert.match(working.issue.ownerAnswers[i + 4].body, new RegExp(`Alias decision ${i}`));
  const raw = context.issue.ownerAnswers[mixedIndex].body.match(/```json\n([\s\S]*?)\n```/)[1];
  const projected = working.issue.ownerAnswers[mixedIndex].body.match(/```json\n([\s\S]*?)\n```/)[1];
  const value = JSON.parse(projected), { files: reference, ...remaining } = value;
  assert.deepEqual(remaining, metadata);
  assert.match(reference, /historicalCopies/);
  // All original bytes outside the files value survive, not just a model summary.
  assert.equal(projected.replace(JSON.stringify(reference), 'FILES'), raw.replace(JSON.stringify(files), 'FILES'));
  assert.match(working.issue.ownerAnswers[mixedIndex].body, /^Preserve this decision\./);
  assert.match(working.issue.ownerAnswers[mixedIndex].body, /Preserve the later decision\.$/);
  assert.match(working.issue.ownerAnswers[mixedIndex + 1].body, /Keep older obligations/);
  assert.match(working.issue.ownerAnswers[mixedIndex + 2].body, /Keep the Markdown obligation/);
  assert.match(working.issue.ownerAnswers[mixedIndex + 2].body, /Keep the last obligation/);
  for (const copy of working.productChange.historicalCopies) {
    const [, answer, type, index] = /^issue\.ownerAnswers\[(\d+)\]\.body#(json|markdown)-(\d+)$/.exec(copy.source);
    const body = JSON.parse(original).issue.ownerAnswers[Number(answer)].body;
    const blocks = [...body.matchAll(type === 'json' ? /^```json\n([\s\S]*?)^```$/gm : historicalMarkdown)];
    for (const file of copy.files) {
      assert.equal(file.audit.source, copy.source);
      const content = type === 'json' ? JSON.parse(blocks[Number(index)][1]).files[file.audit.fileIndex].content : blocks[Number(index)][2];
      assert.equal(hash(content), file.audit.sha256);
      assert.equal(Buffer.byteLength(content), file.audit.bytes);
      if (file.historicalOnly) {
        assert.deepEqual(file.sources, []);
        assert.equal(file.sha256, hash(content));
        assert.throws(() => retainedInventory(context, { path: file.path, source: copy.source, sha256: file.sha256 }), /Unknown retained/);
      } else for (const source of file.sources) assert.equal(hash(retainedInventory(context, { path: file.path, source, sha256: file.sha256 }).content), file.sha256);
    }
  }
  const onlyHistorical = working.productChange.historicalCopies.flatMap(copy => copy.files).filter(file => file.historicalOnly);
  assert.deepEqual(onlyHistorical.map(file => [file.path, file.sha256]), [...olderFiles, markdownFile].map(file => [file.path, hash(file.content)]));
  assert.ok(!catalog.paths.some(item => item.path === olderFiles[1].path));
  const plan = catalog.paths.map(({ path, current, history }) => ({ path, selected: current.ref, omitted: history.map(item => item.ref) }));
  const composed = composeRetainedProduct(context, { binding: catalog.binding, plan, envelope }).envelope.result.output.productChange.files;
  assert.deepEqual(composed.map(file => [file.path, file.content, hash(file.content)]), files.map(file => [file.path, file.content, hash(file.content)]));
  plan[3].selected = { source: working.productChange.historicalCopies.at(-2).source, sha256: hash(olderFiles[0].content) };
  assert.throws(() => composeRetainedProduct(context, { binding: catalog.binding, plan, envelope }), /Unknown.*reference/);
  assert.equal(JSON.stringify(context), original);
});

test('historical binding refuses fabricated sources and changed copies with precise locations', () => {
  const { context, files } = productContextFixture();
  context.issue.ownerAnswers.push({ body: embedLiteralFiles([files[3]]) });
  const copy = { source: 'issue.ownerAnswers[1].body#json-0', inventory: 'same', files: [files[3]] };
  assert.equal(bindRetainedCopies(context, [copy])[0].files[0].historicalOnly, false);
  for (const mutation of [
    { source: 'issue.ownerAnswers[99].body#json-0' },
    { source: 'issue.ownerAnswers[1].body#json-9' },
    { markdown: true },
    { files: [{ ...files[3], content: 'Forged copy' }] },
  ]) assert.throws(() => bindRetainedCopies(context, [{ ...copy, ...mutation }]), /historical.*issue\.ownerAnswers/);
});

test('mixed JSON projection preserves field order, whitespace, escaped keys and every non-file value', () => {
  for (const position of ['first', 'middle', 'last']) {
    const { context, files } = productContextFixture();
    const inventory = JSON.stringify([files[3]]);
    const fields = ['"nested": {"files": ["a decision, not an inventory"], "status":"unapproved"}', '"approval":false'];
    fields.splice({ first: 0, middle: 1, last: 2 }[position], 0, '"f\\u0069les" : ' + inventory);
    const raw = '{\r\n  ' + fields.join(',\r\n  ') + '\r\n}';
    context.issue.ownerAnswers.push({ body: 'Before.\r\n```json\r\n' + raw + '\r\n```\r\nAfter.' });
    const before = JSON.stringify(context);
    const body = productWorkingContext(context).issue.ownerAnswers[1].body;
    const projected = body.match(/```json\r\n([\s\S]*?)\r\n```/)[1];
    const result = JSON.parse(projected);
    assert.deepEqual(result.nested, { files: ['a decision, not an inventory'], status: 'unapproved' });
    assert.equal(result.approval, false);
    assert.equal(projected.replace(JSON.stringify(result.files), 'FILES'), raw.replace(inventory, 'FILES'));
    assert.ok(body.startsWith('Before.\r\n'));
    assert.ok(body.endsWith('\r\nAfter.'));
    assert.equal(JSON.stringify(context), before);
  }
});

test('overflow-only whole-answer transport preserves exhaustive combined history and exact current composition', () => {
  const { context, files, envelope, metadata, mixedIndex, decisionStart } = combinedHistoryFixture({ decisionHistoryBytes: 320 * 1024 });
  context.issue.ownerAnswers.push({ body: '', author: 'empty-answer' }, { body: null, note: 'No body supplied' }, { note: 'Absent body' });
  context.request.authorizationDigest = '9'.repeat(64);
  const original = JSON.stringify(context), audit = JSON.parse(original);
  const working = productWorkingContext(context, hash(original)), history = working.productChange.historyIndex;
  assert.ok(Buffer.byteLength(original) < 4 * 1024 * 1024);
  assert.ok(Buffer.byteLength(context.issue.body) + context.issue.ownerAnswers.reduce((sum, answer) => sum + Buffer.byteLength(answer.body ?? ''), 0) < 2 * 1024 * 1024);
  assert.ok(context.issue.ownerAnswers.slice(decisionStart).reduce((sum, answer) => sum + Buffer.byteLength(answer.body ?? ''), 0) >= 320 * 1024);
  assert.ok(Buffer.byteLength(JSON.stringify(working)) < 256 * 1024);
  assert.equal(history.totalAnswers, context.issue.ownerAnswers.length);
  assert.equal(history.answers.length, context.issue.ownerAnswers.length - 2);
  assert.equal(working.productChange.audit.sha256, hash(original));
  assert.deepEqual(history.binding, working.productChange.currentDocuments.binding);
  assert.deepEqual(working.request, context.request);
  for (const key of ['baselineDigest', 'schemaPin']) assert.equal(working.productChange[key], context.productChange[key]);
  assert.match(working.issue.body, /^Keep the original unique requirement FR-ONE\./);
  assert.match(history.authority, /unread, not reviewed/);
  assert.match(working.contract.rules, /inspect its decisions before resolving relevant product decisions/);
  assert.equal(new Set(history.answers.map(reference => reference.source)).size, history.answers.length);
  for (const [i, answer] of context.issue.ownerAnswers.entries()) {
    const { body: _originalBody, ...metadata } = answer, { body: _workingBody, ...workingMetadata } = working.issue.ownerAnswers[i];
    assert.deepEqual(workingMetadata, metadata);
    const reference = history.answers.find(item => item.source === `issue.ownerAnswers[${i}].body`);
    if (typeof answer.body !== 'string') {
      assert.equal(reference, undefined);
      assert.deepEqual(working.issue.ownerAnswers[i], answer);
      continue;
    }
    assert.ok(reference);
    const body = audit.issue.ownerAnswers[Number(/^issue\.ownerAnswers\[(\d+)\]\.body$/.exec(reference.source)[1])].body;
    assert.equal(body, answer.body);
    assert.equal(hash(body), reference.sha256);
    assert.equal(Buffer.byteLength(body), reference.bytes);
    assert.ok(working.issue.ownerAnswers[i].body.includes(reference.source));
  }
  const mixed = JSON.parse(audit.issue.ownerAnswers[mixedIndex].body.match(/```json\n([\s\S]*?)\n```/)[1]);
  const { files: _files, ...nonFileDecisions } = mixed;
  assert.deepEqual(nonFileDecisions, metadata);
  const catalog = working.productChange.currentDocuments;
  const normal = productWorkingContext(combinedHistoryFixture().context);
  assert.equal(working.issue.body, normal.issue.body);
  for (const key of ['idea', 'scope']) assert.equal(working.productChange[key], normal.productChange[key]);
  assert.deepEqual(catalog, normal.productChange.currentDocuments);
  assert.deepEqual(working.productChange.historicalCopies, normal.productChange.historicalCopies);
  const plan = catalog.paths.map(({ path, current, history }) => ({ path, selected: current.ref, omitted: history.map(item => item.ref) }));
  const composed = composeRetainedProduct(context, { binding: catalog.binding, plan, envelope }).envelope.result.output.productChange.files;
  assert.deepEqual(composed.map(file => [file.path, file.content, hash(file.content)]), files.map(file => [file.path, file.content, hash(file.content)]));
  assert.equal(JSON.stringify(context), original);
});

test('whole-answer fallback preserves ordinary small views and refuses original limits and stale bindings', () => {
  const small = combinedHistoryFixture().context, ordinary = productWorkingContext(small);
  assert.equal(ordinary.productChange.historyIndex, undefined);
  assert.deepEqual(productWorkingContext(small), ordinary);
  for (const [mutate, error] of [
    [f => { f.context.issue.ownerAnswers.push({ body: 'x'.repeat(2 * 1024 * 1024) }); }, /input text/],
    [f => { f.context.contract.rules += 'x'.repeat(4 * 1024 * 1024); }, /input text/],
    [f => { f.context.contract.rules += 'x'.repeat(256 * 1024); }, /working context exceeds bounds after exact history transport.*sha256=/],
    [f => { f.context.issue.body += 'x'.repeat(256 * 1024); }, /working context exceeds bounds after exact history transport.*sha256=/],
    [f => { f.context.productChange.baselineDigest = 'a'.repeat(64); }, /binding/],
    [f => { f.context.issue.ownerAnswers[0].body = embedDraft({ ...f.repeated, revision: 1 }); }, /Ambiguous/],
    [f => { f.context.issue.ownerAnswers.push({ body: embedLiteralFiles([{ ...f.files[3], sha256: 'a'.repeat(64) }]) }); }, /changed hash/],
    [f => { f.context.issue.ownerAnswers.push({ body: 'invalid surrogate \ud800' }); }, /UTF-8/],
  ]) {
    const f = combinedHistoryFixture({ decisionHistoryBytes: 320 * 1024 }); mutate(f);
    const original = JSON.stringify(f.context);
    assert.throws(() => productWorkingContext(f.context), error);
    assert.equal(JSON.stringify(f.context), original);
  }
  assert.throws(() => productWorkingContext(small, 'not-an-audit-digest'), /audit SHA-256 binding/);
});

test('whole-answer references share the unchanged typed and historical reference budget', () => {
  const { context, files, draft, repeated } = productContextFixture();
  for (const file of files) file.content = file.content.replace(/Exact UTF-8 text:[\s\S]*/, 'Small retained body.\n');
  draft.files = files.map(file => ({ ...file, sha256: hash(file.content) }));
  repeated.files = structuredClone(draft.files);
  context.issue.body = embedDraft(draft); context.issue.ownerAnswers[0].body = embedDraft(repeated);
  delete context.continuation; delete context.answerHistory; delete context.productChange.parent;
  context.productChange.idea = 'Bounded history'; context.productChange.scope = 'Bounded history';
  context.issue.ownerAnswers.push(...Array.from({ length: 5 }, () => ({ body: embedLiteralFiles(files) })));
  // 128 typed + 320 historical + 64 whole-answer references = exactly 512.
  context.issue.ownerAnswers.push(...Array.from({ length: 58 }, () => ({ body: 'Preserve this decision. '.repeat(240) })));
  assert.equal(productWorkingContext(context).productChange.historyIndex.answers.length, 64);
  context.issue.ownerAnswers.push({ body: 'One more exact answer.' });
  assert.throws(() => productWorkingContext(context), /reference inventory exceeds bounds including whole-answer/);
});

test('bounded answer inspection reconstructs exact decoded UTF-8 from a single-line audit without promoting history', () => {
  const { context, audit, auditSha256, decisionStart, olderFiles } = singleLineHistoryFixture();
  const working = productWorkingContext(context, auditSha256), index = working.productChange.historyIndex;
  assert.equal(audit.split('\n').length, 1);
  assert.ok(audit.length > 2000);
  const answer = index.answers.find(ref => ref.source === `issue.ownerAnswers[${decisionStart}].body`);
  const history = { binding: index.binding, auditSha256, answer, offset: 0, limit: 1024 };
  let content = '', offset = 0;
  do {
    const chunk = inspectRetainedAnswer(context, auditSha256, { ...history, offset });
    assert.equal(chunk.offset, offset);
    assert.deepEqual(chunk.answer, answer);
    assert.equal(chunk.auditSha256, auditSha256);
    assert.equal(chunk.bytes, Buffer.byteLength(chunk.content));
    assert.ok(chunk.bytes <= 1024);
    assert.equal(chunk.sha256, hash(chunk.content));
    assert.equal(Buffer.from(chunk.content).toString('utf8'), chunk.content);
    content += chunk.content;
    if (chunk.nextOffset !== null) assert.equal(chunk.nextOffset, offset + chunk.bytes);
    offset = chunk.nextOffset;
  } while (offset !== null);
  assert.equal(content, context.issue.ownerAnswers[decisionStart].body);
  assert.equal(hash(content), answer.sha256);
  assert.equal(Buffer.byteLength(content), answer.bytes);
  assert.ok(!working.productChange.currentDocuments.paths.some(item => item.path === olderFiles[1].path));
  assert.deepEqual(productWorkingContext(context, auditSha256), working);
  assert.equal(JSON.stringify(context), audit);
});

test('answer inspection refuses split Unicode, stale bindings, unindexed bodies and original bound violations', () => {
  const { context, auditSha256 } = singleLineHistoryFixture();
  const index = productWorkingContext(context, auditSha256).productChange.historyIndex;
  const answer = index.answers.at(-2), body = context.issue.ownerAnswers.at(-2).body;
  const history = { binding: index.binding, auditSha256, answer, offset: 0, limit: 1024 };
  const unicodeOffset = Buffer.byteLength(body.slice(0, body.indexOf('λ')));
  assert.throws(() => inspectRetainedAnswer(context, auditSha256, { ...history, offset: unicodeOffset + 1 }), /offset splits UTF-8/);
  assert.throws(() => inspectRetainedAnswer(context, auditSha256, { ...history, offset: unicodeOffset, limit: 1 }), /limit splits UTF-8/);
  assert.equal(inspectRetainedAnswer(context, auditSha256, { ...history, offset: unicodeOffset, limit: 2 }).content, 'λ');
  assert.equal(inspectRetainedAnswer(context, auditSha256, { ...history, offset: unicodeOffset + 2, limit: 4 }).content, '😀');
  assert.equal(inspectRetainedAnswer(context, auditSha256, { ...history, offset: answer.bytes }).nextOffset, null);
  const small = combinedHistoryFixture().context;
  assert.throws(() => inspectRetainedAnswer(small, auditSha256, { ...history, binding: currentRetainedInventory(small).binding }), /Unknown indexed answer/);
  for (const mutate of [
    f => { f.context.issue.ownerAnswers.push({ body: 'x'.repeat(2 * 1024 * 1024) }); },
    f => { f.context.contract.rules += 'x'.repeat(256 * 1024); },
    f => { f.context.issue.ownerAnswers[0].body = embedDraft({ ...f.repeated, revision: 1 }); },
    f => { f.context.issue.ownerAnswers.push({ body: '\ud800' }); },
  ]) {
    const f = singleLineHistoryFixture(); mutate(f);
    const before = JSON.stringify(f.context);
    assert.throws(() => inspectRetainedAnswer(f.context, f.auditSha256, history));
    assert.equal(JSON.stringify(f.context), before);
  }
});
