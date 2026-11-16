import { createHash } from 'node:crypto';
import { currentRetainedInventory } from './product-composition.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fence = /^```json[ \t]*\r?\n([\s\S]*?)^```[ \t]*\r?$/gm;

// The original remains the authority. Only validated retained declarations are removed.
export function productWorkingContext(context, auditSha256) {
  if (context.request?.worker !== 'product-change') throw Error('Current product context requires a Product Change worker');
  if (!context.productChange || typeof context.productChange !== 'object' || Array.isArray(context.productChange)) throw Error('Current product context needs host Product Change metadata');
  if (context.issue?.ownerAnswers !== undefined && !Array.isArray(context.issue.ownerAnswers)) throw Error('Unsupported retained answer inventory');
  const sources = [{ source: 'issue.body', body: context.issue?.body }, ...(context.issue?.ownerAnswers ?? []).map((answer, i) => ({ source: `issue.ownerAnswers[${i}].body`, body: answer.body }))];
  const retained = context.productChange?.files !== undefined || sources.some(({ body }) => typeof body === 'string' && body.includes('lighthouse-retained-product-draft/'));
  const catalog = retained ? currentRetainedInventory(context) : null;
  const projected = new Map();
  for (const { source, body } of sources) {
    if (typeof body !== 'string') continue;
    let index = 0;
    projected.set(source, body.replace(fence, (block, raw) => {
      const reference = `${source}#json-${index++}`;
      if (!raw.includes('lighthouse-retained-product-draft/')) return block;
      // currentRetainedInventory validated every declaration before any projection.
      return `[Retained draft ${reference}; inspect currentDocuments and the read-only audit input for exact content.]`;
    }));
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
    copy.productChange.audit = { path: '/workspace/.lighthouse-product-audit.json', sha256: auditSha256 ?? hash(JSON.stringify(context)), authority: 'Original verified inputs; read-only. Working references grant no approval or apply authority.' };
  }
  if (copy.contract?.rules) copy.contract.rules += ' The host projected current retained documents without summarizing authority. Read productChange.currentDocuments for exact current source/revision/hash references and explicit document history. Use productcomposition_inspect for exact bodies and productcomposition_compose for exhaustive selections/omissions against the original inputs. productChange.audit identifies the complete read-only original context at /workspace/.lighthouse-product-audit.json; read it on demand for historical evidence. Decision prose remains in the working issue and verified answers; document revisions do not supersede prose decisions, and comment order grants no supersession. Resolve conflicting decisions explicitly; this projection grants no approval, provider apply or publication authority.';
  if (Buffer.byteLength(JSON.stringify(copy)) > 256 * 1024) throw Error('Product working context exceeds bounds; preserve original inputs and resolve unique context size');
  return copy;
}
