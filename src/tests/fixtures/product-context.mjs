import { compositionFixture, hash } from './product-composition.mjs';

export const embedDraft = draft => `\x60\x60\x60json\n${JSON.stringify(draft)}\n\x60\x60\x60\n`;
export const embedLiteralFiles = files => embedDraft({ files });
export const embedMarkdownFile = file => `### \`${file.path}\`\n\x60\x60\x60text\n${file.content}${file.content.endsWith('\n') ? '' : '\n'}\x60\x60\x60\n`;

export function productContextFixture({ baselineDigest = '4'.repeat(64) } = {}) {
  const fixture = compositionFixture();
  const { context, draft } = fixture;
  context.request.baselineDigest = baselineDigest;
  context.productChange.baselineDigest = baselineDigest;
  draft.binding.baselineDigest = baselineDigest;
  fixture.envelope.result.output.productChange.baselineDigest = baselineDigest;
  let excess = fixture.files.reduce((sum, file) => sum + Buffer.byteLength(file.content), 0) - 276250;
  for (const file of fixture.files.slice(3)) {
    const count = Math.min(excess, file.content.match(/x*$/)[0].length);
    if (count) file.content = file.content.slice(0, -count);
    excess -= count;
  }
  if (excess) throw Error('Synthetic fixture padding is insufficient');
  draft.files = fixture.files.map(file => ({ ...file, sha256: hash(file.content) }));
  const repeated = { ...structuredClone(draft), revision: 2 };
  context.issue.title = 'Synthetic retained context';
  context.issue.body = `Keep the original unique requirement FR-ONE.\n${embedDraft(draft)}`;
  context.issue.ownerAnswers = [{ body: `Current decision: keep exact Unicode and every path; BR-ANSWER.\n${embedDraft(repeated)}`, url: 'https://example.invalid/answer/1', author: 'synthetic-owner' }];
  context.productChange.idea = `${context.issue.title}\n\n${context.issue.body}`;
  context.productChange.scope = context.issue.body;
  context.productChange.parent = { evidence: { originalRequest: context.issue.body } };
  context.continuation = { question: 'Keep exact bytes?', answer: { body: context.issue.ownerAnswers[0].body, url: 'https://example.invalid/answer/1' } };
  context.answerHistory = [structuredClone(context.continuation)];
  context.contract = { rules: 'Preserve original authority.' };
  return { ...fixture, repeated };
}

export function combinedHistoryFixture({ decisionHistoryBytes = 0, ...options } = {}) {
  const fixture = productContextFixture(options);
  const { context, draft, files } = fixture;
  for (let i = 0; i < 3; i++) context.issue.ownerAnswers.push({ body: `Typed shard decision ${i}.\n${embedDraft({ ...draft, revision: i + 3, files: draft.files.slice(i * 16, (i + 1) * 16) })}` });
  for (let i = 0; i < 9; i++) context.issue.ownerAnswers.push({ body: `Alias decision ${i}.\n${embedLiteralFiles([files[3]])}` });
  const metadata = { sourceRun: 'synthetic-history', sourceRevision: 'a'.repeat(40), status: 'unapproved', remainingObligations: ['Keep this obligation.', { decision: 'Do not infer approval.', nested: { files: ['unrelated metadata'] } }] };
  const mixedIndex = context.issue.ownerAnswers.length;
  context.issue.ownerAnswers.push({ body: `Preserve this decision.\n${embedDraft({ ...metadata, files })}Preserve the later decision.` });
  const olderFiles = [
    { ...files[3], content: 'Distinct older text.\n', sha256: hash('Distinct older text.\n') },
    { ...files[3], path: files[3].path.replace('.md', '-historical.md'), content: 'Unique older path.\n' },
  ];
  context.issue.ownerAnswers.push({ body: embedDraft({ files: olderFiles, remainingObligations: ['Keep older obligations.'] }) });
  const markdownFile = { ...files[4], content: 'Distinct older Markdown text.\n' };
  context.issue.ownerAnswers.push({ body: `Keep the Markdown obligation.\n${embedMarkdownFile(markdownFile)}Keep the last obligation.\n${embedMarkdownFile(files[5])}` });
  const decisionStart = context.issue.ownerAnswers.length;
  if (decisionHistoryBytes) {
    // Distinct non-document handoffs, provenance and decisions, not repeated file padding.
    for (let i = 0; i < 8; i++) {
      const lines = [];
      for (let j = 0; Buffer.byteLength(lines.join('\n')) < Math.ceil(decisionHistoryBytes / 8); j++) lines.push(`Historical answer ${i}, decision ${j}: preserve obligation ${i}-${j}; provenance synthetic-handoff-${i}; status unapproved; conflicting decisions require an explicit owner resolution. Unicode λ.\r`);
      context.issue.ownerAnswers.push({ body: lines.join('\n'), url: `https://example.invalid/history/${i}`, author: 'synthetic-owner' });
    }
  }
  return { ...fixture, metadata, mixedIndex, olderFiles, markdownFile, decisionStart };
}
