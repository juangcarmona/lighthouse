import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { bindRetainedCopies, compositionBinding, currentRetainedInventory, historicalFilesSpan, historicalMarkdown, parseCompositionJson } from './product-composition.mjs';
import { productEvidenceScopeText } from './product-change.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fence = /^```json[ \t]*\r?\n([\s\S]*?)^```[ \t]*\r?$/gm;

// Selectors are existing whole-answer index identities, never arbitrary field or file paths.
export function inspectRetainedAnswer(context, auditSha256, history) {
  const exact = (value, keys) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw Error('Invalid history inspection fields');
  };
  exact(history, ['binding', 'auditSha256', 'answer', 'offset', 'limit']);
  exact(history.answer, ['source', 'sha256', 'bytes']);
  if (!/^[a-f0-9]{64}$/.test(auditSha256 ?? '') || history.auditSha256 !== auditSha256) throw Error('Stale history audit binding');
  if (!isDeepStrictEqual(history.binding, compositionBinding(context))) throw Error('Stale history request/source/baseline/schema binding');
  // Reuse projection's complete validation, including shared historical/answer reference bounds.
  const index = productWorkingContext(context, auditSha256).productChange.historyIndex;
  const reference = index?.answers.find(answer => isDeepStrictEqual(answer, history.answer));
  if (!reference) throw Error('Unknown indexed answer source/hash/byte identity');
  const { offset, limit } = history;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > reference.bytes || !Number.isSafeInteger(limit) || limit < 1 || limit > 1024) throw Error('History inspection range exceeds bounds');
  const answerIndex = Number(/^issue\.ownerAnswers\[(\d+)\]\.body$/.exec(reference.source)[1]);
  const bytes = Buffer.from(context.issue.ownerAnswers[answerIndex].body, 'utf8');
  const continuation = position => position < bytes.length && (bytes[position] & 0xc0) === 0x80;
  if (continuation(offset)) throw Error('History inspection offset splits UTF-8');
  let end = Math.min(offset + limit, bytes.length);
  while (continuation(end)) end--;
  if (end === offset && offset < bytes.length) throw Error('History inspection limit splits UTF-8');
  const content = bytes.subarray(offset, end).toString('utf8');
  return { auditSha256, answer: reference, offset, bytes: end - offset, sha256: hash(content), content, nextOffset: end < bytes.length ? end : null };
}

// The original remains the authority. Literal aliases require exact retained-object binding.
export function productWorkingContext(context, auditSha256, composition) {
  if (context.request?.worker !== 'product-change') throw Error('Current product context requires a Product Change worker');
  if (!context.productChange || typeof context.productChange !== 'object' || Array.isArray(context.productChange)) throw Error('Current product context needs host Product Change metadata');
  if (context.issue?.ownerAnswers !== undefined && !Array.isArray(context.issue.ownerAnswers)) throw Error('Unsupported retained answer inventory');
  if ((context.issue?.ownerAnswers?.length ?? 0) > 100) throw Error('Retained answer inventory exceeds bounds');
  if (auditSha256 !== undefined && !/^[a-f0-9]{64}$/.test(auditSha256)) throw Error('Invalid Product audit SHA-256 binding');
  const sources = [{ source: 'issue.body', body: context.issue?.body }, ...(context.issue?.ownerAnswers ?? []).map((answer, i) => ({ source: `issue.ownerAnswers[${i}].body`, body: answer.body }))];
  const retained = context.productChange?.files !== undefined || sources.some(({ body }) => typeof body === 'string' && body.includes('lighthouse-retained-product-draft/'));
  const catalog = retained ? currentRetainedInventory(context) : null;
  const projected = new Map();
  const copies = [], spans = new Map();
  for (const { source, body } of sources) {
    if (typeof body !== 'string') continue;
    const replacements = [];
    if (catalog) {
      let markdownIndex = 0;
      for (const match of body.matchAll(historicalMarkdown)) {
        // A path outside the retained change is unrelated prose, not a document route.
        if (!match[1].startsWith(`openspec/changes/${catalog.binding.changeName}/`)) continue;
        const reference = `${source}#markdown-${markdownIndex++}`;
        copies.push({ source: reference, inventory: `${source}#markdown`, markdown: true, files: [{ path: match[1], content: match[2] }] });
        replacements.push({ start: match.index, end: match.index + match[0].length, reference, heading: match[0].slice(0, match[0].indexOf('```')) });
      }
    }
    let index = 0;
    for (const match of body.matchAll(fence)) {
      const [block, raw] = match;
      const reference = `${source}#json-${index++}`;
      if (replacements.some(span => match.index >= span.start && match.index < span.end)) continue;
      if (raw.includes('lighthouse-retained-product-draft/')) {
        // currentRetainedInventory validated every declaration before any projection.
        replacements.push({ start: match.index, end: match.index + block.length, reference, retained: true });
      } else if (catalog) {
        let value;
        try { value = JSON.parse(raw); } catch {
          if (/^\s*\{\s*"files"\s*:/.test(raw)) throw Error('Malformed historical file inventory; supply an explicitly bound retained draft');
          continue;
        }
        if (!value || Array.isArray(value) || !Object.hasOwn(value, 'files')) continue;
        value = parseCompositionJson(raw);
        const field = historicalFilesSpan(raw);
        copies.push({ source: reference, inventory: reference, files: value.files });
        if (Object.keys(value).length === 1) replacements.push({ start: match.index, end: match.index + block.length, reference });
        else {
          const offset = match.index + block.indexOf('\n') + 1;
          replacements.push({ start: offset + field.start, end: offset + field.end, reference, jsonField: true });
        }
      }
    }
    spans.set(source, replacements);
  }
  const aliases = copies.length ? bindRetainedCopies(context, copies) : [];
  for (const { source, body } of sources) {
    if (typeof body !== 'string') continue;
    let end = 0, value = '';
    for (const span of spans.get(source).sort((a, b) => a.start - b.start)) {
      const label = `[${span.retained ? 'Retained draft' : 'Exact historical copy'} ${span.reference}; inspect ${span.retained ? 'currentDocuments' : 'historicalCopies and currentDocuments'} and the read-only audit input for exact content. No decision or revision authority is implied.]`;
      value += body.slice(end, span.start) + (span.heading ?? '') + (span.jsonField ? JSON.stringify(label) : label);
      end = span.end;
    }
    projected.set(source, value + body.slice(end));
  }
  const copy = structuredClone(context);
  // Redundant body copies in idea/scope, continuations and parent context are pointers,
  // not additional decisions. All nonmatching text is preserved exactly.
  const replacements = sources.filter(({ body }) => typeof body === 'string' && body.length);
  const pointer = value => {
    const match = replacements.find(({ body }) => body === value);
    return match ? `[Original ${match.source}; read the working issue text and audit input.]` : value;
  };
  function project(value, depth = 0) {
    if (depth > 64) throw Error('Product working context nesting exceeds bounds');
    if (value && typeof value === 'object') for (const key of Object.keys(value)) {
      if (['body', 'originalRequest'].includes(key) && typeof value[key] === 'string') value[key] = pointer(value[key]);
      else if (value[key] && typeof value[key] === 'object') project(value[key], depth + 1);
    }
    return value;
  }
  for (const value of [copy.continuation, copy.answerHistory, copy.request?.answerHistory, copy.productChange?.parent]) project(value);
  if (copy.issue && projected.has('issue.body')) copy.issue.body = projected.get('issue.body');
  copy.issue?.ownerAnswers?.forEach((answer, i) => { if (projected.has(`issue.ownerAnswers[${i}].body`)) answer.body = projected.get(`issue.ownerAnswers[${i}].body`); });
  if (copy.productChange) {
    if (Object.hasOwn(copy.productChange, 'scope')) copy.productChange.scope = pointer(copy.productChange.scope);
    if (copy.productChange.idea === `${context.issue?.title}\n\n${context.issue?.body ?? ''}`) copy.productChange.idea = `${context.issue.title}\n\n${pointer(context.issue.body)}`;
    delete copy.productChange.files;
    copy.productChange.currentDocuments = catalog;
    if (aliases.length) copy.productChange.historicalCopies = aliases;
    copy.productChange.audit = { path: '/workspace/.lighthouse-product-audit.json', sha256: auditSha256 ?? hash(JSON.stringify(context)), authority: 'Original verified inputs; read-only. Working references grant no approval or apply authority.' };
    if (composition) copy.productChange.composition = composition;
  }
  if (copy.contract?.rules) copy.contract.rules += ' The host projected current retained documents without summarizing authority. Read productChange.currentDocuments for exact current source/revision/hash references and explicit document history. Use productcomposition_inspect for exact bodies and productcomposition_compose for exhaustive selections/omissions against the original inputs. productChange.audit identifies the complete read-only original context at /workspace/.lighthouse-product-audit.json; read it on demand for historical evidence. In ordinary projection, decision prose remains in the working issue and verified answers; if historyIndex is present, whole original answer bodies are indexed in the audit instead. Document revisions do not supersede prose decisions, and comment order grants no supersession. Resolve conflicting decisions explicitly; this projection grants no approval, provider apply or publication authority.';
  if (Buffer.byteLength(JSON.stringify(copy)) > 256 * 1024) {
    // Validate the original, not the compressed view. No overflowing input is made admissible.
    productEvidenceScopeText(context);
    const binding = compositionBinding(context);
    const answers = sources.slice(1).filter(({ body }) => typeof body === 'string').map(({ source, body }) => {
      if (Buffer.from(body, 'utf8').toString('utf8') !== body) throw Error(`Invalid whole-answer UTF-8 at ${source}; preserve original audit and supply exact UTF-8 text`);
      return { source, sha256: hash(body), bytes: Buffer.byteLength(body) };
    });
    const references = (catalog?.measured.references ?? 0) + aliases.reduce((sum, alias) => sum + alias.files.length, 0) + answers.length;
    if (references > 512) throw Error('Retained reference inventory exceeds bounds including whole-answer history');
    // Index every transported body, including empty bodies. Null/absent bodies and all
    // answer metadata remain in place. Nothing is chosen by order, meaning or approval.
    copy.productChange.historyIndex = { binding, totalAnswers: context.issue?.ownerAnswers?.length ?? 0, answers, authority: 'Every indexed verified answer retains its original authority. Bodies are unread, not reviewed; inspect all relevant original decisions before resolving product decisions. No supersession or approval is inferred.' };
    for (const reference of answers) {
      const index = Number(/^issue\.ownerAnswers\[(\d+)\]\.body$/.exec(reference.source)[1]);
      copy.issue.ownerAnswers[index].body = `[Whole original answer ${reference.source}; inspect productChange.historyIndex and the read-only audit for exact SHA-256/UTF-8 bytes. Authoritative decisions remain unread until inspected, not superseded or reviewed.]`;
    }
    if (copy.contract?.rules) copy.contract.rules += ' Whole-answer transport is active: productChange.historyIndex exhaustively indexes original verified answer bodies. Use productcomposition_inspect with the exclusive history argument { binding: productChange.historyIndex.binding, auditSha256: productChange.audit.sha256, answer: one exact historyIndex.answers reference, offset: 0, limit: 1024 }. The service verifies the raw audit digest and current binding on every request. Check each returned auditSha256, answer, offset, content SHA-256 and UTF-8 byte count; follow nextOffset sequentially until null. Concatenate exact decoded chunks, verify the whole body SHA-256/UTF-8 byte count against the index, and inspect its decisions before resolving relevant product decisions. Offsets are UTF-8 bytes, not characters; truncated replies or partial sequences are not complete inspection. Do not rely on a line-limited read of the single-line audit or enable shell/imports to retrieve or verify it. All indexed decisions retain their original authority; unread bodies are not reviewed. Report conflicts or unavailable/stale bindings explicitly rather than guessing, summarizing or inferring supersession.';
    if (Buffer.byteLength(JSON.stringify(copy)) > 256 * 1024) throw Error(`Product working context exceeds bounds after exact history transport; current issue/instructions must fit without truncation (issue.body sha256=${hash(context.issue?.body ?? '')}); preserve original inputs and request a bounded current payload`);
  }
  return copy;
}
