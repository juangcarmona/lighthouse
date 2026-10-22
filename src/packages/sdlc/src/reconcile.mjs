import { createHash } from 'node:crypto';
import { validateConfiguration, suggestedLabelColors } from './triage.mjs';

const CAPABILITY_ID = 'labels';
const SUPPORTED_PROVIDER = 'github';

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
}

function digest(value) {
  return createHash('sha256').update(stable(value)).digest('hex');
}

function color(value) {
  return typeof value === 'string' ? value.replace(/^#/u, '').toUpperCase() : null;
}

function comparableName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/gu, '');
}

function normalizeExisting(labels) {
  const errors = [];
  if (!Array.isArray(labels)) return { labels: [], errors: [issue('labels.existing', 'existing labels must be an array', 'existing')] };
  const seen = new Set();
  const normalized = [];
  for (const [index, item] of labels.entries()) {
    const value = typeof item === 'string' ? { name: item } : item;
    if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) {
      errors.push(issue('labels.existing-item', `existing label ${index} needs a name`, `existing[${index}]`));
      continue;
    }
    const name = value.name.trim();
    if (seen.has(name)) errors.push(issue('labels.existing-duplicate', `existing label ${name} appears more than once`, 'existing'));
    seen.add(name);
    normalized.push({ name, color: color(value.color), description: value.description ?? null });
  }
  normalized.sort((left, right) => left.name.localeCompare(right.name));
  return { labels: normalized, errors };
}

function capabilityConfig(capability) {
  return capability?.configuration && isRecord(capability.configuration) ? capability.configuration : capability;
}

export function validateCapabilityDeclaration(declaration) {
  const errors = [];
  if (!isRecord(declaration)) return [issue('capabilities.invalid', 'capability declaration must be an object')];
  if (declaration.schemaVersion !== 1) errors.push(issue('capabilities.schema-version', 'schemaVersion must be 1', 'schemaVersion'));
  if (!Array.isArray(declaration.capabilities) || declaration.capabilities.length === 0) {
    errors.push(issue('capabilities.list', 'capabilities must be a non-empty array', 'capabilities'));
    return errors;
  }
  const selected = declaration.capabilities.filter((capability) => capability?.id === CAPABILITY_ID);
  if (selected.length !== 1) errors.push(issue('capabilities.labels-selection', 'exactly one labels capability must be selected', 'capabilities'));
  for (const [index, capability] of declaration.capabilities.entries()) {
    if (!isRecord(capability) || typeof capability.id !== 'string' || !capability.id.trim()) {
      errors.push(issue('capability.invalid', `capability ${index} needs an id`, `capabilities[${index}]`));
      continue;
    }
    if (typeof capability.provider !== 'string' || !capability.provider.trim()) errors.push(issue('capability.provider', `capability ${capability.id} needs a provider`, `capabilities[${index}].provider`));
    if (typeof capability.version !== 'string' || !capability.version.trim()) errors.push(issue('capability.version', `capability ${capability.id} needs a version`, `capabilities[${index}].version`));
  }
  const labels = selected[0];
  if (labels) errors.push(...validateConfiguration(capabilityConfig(labels)).errors);
  return errors;
}

export function buildLabelReconciliationPlan(declaration, existingLabels, previousRecord = null) {
  const errors = validateCapabilityDeclaration(declaration);
  const capability = declaration?.capabilities?.find((item) => item?.id === CAPABILITY_ID);
  const existing = normalizeExisting(existingLabels);
  errors.push(...existing.errors);
  if (capability && capability.provider !== SUPPORTED_PROVIDER) errors.push(issue('capability.provider-unsupported', `labels provider ${capability.provider} is not supported by this adapter`, 'capabilities'));
  const configuration = capabilityConfig(capability);
  const desired = (Array.isArray(configuration?.labels) ? configuration.labels : []).filter((label) => isRecord(label) && typeof label.name === 'string' && label.name.trim()).map((label) => ({
    name: label.name.trim(),
    color: color(label.color ?? suggestedLabelColors[label.name]),
    description: label.description ?? null,
    role: label.role,
    dimension: label.dimension,
    value: label.value,
  })).sort((left, right) => left.name.localeCompare(right.name));
  const existingByName = new Map(existing.labels.map((label) => [label.name, label]));
  const existingByComparableName = new Map();
  for (const label of existing.labels) {
    const key = comparableName(label.name);
    existingByComparableName.set(key, [...(existingByComparableName.get(key) ?? []), label]);
  }
  const desiredNames = new Set();
  const changes = [];
  const operations = [];
  for (const label of desired) {
    if (desiredNames.has(label.name)) {
      errors.push(issue('labels.desired-duplicate', `desired label ${label.name} appears more than once`, 'capabilities'));
      continue;
    }
    desiredNames.add(label.name);
    const current = existingByName.get(label.name);
    if (!current) {
      const equivalents = existingByComparableName.get(comparableName(label.name)) ?? [];
      if (equivalents.length) {
        changes.push({ name: label.name, status: 'conflict', desired: label, candidates: equivalents });
        continue;
      }
      changes.push({ name: label.name, status: 'missing', desired: label });
      operations.push({ type: 'create-label', name: label.name, color: label.color ?? '8B949E', description: label.description ?? '' });
      continue;
    }
    const customized = (label.color !== null && current.color !== label.color) || (label.description !== null && current.description !== label.description);
    changes.push({ name: label.name, status: customized ? 'customized' : 'unchanged', existing: current, desired: label });
  }
  for (const label of existing.labels) if (!desiredNames.has(label.name)) changes.push({ name: label.name, status: 'preserved', existing: label });
  changes.sort((left, right) => left.name.localeCompare(right.name));
  const target = [...existing.labels, ...operations.map((operation) => ({ name: operation.name, color: operation.color, description: operation.description }))].sort((left, right) => left.name.localeCompare(right.name));
  const observedHash = digest(existing.labels);
  const targetHash = digest(target);
  const drift = previousRecord && previousRecord.targetHash !== observedHash
    ? { status: 'drift', expectedHash: previousRecord.targetHash, observedHash }
    : { status: 'none', expectedHash: previousRecord?.targetHash ?? null, observedHash };
  const conflicts = changes.filter((change) => change.status === 'conflict');
  const status = errors.length ? 'invalid' : conflicts.length ? 'blocked' : 'ready';
  return {
    schemaVersion: 1,
    status,
    valid: errors.length === 0,
    canApply: status === 'ready',
    capability: capability ? { id: capability.id, provider: capability.provider, version: capability.version } : null,
    desiredHash: digest(desired),
    observedHash,
    targetHash,
    drift,
    changes,
    operations,
    errors,
    record: {
      schemaVersion: 1,
      capability: capability ? { id: capability.id, provider: capability.provider, version: capability.version } : null,
      desiredHash: digest(desired),
      observedHash: targetHash,
      targetHash,
      operations: operations.map(({ type, name, color: labelColor, description }) => ({ type, name, color: labelColor, description })),
      verified: false,
    },
  };
}

export function applyLabelReconciliationPlan(plan, existingLabels) {
  if (!plan?.canApply) throw new Error('Label reconciliation is not ready to apply. Resolve its errors first.');
  const existing = normalizeExisting(existingLabels);
  if (existing.errors.length) throw new Error(existing.errors.map((error) => error.message).join('\n'));
  const names = new Set(existing.labels.map((label) => label.name));
  return [...existing.labels, ...plan.operations.filter((operation) => !names.has(operation.name)).map((operation) => ({ name: operation.name, color: operation.color, description: operation.description }))].sort((left, right) => left.name.localeCompare(right.name));
}
