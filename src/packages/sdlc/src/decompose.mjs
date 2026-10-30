function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

const strings = value => Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim());

function orderSlices(slices) {
  const byId = new Map(slices.map((slice) => [slice.id, slice]));
  const visiting = new Set();
  const visited = new Set();
  const ordered = [];
  const errors = [];
  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) { errors.push(issue('decompose.cycle', `dependency cycle includes ${id}`, 'slices')); return; }
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependencies ?? []) if (byId.has(dependency)) visit(dependency);
    visiting.delete(id);
    visited.add(id);
    ordered.push(id);
  }
  for (const slice of slices) visit(slice.id);
  return { ordered, errors };
}

export function buildDecompositionPlan(input) {
  const errors = [];
  if (!isRecord(input)) return { schemaVersion: 1, status: 'invalid', valid: false, canApply: false, errors: [issue('decompose.invalid', 'decomposition input must be an object')] };
  if (input.schemaVersion !== 1) errors.push(issue('decompose.schema-version', 'schemaVersion must be 1', 'schemaVersion'));
  if (!isRecord(input.parent) || typeof input.parent.id !== 'string' || !input.parent.id.trim() || typeof input.parent.title !== 'string' || !input.parent.title.trim()) errors.push(issue('decompose.parent', 'parent needs id and title', 'parent'));
  if (!Array.isArray(input.slices) || input.slices.length === 0) errors.push(issue('decompose.slices', 'slices must be a non-empty array', 'slices'));
  const ids = new Set();
  const slices = Array.isArray(input.slices) ? input.slices.map((slice, index) => {
    if (!isRecord(slice) || typeof slice.id !== 'string' || !slice.id.trim() || typeof slice.title !== 'string' || !slice.title.trim()) { errors.push(issue('decompose.slice', `slice ${index} needs id and title`, `slices[${index}]`)); return null; }
    if (ids.has(slice.id)) errors.push(issue('decompose.duplicate', `slice ${slice.id} appears more than once`, `slices[${index}].id`));
    ids.add(slice.id);
    if (!strings(slice.dependencies)) errors.push(issue('decompose.dependencies', `slice ${slice.id} needs a string dependencies array`, `slices[${index}].dependencies`));
    for (const field of ['scope', 'labels']) if (slice[field] !== undefined && !strings(slice[field])) errors.push(issue(`decompose.${field}`, `slice ${slice.id} needs a string ${field} array`, `slices[${index}].${field}`));
    if (!Array.isArray(slice.acceptance) || slice.acceptance.length === 0 || slice.acceptance.some((item) => typeof item !== 'string' || !item.trim())) errors.push(issue('decompose.acceptance', `slice ${slice.id} needs independent acceptance evidence`, `slices[${index}].acceptance`));
    return { id: slice.id, title: slice.title, acceptance: strings(slice.acceptance) ? [...slice.acceptance] : [], dependencies: strings(slice.dependencies) ? [...new Set(slice.dependencies)].sort() : [], scope: strings(slice.scope) ? [...slice.scope].sort() : [], labels: strings(slice.labels) ? [...slice.labels].sort() : [] };
  }).filter(Boolean) : [];
  for (const slice of slices) for (const dependency of slice.dependencies) if (!ids.has(dependency)) errors.push(issue('decompose.unknown-dependency', `slice ${slice.id} depends on unknown slice ${dependency}`, 'slices'));
  const order = orderSlices(slices);
  errors.push(...order.errors);
  const status = errors.length ? 'invalid' : 'ready';
  return { schemaVersion: 1, status, valid: errors.length === 0, canApply: status === 'ready', parent: input.parent ?? null, slices, order: order.ordered, operations: status === 'ready' ? order.ordered.map((id) => ({ type: 'create-child', parentId: input.parent?.id, sliceId: id })) : [], errors };
}

export function applyDecompositionPlan(plan) {
  if (!plan?.canApply) throw new Error('Decomposition plan is not ready to apply. Resolve its errors first.');
  return { ...plan, applied: true };
}
