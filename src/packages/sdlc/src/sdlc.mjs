#!/usr/bin/env node
import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyTriageLabels, buildTriageReport } from './triage.mjs';

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
  for (const asset of [contract.assets?.routes, contract.assets?.gates, contract.assets?.controlPlaneSchema, contract.assets?.triageSchema]) {
    if (!asset || !(await exists(resolve(packageRoot, asset)))) problems.push(`missing contract asset ${asset ?? '(empty)'}`);
  }
  for (const asset of ['routes.json', 'gates.json', 'schemas/routes.schema.json', 'schemas/gates.schema.json', 'schemas/control-plane.schema.json', 'schemas/triage.schema.json', 'src/triage.mjs']) {
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

function option(args, name) {
  const index = args.indexOf(name);
  if (index !== -1) return args[index + 1];
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function triageText(report) {
  const lines = [
    `Triage: ${report.status}`,
    `Work item: ${report.workItem?.id ?? '(unknown)'} — ${report.workItem?.title ?? '(untitled)'}`,
    `Size: ${report.assessment.size}`,
    `Urgency: ${report.assessment.urgency}`,
    `Impact: ${report.assessment.impact}`,
    `Risk: ${report.assessment.risk}`,
    `Blast radius: ${report.assessment.blastRadius}`,
    `Route: ${report.assessment.route ?? '(unknown)'}`,
    `Transition: ${report.transition.from ?? '(unknown)'} -> ${report.transition.to ?? '(unknown)'}`,
    `Labels: ${report.labels.proposed.join(', ') || '(none)'}`,
  ];
  if (report.missingEvidence.length) lines.push(`Missing evidence: ${report.missingEvidence.join(', ')}`);
  if (report.unavailableChecks.length) lines.push(`Unavailable checks: ${report.unavailableChecks.join(', ')}`);
  if (report.pendingReview.length) lines.push(`Pending review: ${report.pendingReview.join(', ')}`);
  for (const error of report.errors) lines.push(`Error: ${error.message}`);
  lines.push(report.applied ? 'Applied: yes' : 'Applied: no (read-only)');
  return `${lines.join('\n')}\n`;
}

async function runTriage(args) {
  const inputPath = option(args, '--input');
  const configPath = option(args, '--config');
  const labelsPath = option(args, '--labels-file');
  const format = option(args, '--format') ?? 'text';
  const apply = args.includes('--apply');
  if (!inputPath || !['text', 'json'].includes(format) || (apply && !labelsPath)) {
    console.error('Usage: lighthouse-sdlc triage --input <file> [--config <file>] [--format <text|json>] [--apply --labels-file <file>]');
    process.exit(2);
  }
  const input = await readJson(resolve(process.cwd(), inputPath));
  if (configPath) input.configuration = await readJson(resolve(process.cwd(), configPath));
  const report = buildTriageReport(input);
  report.applied = false;
  if (apply && report.canApply) {
    const labelsFile = resolve(process.cwd(), labelsPath);
    const current = await readJson(labelsFile);
    const expected = JSON.stringify(report.labels.current);
    if (!Array.isArray(current) || JSON.stringify([...new Set(current)].sort()) !== expected) throw new Error('labels file does not match currentLabels; refusing to apply the triage projection');
    await writeFile(labelsFile, `${JSON.stringify(applyTriageLabels(report), null, 2)}\n`);
    report.applied = true;
  }
  if (format === 'json') console.log(JSON.stringify(report, null, 2));
  else process.stdout.write(triageText(report));
  if (report.status !== 'ready') process.exit(1);
}

const command = process.argv[2] ?? 'verify';
if (!['contract', 'verify', 'triage'].includes(command)) {
  console.error('Usage: lighthouse-sdlc <contract|verify|triage>');
  process.exit(2);
}
if (command === 'contract') {
  console.log(await readFile(contractPath, 'utf8'));
} else if (command === 'triage') {
  await runTriage(process.argv.slice(3));
} else {
  const problems = await verifyContract();
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log('Lighthouse SDLC package contract is valid.');
}

export { contractPath, runTriage, verifyContract };
