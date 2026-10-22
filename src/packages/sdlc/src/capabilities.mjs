import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

export async function readCapabilityCatalog(path = resolve(packageRoot, 'capabilities.json')) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export function validateCapabilityCatalog(catalog) {
  const errors = [];
  if (!isRecord(catalog)) return [issue('catalog.invalid', 'capability catalog must be an object')];
  if (catalog.schemaVersion !== 1) errors.push(issue('catalog.schema-version', 'catalog schemaVersion must be 1', 'schemaVersion'));
  if (catalog.package?.name !== '@juangcarmona/lighthouse-sdlc') errors.push(issue('catalog.package', 'catalog package name is incorrect', 'package.name'));
  if (typeof catalog.package?.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(catalog.package.version)) errors.push(issue('catalog.package-version', 'catalog package version must be semver-like', 'package.version'));
  if (!Array.isArray(catalog.capabilities) || catalog.capabilities.length === 0) return [...errors, issue('catalog.capabilities', 'catalog capabilities must be a non-empty array', 'capabilities')];
  const ids = new Set();
  for (const capability of catalog.capabilities) {
    if (!isRecord(capability) || typeof capability.id !== 'string' || !capability.id.trim()) {
      errors.push(issue('catalog.capability', 'every catalog capability needs an id', 'capabilities'));
      continue;
    }
    if (ids.has(capability.id)) errors.push(issue('catalog.duplicate', `catalog capability ${capability.id} appears more than once`, 'capabilities'));
    ids.add(capability.id);
    if (typeof capability.provider !== 'string' || !capability.provider) errors.push(issue('catalog.provider', `catalog capability ${capability.id} needs a provider`, 'capabilities'));
    if (typeof capability.version !== 'string' || !capability.version) errors.push(issue('catalog.version', `catalog capability ${capability.id} needs a version`, 'capabilities'));
    if (!isRecord(capability.configuration) || !Array.isArray(capability.configuration.labels)) errors.push(issue('catalog.configuration', `catalog capability ${capability.id} needs configuration.labels`, 'capabilities'));
    if (!isRecord(capability.operations) || !Array.isArray(capability.operations.allowed) || !Array.isArray(capability.operations.blocked)) errors.push(issue('catalog.operations', `catalog capability ${capability.id} needs operation policy`, 'capabilities'));
  }
  return errors;
}

export function catalogCapability(catalog, id) {
  return catalog?.capabilities?.find((capability) => capability.id === id) ?? null;
}

export function declarationFromCatalog(catalog, id = 'labels') {
  const capability = catalogCapability(catalog, id);
  if (!capability) throw new Error(`Capability ${id} is not declared by the installed SDLC package.`);
  return {
    schemaVersion: 1,
    capabilities: [{
      id: capability.id,
      provider: capability.provider,
      version: capability.version,
      catalogVersion: catalog.package.version,
      configuration: capability.configuration,
    }],
  };
}
