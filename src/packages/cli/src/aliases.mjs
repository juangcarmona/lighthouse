import { access } from 'node:fs/promises';
import { constants, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = resolve(packageRoot, 'assets/command-aliases.json');
const packageName = '@juangcarmona/lighthouse';
const aliasPattern = /^\/lh:[a-z][a-z0-9-]*$/u;
const canonicalPattern = /^\/lighthouse:[a-z][a-z0-9-]*$/u;
const assetPattern = /^skills\/[a-z0-9-]+\/SKILL\.md$/u;

async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

export function readCommandAliases(path = contractPath) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function validateCommandAliases(contract) {
  const errors = [];
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return [{ code: 'aliases.invalid', message: 'command alias contract must be an object' }];
  if (contract.schemaVersion !== 1) errors.push({ code: 'aliases.schema-version', message: 'command alias schemaVersion must be 1' });
  if (contract.contractVersion !== 1) errors.push({ code: 'aliases.contract-version', message: 'command alias contractVersion must be 1' });
  if (contract.package?.name !== packageName) errors.push({ code: 'aliases.package', message: `command alias contract package must be ${packageName}` });
  if (contract.canonicalNamespace !== '/lighthouse') errors.push({ code: 'aliases.canonical-namespace', message: 'canonical namespace must be /lighthouse' });
  if (contract.aliasNamespace !== '/lh') errors.push({ code: 'aliases.alias-namespace', message: 'alias namespace must be /lh' });
  if (!Array.isArray(contract.aliases) || contract.aliases.length === 0) return [...errors, { code: 'aliases.list', message: 'command alias contract must declare at least one alias' }];
  const aliases = new Set();
  const canonicals = new Set();
  for (const [index, item] of contract.aliases.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      errors.push({ code: 'aliases.entry', message: `alias ${index} must be an object` });
      continue;
    }
    if (typeof item.alias !== 'string' || !aliasPattern.test(item.alias)) errors.push({ code: 'aliases.alias', message: `alias ${index} must use the /lh:<verb> form` });
    if (typeof item.canonical !== 'string' || !canonicalPattern.test(item.canonical)) errors.push({ code: 'aliases.canonical', message: `alias ${index} must target a /lighthouse:<verb> command` });
    if (typeof item.asset !== 'string' || !assetPattern.test(item.asset)) errors.push({ code: 'aliases.asset', message: `alias ${index} must reference a packaged skill asset` });
    if (aliases.has(item.alias)) errors.push({ code: 'aliases.duplicate', message: `alias ${item.alias} is declared more than once` });
    if (canonicals.has(item.canonical)) errors.push({ code: 'aliases.duplicate-target', message: `canonical command ${item.canonical} has more than one alias` });
    aliases.add(item.alias);
    canonicals.add(item.canonical);
  }
  return errors;
}

export async function verifyCommandAliases(contract = readCommandAliases()) {
  const errors = validateCommandAliases(contract);
  for (const item of contract.aliases ?? []) {
    if (typeof item.asset === 'string' && !(await exists(resolve(packageRoot, 'assets', item.asset)))) errors.push({ code: 'aliases.missing-asset', message: `alias ${item.alias} references missing asset ${item.asset}` });
  }
  return errors;
}

export { contractPath };
