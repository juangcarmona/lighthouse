import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const catalogDirectory = fileURLToPath(new URL('../assets/guardrails/', import.meta.url));
const allowedLevels = new Set(['required', 'recommended', 'optional']);
const allowedKinds = new Set(['hard', 'soft']);
const allowedVerification = new Set(['deterministic', 'semantic', 'human']);
const allowedStatuses = new Set(['passed', 'failed', 'drift', 'unavailable', 'unconfigured', 'pending-review', 'not-applicable']);
const requiredVisualTokens = ['--lh-canvas', '--lh-surface', '--lh-text', '--lh-action', '--lh-border', '--lh-focus'];

function descriptorProblems(descriptor) {
  const problems = [];
  if (!descriptor || typeof descriptor !== 'object' || Array.isArray(descriptor)) return ['descriptor must be an object'];
  for (const key of ['id', 'owner', 'appliesTo', 'level', 'kind', 'verification', 'check', 'failureHint']) {
    if (!(key in descriptor)) problems.push(`missing ${key}`);
  }
  if (typeof descriptor.id !== 'string' || !/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(descriptor.id)) problems.push('id must use lowercase dot or hyphen notation');
  if (typeof descriptor.owner !== 'string' || !descriptor.owner) problems.push('owner must be a non-empty string');
  if (!descriptor.appliesTo || typeof descriptor.appliesTo !== 'object' || Array.isArray(descriptor.appliesTo)
      || typeof descriptor.appliesTo.baseline !== 'boolean' || !Array.isArray(descriptor.appliesTo.profiles)
      || descriptor.appliesTo.profiles.some((profile) => typeof profile !== 'string')) {
    problems.push('appliesTo must declare baseline and profile names');
  }
  if (!allowedLevels.has(descriptor.level)) problems.push('level must be required, recommended or optional');
  if (!allowedKinds.has(descriptor.kind)) problems.push('kind must be hard or soft');
  if (!allowedVerification.has(descriptor.verification)) problems.push('verification must be deterministic, semantic or human');
  if (typeof descriptor.check !== 'string' || !descriptor.check) problems.push('check must be a non-empty string');
  if (typeof descriptor.failureHint !== 'string' || !descriptor.failureHint) problems.push('failureHint must be a non-empty string');
  return problems;
}

function catalogProblems(catalog) {
  const problems = [];
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) return ['catalog must be an object'];
  if (catalog.schemaVersion !== 1) problems.push('schemaVersion must be 1');
  if (!Array.isArray(catalog.guardrails)) problems.push('guardrails must be an array');
  const ids = new Set();
  for (const descriptor of catalog.guardrails ?? []) {
    problems.push(...descriptorProblems(descriptor).map((problem) => `${descriptor?.id ?? '<unknown>'}: ${problem}`));
    if (descriptor?.id && ids.has(descriptor.id)) problems.push(`${descriptor.id}: duplicate id`);
    if (descriptor?.id) ids.add(descriptor.id);
  }
  return problems;
}

export function readGuardrailCatalog() {
  const files = readdirSync(catalogDirectory).filter((file) => file.endsWith('.json')).sort();
  const catalogs = files.map((file) => JSON.parse(readFileSync(join(catalogDirectory, file), 'utf8')));
  const catalog = {
    schemaVersion: 1,
    guardrails: catalogs.flatMap((item) => item.guardrails ?? []),
  };
  const problems = catalogProblems(catalog);
  if (problems.length) throw new Error(`Invalid guardrail catalog:\n${problems.join('\n')}`);
  return catalog;
}

export function initialReviewStatus(descriptor) {
  return descriptor.verification === 'deterministic' ? 'unavailable' : 'pending-review';
}

function appliesTo(descriptor, manifest) {
  const selectedProfiles = new Set(manifest.profiles ?? []);
  return descriptor.appliesTo.baseline || descriptor.appliesTo.profiles.some((profile) => selectedProfiles.has(profile));
}

function result(descriptor, status, evidence = [], problems = []) {
  return {
    id: descriptor.id,
    owner: descriptor.owner,
    level: descriptor.level,
    kind: descriptor.kind,
    verification: descriptor.verification,
    status,
    evidence,
    problems,
    nextAction: status === 'passed' || status === 'not-applicable' ? null : descriptor.failureHint,
  };
}

async function runDeterministicCheck(descriptor, context) {
  if (descriptor.check === 'manifest') return result(descriptor, 'passed', [{ path: 'lighthouse.json' }]);
  if (descriptor.check === 'layout') {
    const missing = [];
    for (const directory of context.repository.layout) {
      if (!(await context.isDirectory(context.resolve(directory)))) missing.push(`missing repository boundary ${directory}/; run lighthouse init`);
    }
    return result(descriptor, missing.length ? 'failed' : 'passed', context.repository.layout.map((directory) => ({ path: `${directory}/` })), missing);
  }
  if (descriptor.check === 'managed-projection') {
    const missing = [];
    const drifted = [];
    for (const [file, expected] of Object.entries(context.managedFiles)) {
      const target = context.resolve(file);
      if (!(await context.exists(target))) missing.push(`${file} is missing; run lighthouse init after reviewing the plan`);
      else if (await context.readFile(target, 'utf8') !== expected) drifted.push(`${file} has drifted; regenerate it from lighthouse.json`);
    }
    const problems = [...missing, ...drifted];
    return result(descriptor, drifted.length ? 'drift' : missing.length ? 'failed' : 'passed', Object.keys(context.managedFiles).map((path) => ({ path })), problems);
  }
  if (descriptor.check === 'branch') {
    const problems = context.validateGitConventions(context.repository);
    return result(descriptor, problems.length ? 'failed' : 'passed', [{ value: context.branch ?? '' }, { pattern: context.repository.conventions.branchPattern }], problems);
  }
  if (descriptor.check === 'ui-design') {
    const expected = ['docs/design/DESIGN.md', '.agents/skills/lighthouse-ui/SKILL.md'];
    const missing = [];
    const drifted = [];
    for (const path of expected) {
      const target = context.resolve(path);
      if (!context.managedFiles[path] || !(await context.exists(target))) missing.push(path);
      else if (await context.readFile(target, 'utf8') !== context.managedFiles[path]) drifted.push(`${path} has drifted; regenerate it from the visual-theme profile.`);
    }
    const tokenProblems = requiredVisualTokens.filter((token) => !context.uiTokens?.includes(token)).map((token) => `${token} is missing from the installed Lighthouse UI token source.`);
    const problems = [...missing.map((path) => `${path} is missing; run lighthouse reconcile after reviewing the visual-theme profile plan.`), ...drifted, ...tokenProblems];
    const status = drifted.length ? 'drift' : problems.length ? 'failed' : 'passed';
    return result(descriptor, status, [...expected.map((path) => ({ path })), ...requiredVisualTokens.map((token) => ({ token }))], problems);
  }
  return result(descriptor, 'unavailable', [], [`No deterministic checker is registered for ${descriptor.id}.`]);
}

export async function evaluateGuardrails({ catalog, manifest, manifestProblems, repository, managedFiles, resolve, exists, isDirectory, readFile, validateGitConventions, branch, uiTokens }) {
  if (manifestProblems.length) {
    const descriptor = catalog.guardrails.find((item) => item.check === 'manifest') ?? catalog.guardrails[0];
    const failed = result(descriptor, 'failed', [{ path: 'lighthouse.json' }], manifestProblems.map((problem) => `Invalid lighthouse.json: ${problem}`));
    return report([failed]);
  }
  const context = { manifest, repository, managedFiles, resolve, exists, isDirectory, readFile, validateGitConventions, branch, uiTokens };
  const results = [];
  for (const descriptor of catalog.guardrails) {
    if (!appliesTo(descriptor, manifest)) {
      results.push(result(descriptor, 'not-applicable'));
      continue;
    }
    if (descriptor.verification !== 'deterministic') {
      results.push(result(descriptor, initialReviewStatus(descriptor)));
      continue;
    }
    results.push(await runDeterministicCheck(descriptor, context));
  }
  return report(results);
}

function report(results) {
  const blocking = results.filter((item) => item.level === 'required' && !['passed', 'not-applicable'].includes(item.status));
  const summary = Object.fromEntries([...allowedStatuses].map((status) => [status, results.filter((item) => item.status === status).length]));
  return {
    schemaVersion: 1,
    results,
    summary,
    blocking: blocking.map((item) => item.id),
    problems: blocking.flatMap((item) => item.problems),
  };
}
