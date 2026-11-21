import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import schema from '../schemas/instruction-budgets.schema.json' with { type: 'json' };

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export const INSTRUCTION_MEASUREMENT_METHOD = 'raw-utf8-whole-file-sha256-v1';
const coverage = {
  included: 'Fixed packaged SDLC files selected by the four declared branches; whole files, deduplicated per branch.',
  excluded: ['variable issue/model/project context', 'host startup/security/authority instructions', 'adopter repository/design policy', 'provider reports and full retained evidence', 'optional upstream helpers', 'compact-output recovery'],
  uncoveredBranches: ['triage', 'standalone proposal/integration/review', 'Product Change preparation/apply', 'corrections', 'unattended routes', 'browser-e2e', 'adopter-specific branches'],
  limitations: 'Bytes are not actual model tokens, billed usage or savings, a full-context fit guarantee, or evidence of workflow completion. Pointers do not establish that unread material was reviewed. All mandatory guidance and full evidence remain required.'
};
const common = [
  { path: 'product-verification.md', reason: 'Product context, scenario selection and evidence review are required.' },
  { path: 'skills/audience-guidance/SKILL.md', reason: 'Human prose and agent instructions use packaged manual reviews.' },
  { path: 'skills/audience-guidance/sources.json', reason: 'Audience helper availability and pins are checked before using the fallback.' },
  { path: 'README.md', reason: 'Read the delivery guide and bounded skill behavior contract; measure the whole file, not its linked documents.' }
];
const refine = [
  ...common,
  { path: 'schemas/estimate.schema.json', reason: 'Refinement returns a confirmed explained estimate.' },
  { path: 'epic-delivery.md', reason: 'Check the greater-than-eight decomposition boundary; this branch stays at most eight.' },
  { path: 'request-triage.md', reason: 'Epic estimate guidance selects the intake scale, not a hypothetical triage predecessor.' }
];
const implement = [
  ...common,
  { path: 'skills/propose/SKILL.md', reason: 'Scoped implementation includes OpenSpec planning before code; /harness is the host projection of this packaged skill.' },
  { path: 'change-continuity.md', reason: 'Embedded proposal and implementation retain intent and review affected instructions.' }
];
const visual = { path: 'skills/visual-evidence/SKILL.md', reason: 'This branch triggers proposed visual examples or actual existing-view capture and its evidence requirements.' };
const supported = [
  { id: 'refine-direct-no-view', entry: 'skills/refine/SKILL.md', references: refine },
  { id: 'refine-proposed-visual', entry: 'skills/refine/SKILL.md', references: [...refine, visual] },
  { id: 'implement-scoped-no-view', entry: 'skills/implement/SKILL.md', references: implement },
  { id: 'implement-existing-view', entry: 'skills/implement/SKILL.md', references: [...implement, visual] }
];

// Return copies: callers cannot change the checker's independent selections.
export const supportedInstructionBranches = () => structuredClone(supported);
export const instructionBudgetCoverage = () => structuredClone(coverage);

// Closed schema walker, limited to the keywords used by the distributed schema.
function conforms(value, rule) {
  if (rule.$ref) return conforms(value, schema.$defs[rule.$ref.split('/').at(-1)]);
  if (Object.hasOwn(rule, 'const') && value !== rule.const) return false;
  if (rule.enum && !rule.enum.includes(value)) return false;
  if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if (rule.required.some(key => !Object.hasOwn(value, key))) return false;
    if (rule.additionalProperties === false && Object.keys(value).some(key => !Object.hasOwn(rule.properties, key))) return false;
    if (Object.entries(rule.properties).some(([key, child]) => Object.hasOwn(value, key) && !conforms(value[key], child))) return false;
  }
  if (rule.type === 'array') {
    if (!Array.isArray(value) || value.length < (rule.minItems ?? 0) || value.length > (rule.maxItems ?? Infinity)) return false;
    if (rule.uniqueItems && new Set(value).size !== value.length) return false;
    if (value.some(item => !conforms(item, rule.items))) return false;
  }
  if (rule.type === 'string' && (typeof value !== 'string' || value.length < (rule.minLength ?? 0) || (rule.pattern && !new RegExp(rule.pattern, 'u').test(value)))) return false;
  if (rule.type === 'integer' && (!Number.isSafeInteger(value) || value < (rule.minimum ?? 0))) return false;
  return true;
}

export function validateInstructionBudgets(inventory) {
  const errors = [];
  const error = (code, message) => errors.push({ code, message });
  if (!conforms(inventory, schema)) error('budget.schema', 'Inventory does not conform to instruction-budgets.schema.json.');
  const branches = Array.isArray(inventory?.branches) ? inventory.branches : [];
  for (const expected of supported) {
    const matches = branches.filter(branch => branch?.id === expected.id);
    if (matches.length !== 1) {
      error('budget.branch', `${expected.id}: requires exactly one capped inventory entry.`);
      continue;
    }
    const branch = matches[0];
    for (const kind of ['entry', 'references', 'combined']) {
      if (!Number.isSafeInteger(branch.caps?.[kind]) || branch.caps[kind] < 1) error('budget.uncapped', `${expected.id}: missing valid ${kind} cap.`);
    }
    if (branch.entry?.path !== expected.entry) error('budget.selection', `${expected.id}: entry must be ${expected.entry}.`);
    const selected = Array.isArray(branch.references) ? branch.references : [];
    if (selected.length !== expected.references.length || expected.references.some(ref => selected.filter(item => item?.path === ref.path && item.reason === ref.reason).length !== 1)) {
      error('budget.selection', `${expected.id}: selected references or selection reasons changed; review added/removed inputs against the supported branch.`);
    }
  }
  if (branches.some(branch => !supported.some(item => item.id === branch?.id))) error('budget.branch', 'Inventory contains an unsupported branch.');
  if (!isDeepStrictEqual(inventory?.coverage, coverage)) error('budget.coverage', 'Inventory must retain the declared exclusions and uncovered branches.');
  return errors;
}

export async function readInstructionBudgets(root = packageRoot) {
  return JSON.parse(await readFile(resolve(root, 'instruction-budgets.json'), 'utf8'));
}

async function readPackagedSource(root, path) {
  const base = await realpath(root);
  const target = await realpath(resolve(base, path));
  const local = relative(base, target);
  if (local === '..' || local.startsWith('../') || isAbsolute(local)) throw new Error('Source is outside the package root.');
  return readFile(target);
}

/** Offline verifier. readSource is an explicit byte-reader seam for synthetic tests. Never writes or refreshes caps. */
export async function measureInstructionBudgets({ root = packageRoot, inventory, readSource } = {}) {
  if (inventory === undefined) inventory = await readInstructionBudgets(root);
  const errors = validateInstructionBudgets(inventory);
  const report = { schemaVersion: 1, status: 'failed', method: INSTRUCTION_MEASUREMENT_METHOD, coverage: instructionBudgetCoverage(), branches: [], errors };
  // Do not read arbitrary paths from invalid/unreviewed inventory data.
  if (errors.length) return report;
  const load = readSource ?? (path => readPackagedSource(root, path));
  const observed = new Map();
  for (const definition of supported) {
    const recorded = inventory.branches.find(branch => branch.id === definition.id);
    const measure = async source => {
      if (!observed.has(source.path)) {
        try {
          const bytes = await load(source.path);
          if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) throw new Error('Source reader must return bytes.');
          // Reject invalid UTF-8 instead of labeling arbitrary bytes as UTF-8 text.
          new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          observed.set(source.path, { path: source.path, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') });
        } catch {
          observed.set(source.path, null);
          errors.push({ code: 'budget.source', message: `${source.path}: missing, unreadable, outside package root or invalid UTF-8.` });
        }
      }
      const actual = observed.get(source.path);
      if (actual && (source.bytes !== actual.bytes || source.sha256 !== actual.sha256)) errors.push({ code: 'budget.stale-source', message: `${definition.id}: ${source.path} content identity or byte count is stale.` });
      return actual ? { ...source, ...actual } : null;
    };
    const entry = await measure(recorded.entry);
    const references = [];
    for (const source of recorded.references) references.push(await measure(source));
    const complete = entry && references.every(Boolean);
    const totals = complete ? { entry: entry.bytes, references: references.reduce((sum, source) => sum + source.bytes, 0), combined: entry.bytes + references.reduce((sum, source) => sum + source.bytes, 0) } : null;
    if (totals) {
      for (const kind of ['entry', 'references', 'combined']) {
        if (totals[kind] !== recorded.totals[kind]) errors.push({ code: 'budget.stale-total', message: `${definition.id}: ${kind} total is stale (${recorded.totals[kind]} recorded, ${totals[kind]} measured).` });
        if (totals[kind] > recorded.caps[kind]) errors.push({ code: 'budget.exceeded', message: `${definition.id}: ${kind} ${totals[kind]} bytes exceeds cap ${recorded.caps[kind]}.` });
      }
    }
    report.branches.push({ id: definition.id, entry, references, totals, caps: { ...recorded.caps }, capReview: { ...recorded.capReview } });
  }
  report.status = errors.length ? 'failed' : 'passed';
  return report;
}
