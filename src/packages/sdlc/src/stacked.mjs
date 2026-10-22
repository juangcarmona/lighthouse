function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

function slug(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '');
}

export function buildStackedPlan(input) {
  const errors = [];
  if (!isRecord(input) || !isRecord(input.parent) || !Array.isArray(input.slices)) return { schemaVersion: 1, status: 'invalid', valid: false, canApply: false, errors: [issue('stacked.invalid', 'stacked input needs parent and slices')] };
  const parentRef = input.parent.number ?? input.parent.id;
  if (parentRef === undefined || parentRef === null || String(parentRef).trim() === '') errors.push(issue('stacked.parent', 'parent needs an id or number', 'parent'));
  const seenBranches = new Set();
  const slices = input.slices.map((slice, index) => {
    if (!isRecord(slice) || typeof slice.id !== 'string' || !slice.id.trim() || typeof slice.title !== 'string' || !slice.title.trim()) { errors.push(issue('stacked.slice', `slice ${index} needs id and title`, `slices[${index}]`)); return null; }
    const branchPrefix = String(parentRef).match(/[1-9]\d*/u)?.[0];
    const branch = slice.branch ?? (branchPrefix ? `feat/${branchPrefix}-${slug(slice.title)}` : null);
    if (!branch) { errors.push(issue('stacked.branch', `slice ${slice.id} needs an explicit branch when the parent has no numeric issue id`, `slices[${index}].branch`)); return null; }
    if (seenBranches.has(branch)) errors.push(issue('stacked.branch-duplicate', `branch ${branch} appears more than once`, `slices[${index}].branch`));
    seenBranches.add(branch);
    return { id: slice.id, title: slice.title, branch, base: slice.base ?? null, dependencies: [...(slice.dependencies ?? [])].sort(), acceptance: [...(slice.acceptance ?? [])] };
  }).filter(Boolean);
  const byId = new Map(slices.map((slice) => [slice.id, slice]));
  const order = [];
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) { errors.push(issue('stacked.cycle', `dependency cycle includes ${id}`, 'slices')); return; }
    visiting.add(id);
    for (const dependency of byId.get(id)?.dependencies ?? []) {
      if (!byId.has(dependency)) errors.push(issue('stacked.unknown-dependency', `slice ${id} depends on unknown slice ${dependency}`, 'slices'));
      else visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  }
  for (const slice of slices) visit(slice.id);
  const operations = order.map((id, index) => {
    const slice = byId.get(id);
    return { type: 'open-pull-request', sliceId: id, branch: slice.branch, base: slice.base ?? (index === 0 ? input.parent.base ?? 'main' : slices.find((candidate) => candidate.id === order[index - 1])?.branch) };
  });
  return { schemaVersion: 1, status: errors.length ? 'invalid' : 'ready', valid: errors.length === 0, canApply: errors.length === 0, parent: input.parent, slices, order, operations, errors };
}
