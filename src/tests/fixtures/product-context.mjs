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
