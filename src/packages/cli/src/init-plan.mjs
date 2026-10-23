const productNamePattern = /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,63}$/u;
const shapes = new Set(['unknown', 'frontend', 'backend', 'full-stack', 'service', 'library', 'tooling', 'cli', 'worker', 'mobile']);
const referenceKinds = new Set(['none', 'local', 'repository']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function uniqueStrings(value, name, { required = false } = {}) {
  if (!Array.isArray(value) || (required && value.length === 0) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    return [`${name} must contain non-empty strings`];
  }
  return new Set(value).size === value.length ? [] : [`${name} must be unique`];
}

function referenceProblems(reference) {
  if (reference === undefined || reference === null) return [];
  if (!isObject(reference)) return ['reference must be null or an object'];
  const problems = [];
  if (!referenceKinds.has(reference.kind)) problems.push('reference.kind must be none, local or repository');
  if (reference.kind !== 'none' && (typeof reference.location !== 'string' || reference.location.length === 0)) {
    problems.push('reference.location is required for local and repository references');
  }
  if (reference.kind === 'none' && 'location' in reference) problems.push('reference.location is not allowed when reference.kind is none');
  if ('purpose' in reference && (typeof reference.purpose !== 'string' || reference.purpose.length === 0)) problems.push('reference.purpose must be a non-empty string');
  return problems;
}

export function validateInitPlan(plan, supportedProfiles) {
  if (!isObject(plan)) return ['plan must be an object'];
  const problems = [];
  const allowed = new Set(['$schema', 'schemaVersion', 'product', 'intent', 'application', 'profiles', 'reference', 'openQuestions']);
  for (const key of Object.keys(plan)) if (!allowed.has(key)) problems.push(`unknown field ${key}`);
  if (plan.schemaVersion !== 1) problems.push('schemaVersion must be 1');
  if (typeof plan.product !== 'string' || !productNamePattern.test(plan.product)) problems.push('product must be a readable name of 1–64 characters');
  if (typeof plan.intent !== 'string' || plan.intent.trim().length === 0) problems.push('intent must be a non-empty string');
  if (!isObject(plan.application)) problems.push('application must be an object');
  else {
    if (!shapes.has(plan.application.shape)) problems.push(`application.shape must be one of ${[...shapes].join(', ')}`);
    problems.push(...uniqueStrings(plan.application.stacks, 'application.stacks'));
  }
  problems.push(...uniqueStrings(plan.profiles, 'profiles'));
  for (const profile of plan.profiles ?? []) {
    if (!supportedProfiles.includes(profile)) problems.push(`unknown profile ${profile}; use ${supportedProfiles.join(', ')}`);
  }
  problems.push(...referenceProblems(plan.reference));
  problems.push(...uniqueStrings(plan.openQuestions, 'openQuestions'));
  return problems;
}

export function hasUnresolvedQuestions(plan) {
  return Array.isArray(plan.openQuestions) && plan.openQuestions.length > 0;
}

export function manifestFromInitPlan(plan, createManifest) {
  const manifest = createManifest(plan.product, plan.profiles);
  manifest.application = {
    shape: plan.application.shape,
    stacks: [...plan.application.stacks],
  };
  return manifest;
}
