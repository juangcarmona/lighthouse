import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const catalogPath = fileURLToPath(new URL('../assets/profiles/catalog.json', import.meta.url));
const allowedShapes = new Set(['unknown', 'frontend', 'backend', 'full-stack', 'service', 'library', 'tooling', 'cli', 'worker', 'mobile']);
const allowedLevels = new Set(['required', 'recommended', 'optional']);
const allowedKinds = new Set(['hard', 'soft']);
const allowedVerification = new Set(['deterministic', 'semantic', 'human']);
const allowedLayers = new Set(['static', 'unit', 'architecture', 'integration', 'functional', 'browser-e2e', 'operational']);
const profileIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function stringArrayProblems(value, name, { required = false } = {}) {
  if (!Array.isArray(value) || (required && value.length === 0) || value.some((item) => typeof item !== 'string' || !item)) {
    return [`${name} must contain strings`];
  }
  return new Set(value).size === value.length ? [] : [`${name} must be unique`];
}

function profileReferenceProblems(value, name) {
  return stringArrayProblems(value, name).concat((value ?? []).filter((id) => !profileIdPattern.test(id)).map((id) => `${name} contains invalid profile id ${id}`));
}

function guardrailProblems(guardrail) {
  if (!guardrail || typeof guardrail !== 'object' || Array.isArray(guardrail)) return ['guardrail must be an object'];
  const problems = [];
  for (const key of ['id', 'level', 'kind', 'verification', 'command', 'description']) if (!(key in guardrail)) problems.push(`guardrail missing ${key}`);
  if (typeof guardrail.id !== 'string' || !guardrail.id) problems.push('guardrail id must be a non-empty string');
  if (!allowedLevels.has(guardrail.level)) problems.push(`guardrail ${guardrail.id} has an invalid level`);
  if (!allowedKinds.has(guardrail.kind)) problems.push(`guardrail ${guardrail.id} has an invalid kind`);
  if (!allowedVerification.has(guardrail.verification)) problems.push(`guardrail ${guardrail.id} has an invalid verification method`);
  if (guardrail.command !== null && (typeof guardrail.command !== 'string' || !guardrail.command)) problems.push(`guardrail ${guardrail.id} command must be a string or null`);
  if (typeof guardrail.description !== 'string' || !guardrail.description) problems.push(`guardrail ${guardrail.id} description must be a non-empty string`);
  return problems;
}

function profileProblems(profile) {
  const problems = [];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return ['profile must be an object'];
  for (const key of ['id', 'owner', 'purpose', 'appliesTo', 'surfaces', 'verification']) if (!(key in profile)) problems.push(`missing ${key}`);
  if (typeof profile.id !== 'string' || !profileIdPattern.test(profile.id)) problems.push('id must use kebab-case');
  if (typeof profile.owner !== 'string' || !profile.owner) problems.push('owner must be a non-empty string');
  if (typeof profile.purpose !== 'string' || !profile.purpose) problems.push('purpose must be a non-empty string');
  const applicability = profile.appliesTo;
  if (!applicability || typeof applicability !== 'object' || Array.isArray(applicability)
      || !Array.isArray(applicability.shapes) || !Array.isArray(applicability.stacks)
      || applicability.shapes.length === 0 || applicability.shapes.some((shape) => typeof shape !== 'string' || !allowedShapes.has(shape))) {
    problems.push('appliesTo must declare supported application shapes');
  }
  if (Array.isArray(applicability?.shapes) && new Set(applicability.shapes).size !== applicability.shapes.length) problems.push('appliesTo.shapes must be unique');
  if (Array.isArray(applicability?.stacks) && (applicability.stacks.some((stack) => typeof stack !== 'string') || new Set(applicability.stacks).size !== applicability.stacks.length)) problems.push('appliesTo.stacks must contain unique strings');
  if (!Array.isArray(profile.surfaces) || profile.surfaces.length === 0 || profile.surfaces.some((surface) => typeof surface !== 'string' || !surface)) problems.push('surfaces must contain non-empty strings');
  for (const [name, value] of [['prerequisites', profile.prerequisites], ['libraries', profile.libraries], ['structure', profile.structure], ['commands', profile.commands], ['repairHints', profile.repairHints], ['exceptions', profile.exceptions]]) problems.push(...stringArrayProblems(value, name, { required: ['repairHints', 'exceptions'].includes(name)}));
  for (const [name, value] of [['dependencies', profile.dependencies], ['incompatibleWith', profile.incompatibleWith]]) problems.push(...profileReferenceProblems(value, name));
  if (typeof profile.failureConsequence !== 'string' || !profile.failureConsequence) problems.push('failureConsequence must be a non-empty string');
  if (typeof profile.consumerFixture !== 'string' || !profile.consumerFixture) problems.push('consumerFixture must be a non-empty string');
  if (typeof profile.upgradeStrategy !== 'string' || !profile.upgradeStrategy) problems.push('upgradeStrategy must be a non-empty string');
  if (!Array.isArray(profile.guardrails) || profile.guardrails.length === 0) problems.push('guardrails must contain at least one guardrail');
  const guardrailIds = new Set();
  for (const guardrail of profile.guardrails ?? []) {
    problems.push(...guardrailProblems(guardrail));
    if (guardrail?.id && guardrailIds.has(guardrail.id)) problems.push(`duplicate guardrail ${guardrail.id}`);
    if (guardrail?.id) guardrailIds.add(guardrail.id);
  }
  if (!Array.isArray(profile.combinations)) problems.push('combinations must be an array');
  for (const combination of profile.combinations ?? []) {
    if (!combination || typeof combination !== 'object' || Array.isArray(combination)) { problems.push('combination must be an object'); continue; }
    if (!Array.isArray(combination.with) || combination.with.length === 0 || combination.with.some((id) => typeof id !== 'string' || !profileIdPattern.test(id))) problems.push('combination.with must contain profile ids');
    if (typeof combination.purpose !== 'string' || !combination.purpose) problems.push('combination.purpose must be a non-empty string');
  }
  const layers = profile.verification?.layers;
  if (!Array.isArray(layers) || layers.length === 0) problems.push('verification.layers must contain at least one layer');
  const ids = new Set();
  for (const layer of layers ?? []) {
    if (!layer || typeof layer !== 'object' || Array.isArray(layer)) { problems.push('verification layer must be an object'); continue; }
    for (const key of ['id', 'level', 'kind', 'verification']) if (!(key in layer)) problems.push(`verification layer missing ${key}`);
    if (!allowedLayers.has(layer.id)) problems.push(`unsupported verification layer ${layer.id}`);
    if (!allowedLevels.has(layer.level)) problems.push(`verification layer ${layer.id} has an invalid level`);
    if (!allowedKinds.has(layer.kind)) problems.push(`verification layer ${layer.id} has an invalid kind`);
    if (!allowedVerification.has(layer.verification)) problems.push(`verification layer ${layer.id} has an invalid verification method`);
    if (layer.command !== undefined && layer.command !== null && (typeof layer.command !== 'string' || !layer.command)) problems.push(`verification layer ${layer.id} command must be a string or null`);
    if (ids.has(layer.id)) problems.push(`duplicate verification layer ${layer.id}`);
    ids.add(layer.id);
  }
  return problems;
}

function catalogProblems(catalog) {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) return ['catalog must be an object'];
  const problems = [];
  if (catalog.schemaVersion !== 1) problems.push('schemaVersion must be 1');
  if (!Array.isArray(catalog.profiles)) problems.push('profiles must be an array');
  const ids = new Set();
  for (const profile of catalog.profiles ?? []) {
    problems.push(...profileProblems(profile).map((problem) => `${profile?.id ?? '<unknown>'}: ${problem}`));
    if (profile?.id && ids.has(profile.id)) problems.push(`${profile.id}: duplicate id`);
    if (profile?.id) ids.add(profile.id);
  }
  for (const profile of catalog.profiles ?? []) {
    for (const reference of [...(profile.dependencies ?? []), ...(profile.incompatibleWith ?? []), ...(profile.combinations ?? []).flatMap((combination) => combination.with ?? [])]) {
      if (!ids.has(reference)) problems.push(`${profile.id}: references undeclared profile ${reference}`);
    }
  }
  return problems;
}

export function readProfileCatalog() {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const problems = catalogProblems(catalog);
  if (problems.length) throw new Error(`Invalid profile catalog:\n${problems.join('\n')}`);
  return catalog;
}

export function normalizeApplication(application) {
  if (!application || typeof application !== 'object' || Array.isArray(application)) return { shape: 'unknown', stacks: [] };
  return {
    shape: typeof application.shape === 'string' ? application.shape : 'unknown',
    stacks: Array.isArray(application.stacks) ? [...application.stacks] : [],
  };
}

function profileStatus(profile, application) {
  const shapeKnown = application.shape !== 'unknown';
  const stacksKnown = application.stacks.length > 0;
  const shapeMatches = !shapeKnown || profile.appliesTo.shapes.includes('any') || profile.appliesTo.shapes.includes(application.shape);
  const stackMatches = !stacksKnown || profile.appliesTo.stacks.length === 0 || profile.appliesTo.stacks.includes('any') || application.stacks.some((stack) => profile.appliesTo.stacks.includes(stack));
  if (!shapeMatches || !stackMatches) return 'failed';
  if ((!shapeKnown && profile.appliesTo.shapes.length > 0) || (profile.appliesTo.stacks.length > 0 && !stacksKnown)) return 'unconfigured';
  return 'passed';
}

function profileCompositionProblems(profile, selectedIds) {
  const problems = [];
  for (const dependency of profile.dependencies ?? []) if (!selectedIds.has(dependency)) problems.push(`${profile.id} requires the ${dependency} profile.`);
  for (const incompatible of profile.incompatibleWith ?? []) if (selectedIds.has(incompatible)) problems.push(`${profile.id} is incompatible with the ${incompatible} profile.`);
  return problems;
}

export function composeProfiles(catalog, manifest) {
  const application = normalizeApplication(manifest?.application);
  const selectedIds = new Set(manifest?.profiles ?? []);
  const selected = (manifest?.profiles ?? []).map((id) => {
    const profile = catalog.profiles.find((item) => item.id === id);
    const status = profile ? profileStatus(profile, application) : 'failed';
    const compositionProblems = profile ? profileCompositionProblems(profile, selectedIds) : [];
    const problems = profile
      ? status === 'failed'
        ? [`${id} does not apply to application shape '${application.shape}' and stacks '${application.stacks.join(', ') || 'none'}'.`]
        : status === 'unconfigured'
          ? [`${id} needs application.shape and${profile.appliesTo.stacks.length ? ' application.stacks' : ''} in lighthouse.json.`]
          : compositionProblems
      : [`${id} is not declared by the installed profile catalog.`];
    const effectiveStatus = status === 'failed' || compositionProblems.length ? 'failed' : status;
    return {
      id,
      owner: profile?.owner ?? '@juangcarmona/lighthouse',
      purpose: profile?.purpose ?? null,
      appliesTo: profile?.appliesTo ?? null,
      surfaces: profile?.surfaces ?? [],
      prerequisites: profile?.prerequisites ?? [],
      dependencies: profile?.dependencies ?? [],
      incompatibleWith: profile?.incompatibleWith ?? [],
      libraries: profile?.libraries ?? [],
      structure: profile?.structure ?? [],
      commands: profile?.commands ?? [],
      guardrails: profile?.guardrails ?? [],
      failureConsequence: profile?.failureConsequence ?? null,
      repairHints: profile?.repairHints ?? [],
      exceptions: profile?.exceptions ?? [],
      combinations: profile?.combinations ?? [],
      consumerFixture: profile?.consumerFixture ?? null,
      upgradeStrategy: profile?.upgradeStrategy ?? null,
      verification: profile?.verification ?? { layers: [] },
      problems,
      status: effectiveStatus,
      nextAction: problems.length
        ? status === 'unconfigured'
          ? 'Declare application.shape and application.stacks, then run lighthouse profiles --format json.'
          : compositionProblems.length
            ? 'Select the required profiles or remove the incompatible selection, then rerun lighthouse profiles --format json.'
            : 'Choose a compatible profile or correct application.shape and application.stacks.'
        : null,
    };
  });
  const status = selected.length === 0
    ? 'not-applicable'
    : selected.some((profile) => profile.status === 'failed')
      ? 'failed'
      : selected.some((profile) => profile.status === 'unconfigured')
        ? 'unconfigured'
        : 'passed';
  return { schemaVersion: 1, application, selected, available: catalog.profiles.map((profile) => ({ ...profile })), status };
}

export function profileCompositionResult(composition) {
  return {
    id: 'foundation.profile-composition',
    owner: '@juangcarmona/lighthouse',
    level: 'recommended',
    kind: 'hard',
    verification: 'deterministic',
    status: composition.status,
    evidence: composition.selected.map((profile) => ({ id: profile.id, status: profile.status, layers: profile.verification.layers.map((layer) => layer.id) })),
    problems: composition.selected.flatMap((profile) => profile.problems),
    nextAction: composition.selected.find((profile) => profile.nextAction)?.nextAction ?? null,
  };
}
