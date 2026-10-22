import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const catalogPath = fileURLToPath(new URL('../assets/profiles/catalog.json', import.meta.url));
const allowedShapes = new Set(['unknown', 'frontend', 'backend', 'full-stack', 'service', 'library', 'tooling', 'cli', 'worker', 'mobile']);
const allowedLevels = new Set(['required', 'recommended', 'optional']);
const allowedKinds = new Set(['hard', 'soft']);
const allowedVerification = new Set(['deterministic', 'semantic', 'human']);
const allowedLayers = new Set(['static', 'unit', 'architecture', 'integration', 'functional', 'browser-e2e', 'operational']);

function profileProblems(profile) {
  const problems = [];
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return ['profile must be an object'];
  for (const key of ['id', 'owner', 'purpose', 'appliesTo', 'surfaces', 'verification']) if (!(key in profile)) problems.push(`missing ${key}`);
  if (typeof profile.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(profile.id)) problems.push('id must use kebab-case');
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

export function composeProfiles(catalog, manifest) {
  const application = normalizeApplication(manifest?.application);
  const selected = (manifest?.profiles ?? []).map((id) => {
    const profile = catalog.profiles.find((item) => item.id === id);
    const status = profile ? profileStatus(profile, application) : 'failed';
    const problems = profile
      ? status === 'failed'
        ? [`${id} does not apply to application shape '${application.shape}' and stacks '${application.stacks.join(', ') || 'none'}'.`]
        : status === 'unconfigured'
          ? [`${id} needs application.shape and${profile.appliesTo.stacks.length ? ' application.stacks' : ''} in lighthouse.json.`]
          : []
      : [`${id} is not declared by the installed profile catalog.`];
    return {
      id,
      owner: profile?.owner ?? '@juangcarmona/lighthouse',
      purpose: profile?.purpose ?? null,
      status,
      appliesTo: profile?.appliesTo ?? null,
      surfaces: profile?.surfaces ?? [],
      verification: profile?.verification ?? { layers: [] },
      problems,
      nextAction: problems.length
        ? status === 'unconfigured'
          ? 'Declare application.shape and application.stacks, then run lighthouse profiles --format json.'
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
  return { schemaVersion: 1, application, selected, available: catalog.profiles.map(({ id, owner, purpose, appliesTo, surfaces, verification }) => ({ id, owner, purpose, appliesTo, surfaces, verification })), status };
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
