#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = resolve(packageRoot, 'contract.json');

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

async function verifyContract() {
  const problems = [];
  let contract;
  try { contract = await readJson(contractPath); }
  catch (error) { return [`Cannot read contract.json: ${error.message}`]; }
  if (contract.name !== '@juangcarmona/lighthouse-sdlc') problems.push('contract name is incorrect');
  if (!/^\d+\.\d+\.\d+$/.test(contract.version ?? '')) problems.push('contract version must be semver-like');
  const stages = Array.isArray(contract.stages) ? contract.stages : [];
  const expectedStages = ['triage', 'refine', 'propose', 'implement', 'integrate', 'review'];
  if (stages.map((stage) => stage.name).join(',') !== expectedStages.join(',')) problems.push('stages must be triage, refine, propose, implement, integrate, review in order');
  for (const stage of stages) {
    for (const asset of [stage.skill, stage.command]) if (!(await exists(resolve(packageRoot, asset)))) problems.push(`missing stage asset ${asset}`);
  }
  for (const asset of [contract.assets?.routes, contract.assets?.gates, contract.assets?.controlPlaneSchema]) {
    if (!asset || !(await exists(resolve(packageRoot, asset)))) problems.push(`missing contract asset ${asset ?? '(empty)'}`);
  }
  for (const asset of ['routes.json', 'gates.json', 'schemas/routes.schema.json', 'schemas/gates.schema.json', 'schemas/control-plane.schema.json']) {
    if (!(await exists(resolve(packageRoot, asset)))) problems.push(`missing package asset ${asset}`);
  }
  try {
    const routes = await readJson(resolve(packageRoot, 'routes.json'));
    const routeIds = routes.routes?.map((route) => route.id) ?? [];
    if (routeIds.join(',') !== contract.routes.join(',')) problems.push('routes.json does not match contract routes');
  } catch (error) { problems.push(`Cannot read routes.json: ${error.message}`); }
  try {
    const gates = await readJson(resolve(packageRoot, 'gates.json'));
    const gateIds = gates.gates?.map((gate) => gate.id) ?? [];
    if (gateIds.join(',') !== contract.gates.join(',')) problems.push('gates.json does not match contract gates');
  } catch (error) { problems.push(`Cannot read gates.json: ${error.message}`); }
  for (const command of ['status', ...expectedStages]) if (!(await exists(resolve(packageRoot, `commands/${command}.md`)))) problems.push(`missing command asset ${command}`);
  for (const metaCommand of contract.metaCommands ?? []) if (!(await exists(resolve(packageRoot, `meta-commands/${metaCommand}.md`)))) problems.push(`missing meta-command asset ${metaCommand}`);
  return problems;
}

const command = process.argv[2] ?? 'verify';
if (!['contract', 'verify'].includes(command)) {
  console.error('Usage: lighthouse-sdlc <contract|verify>');
  process.exit(2);
}
if (command === 'contract') {
  console.log(await readFile(contractPath, 'utf8'));
} else {
  const problems = await verifyContract();
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log('Lighthouse SDLC package contract is valid.');
}

export { contractPath, verifyContract };
