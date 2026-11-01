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
  const epic = input.mode === 'epic';
  if (epic && input.slices.length === 0) errors.push(issue('stacked.empty', 'epic mode requires at least one child', 'slices'));
  if (input.mode !== undefined && !['epic', 'nested'].includes(input.mode)) errors.push(issue('stacked.mode', 'mode must be epic or nested', 'mode'));
  const epicParent = String(parentRef ?? '').match(/^(?:GH-)?([1-9]\d*)$/)?.[1];
  if (epic && (!epicParent || input.parent.integrationBranch !== `lighthouse/epic-${epicParent}` || input.parent.integrationBranch === (input.parent.base ?? 'main'))) errors.push(issue('stacked.integration-branch', 'epic mode needs the integration branch for its parent issue', 'parent.integrationBranch'));
  if (parentRef === undefined || parentRef === null || String(parentRef).trim() === '') errors.push(issue('stacked.parent', 'parent needs an id or number', 'parent'));
  const seenBranches = new Set();
  const slices = input.slices.map((slice, index) => {
    if (!isRecord(slice) || typeof slice.id !== 'string' || !slice.id.trim() || typeof slice.title !== 'string' || !slice.title.trim()) { errors.push(issue('stacked.slice', `slice ${index} needs id and title`, `slices[${index}]`)); return null; }
    const branchPrefix = String(parentRef).match(/[1-9]\d*/u)?.[0];
    const branch = slice.branch ?? (branchPrefix ? `feat/${branchPrefix}-${slug(slice.title)}` : null);
    if (!branch) { errors.push(issue('stacked.branch', `slice ${slice.id} needs an explicit branch when the parent has no numeric issue id`, `slices[${index}].branch`)); return null; }
    if (seenBranches.has(branch)) errors.push(issue('stacked.branch-duplicate', `branch ${branch} appears more than once`, `slices[${index}].branch`));
    seenBranches.add(branch);
    if (epic && slice.base !== undefined && slice.base !== input.parent.integrationBranch) errors.push(issue('stacked.epic-base', 'epic children must target the shared integration branch', `slices[${index}].base`));
    const strings = value => Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim());
    if ((epic || slice.dependencies != null) && !strings(slice.dependencies)) errors.push(issue('stacked.dependencies', 'dependencies must be a string array', `slices[${index}].dependencies`));
    if (slice.acceptance != null && !strings(slice.acceptance)) errors.push(issue('stacked.acceptance', 'acceptance must be a string array', `slices[${index}].acceptance`));
    return { id: slice.id, title: slice.title, branch, base: slice.base ?? null, dependencies: strings(slice.dependencies) ? [...slice.dependencies].sort() : [], acceptance: strings(slice.acceptance) ? [...slice.acceptance] : [] };
  }).filter(Boolean);
  const byId = new Map(slices.map((slice) => [slice.id, slice]));
  if (byId.size !== slices.length) errors.push(issue('stacked.duplicate', 'slice identities must be unique', 'slices'));
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
    return { type: 'open-pull-request', sliceId: id, branch: slice.branch, base: epic ? input.parent.integrationBranch : slice.base ?? (index === 0 ? input.parent.base ?? 'main' : slices.find((candidate) => candidate.id === order[index - 1])?.branch) };
  });
  if (epic) operations.push({ type: 'open-aggregate-pull-request', branch: input.parent.integrationBranch, base: input.parent.base ?? 'main', requires: [...order] });
  return { schemaVersion: 1, status: errors.length ? 'invalid' : 'ready', valid: errors.length === 0, canApply: errors.length === 0, parent: input.parent, slices, order, operations: errors.length ? [] : operations, errors };
}
