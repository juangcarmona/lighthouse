#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDecompositionPlan, applyDecompositionPlan } from './decompose.mjs';
import { validateControlPlane, validateLaunchRequest } from './control-plane.mjs';
import { createGithubLabel, createGithubSubIssues, mergeGithubTriage, readGithubIssue, readGithubLabels, replaceGithubLabels } from './github.mjs';
import { applyLabelReconciliationPlan, buildLabelReconciliationPlan } from './reconcile.mjs';
import { buildRoutePlan } from './routes.mjs';
import { buildStackedPlan } from './stacked.mjs';
import { applyTriageLabels, buildTriageReport } from './triage.mjs';
import { validateMemoryRecord } from './memory.mjs';
import { replayWorkflow } from './workflow.mjs';
import { validateStageResult } from './contracts.mjs';
import { browserEvidenceReport } from './browser-e2e.mjs';
import { readCapabilityCatalog, validateCapabilityCatalog } from './capabilities.mjs';

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
  for (const asset of [contract.assets?.routes, contract.assets?.gates, contract.assets?.stages, contract.assets?.controlPlaneSchema, contract.assets?.triageSchema, contract.assets?.stageResultSchema, contract.assets?.stateSchema, contract.assets?.decompositionSchema, contract.assets?.capabilitiesSchema, contract.assets?.capabilityCatalog, contract.assets?.capabilityCatalogSchema, contract.assets?.browserE2eSchema]) {
    if (!asset || !(await exists(resolve(packageRoot, asset)))) problems.push(`missing contract asset ${asset ?? '(empty)'}`);
  }
  for (const asset of ['routes.json', 'gates.json', 'stages.json', 'schemas/routes.schema.json', 'schemas/gates.schema.json', 'schemas/stages.schema.json', 'schemas/control-plane.schema.json', 'schemas/triage.schema.json', 'schemas/stage-result.schema.json', 'schemas/workflow-state.schema.json', 'schemas/decomposition.schema.json', 'schemas/capabilities.schema.json', 'schemas/capability-catalog.schema.json', 'schemas/browser-e2e.schema.json', 'src/browser-e2e.mjs', 'src/capabilities.mjs', 'src/contracts.mjs', 'src/control-plane.mjs', 'src/decompose.mjs', 'src/github.mjs', 'src/memory.mjs', 'src/reconcile.mjs', 'src/routes.mjs', 'src/stacked.mjs', 'src/triage.mjs', 'src/workflow.mjs']) {
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
  try {
    const stages = await readJson(resolve(packageRoot, 'stages.json'));
    const stageIds = stages.stages?.map((stage) => stage.id) ?? [];
    if (stageIds.join(',') !== expectedStages.join(',')) problems.push('stages.json does not match contract stages');
  } catch (error) { problems.push(`Cannot read stages.json: ${error.message}`); }
  try {
    const catalog = await readCapabilityCatalog();
    problems.push(...validateCapabilityCatalog(catalog).map((error) => `${error.code}: ${error.message}`));
  } catch (error) { problems.push(`Cannot read capabilities.json: ${error.message}`); }
  for (const command of ['status', ...expectedStages, ...(contract.utilities ?? []).filter((command) => command !== 'status')]) if (!(await exists(resolve(packageRoot, `commands/${command}.md`)))) problems.push(`missing command asset ${command}`);
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

function output(value, format = 'json') {
  if (format === 'json') console.log(JSON.stringify(value, null, 2));
  else console.log(JSON.stringify(value));
}

async function runState(args) {
  const inputPath = option(args, '--input');
  const format = option(args, '--format') ?? 'json';
  if (!inputPath) { console.error('Usage: lighthouse-sdlc state --input <events.json> [--format <json|text>]'); process.exit(2); }
  const input = await readJson(resolve(process.cwd(), inputPath));
  const result = replayWorkflow(Array.isArray(input) ? input : input.events);
  output(result, format);
  if (!result.valid) process.exit(1);
}

async function runControlPlane(args) {
  const inputPath = option(args, '--input');
  const format = option(args, '--format') ?? 'json';
  if (!inputPath) { console.error('Usage: lighthouse-sdlc control-plane --input <control-plane.json> [--format <json|text>]'); process.exit(2); }
  const input = await readJson(resolve(process.cwd(), inputPath));
  const errors = validateControlPlane(input);
  const result = { schemaVersion: 1, status: errors.length ? 'invalid' : 'valid', valid: errors.length === 0, errors };
  output(result, format);
  if (errors.length) process.exit(1);
}

async function runStageResult(args) {
  const inputPath = option(args, '--input');
  const format = option(args, '--format') ?? 'json';
  if (!inputPath) { console.error('Usage: lighthouse-sdlc stage-result --input <result.json> [--format <json|text>]'); process.exit(2); }
  const result = await readJson(resolve(process.cwd(), inputPath));
  const errors = validateStageResult(result);
  output({ schemaVersion: 1, status: errors.length ? 'invalid' : 'valid', valid: errors.length === 0, errors }, format);
  if (errors.length) process.exit(1);
}

async function runBrowserE2e(args) {
  const inputPath = option(args, '--input');
  const format = option(args, '--format') ?? 'json';
  if (!inputPath) { console.error('Usage: lighthouse-sdlc browser-e2e --input <evidence.json> [--format <json|text>]'); process.exit(2); }
  const report = browserEvidenceReport(await readJson(resolve(process.cwd(), inputPath)));
  output(report, format);
  if (!report.valid || report.status !== 'passed') process.exit(1);
}

async function runMemory(args) {
  const inputPath = option(args, '--input');
  const policyPath = option(args, '--policy');
  const format = option(args, '--format') ?? 'json';
  if (!inputPath) { console.error('Usage: lighthouse-sdlc memory --input <record.json> [--policy <memory-policy.json>] [--format <json|text>]'); process.exit(2); }
  const record = await readJson(resolve(process.cwd(), inputPath));
  const policy = policyPath ? await readJson(resolve(process.cwd(), policyPath)) : {};
  const errors = validateMemoryRecord(record, policy);
  output({ schemaVersion: 1, status: errors.length ? 'invalid' : 'valid', valid: errors.length === 0, errors }, format);
  if (errors.length) process.exit(1);
}

async function runLaunch(args) {
  const inputPath = option(args, '--input');
  const controlPlanePath = option(args, '--control-plane');
  const format = option(args, '--format') ?? 'json';
  if (!inputPath || !controlPlanePath) { console.error('Usage: lighthouse-sdlc launch --input <request.json> --control-plane <control-plane.json> [--format <json|text>]'); process.exit(2); }
  const request = await readJson(resolve(process.cwd(), inputPath));
  const controlPlane = await readJson(resolve(process.cwd(), controlPlanePath));
  const errors = [...validateControlPlane(controlPlane), ...validateLaunchRequest(request, controlPlane)];
  output({ schemaVersion: 1, status: errors.length ? 'invalid' : 'valid', valid: errors.length === 0, executed: false, errors }, format);
  if (errors.length) process.exit(1);
}

async function runDecompose(args) {
  const inputPath = option(args, '--input');
  const outputPath = option(args, '--output');
  const format = option(args, '--format') ?? 'json';
  const apply = args.includes('--apply');
  if (!inputPath || (apply && !outputPath)) { console.error('Usage: lighthouse-sdlc decompose --input <file> [--format <json|text>] [--apply --output <file>]'); process.exit(2); }
  const plan = buildDecompositionPlan(await readJson(resolve(process.cwd(), inputPath)));
  if (apply && plan.canApply) await writeFile(resolve(process.cwd(), outputPath), `${JSON.stringify(applyDecompositionPlan(plan), null, 2)}\n`);
  output({ ...plan, applied: Boolean(apply && plan.canApply) }, format);
  if (!plan.valid) process.exit(1);
}

async function runRoute(args) {
  const routeId = option(args, '--route');
  const format = option(args, '--format') ?? 'json';
  if (!routeId) { console.error('Usage: lighthouse-sdlc route --route <name> [--available <comma-separated-prerequisites>] [--format <json|text>]'); process.exit(2); }
  const routes = await readJson(resolve(packageRoot, 'routes.json'));
  const route = routes.routes?.find((candidate) => candidate.id === routeId);
  if (!route) { output({ schemaVersion: 1, status: 'invalid', valid: false, errors: [{ code: 'route.unknown', message: `unknown route ${routeId}` }] }, format); process.exit(1); }
  const available = (option(args, '--available') ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  const plan = buildRoutePlan(route, { available });
  output(plan, format);
  if (!plan.valid) process.exit(1);
}

async function runStacked(args) {
  const inputPath = option(args, '--input');
  const outputPath = option(args, '--output');
  const format = option(args, '--format') ?? 'json';
  const apply = args.includes('--apply');
  if (!inputPath || (apply && !outputPath)) { console.error('Usage: lighthouse-sdlc stacked --input <file> [--format <json|text>] [--apply --output <file>]'); process.exit(2); }
  const plan = buildStackedPlan(await readJson(resolve(process.cwd(), inputPath)));
  if (apply && plan.canApply) await writeFile(resolve(process.cwd(), outputPath), `${JSON.stringify({ ...plan, applied: true }, null, 2)}\n`);
  output({ ...plan, applied: Boolean(apply && plan.canApply) }, format);
  if (!plan.valid) process.exit(1);
}

async function runGithubTriage(args) {
  const repo = option(args, '--repo');
  const issueNumber = option(args, '--issue');
  const assessmentPath = option(args, '--assessment');
  const format = option(args, '--format') ?? 'json';
  const apply = args.includes('--apply');
  if (!repo || !issueNumber || !assessmentPath) { console.error('Usage: lighthouse-sdlc github-triage --repo <owner/repo> --issue <number> --assessment <file> [--apply] [--format <json|text>]'); process.exit(2); }
  const assessmentInput = await readJson(resolve(process.cwd(), assessmentPath));
  const issueMetadata = await readGithubIssue(repo, issueNumber);
  const report = buildTriageReport(mergeGithubTriage(issueMetadata, assessmentInput.assessment, assessmentInput.configuration));
  report.applied = false;
  if (apply && report.canApply) {
    const reread = await readGithubIssue(repo, issueNumber);
    if (JSON.stringify(reread.currentLabels) !== JSON.stringify(report.labels.current)) throw new Error('GitHub labels changed since the triage read; refusing to apply the projection');
    const applied = await replaceGithubLabels(repo, issueNumber, applyTriageLabels(report), { dryRun: false });
    report.applied = applied.applied;
  }
  output(report, format);
  if (report.status !== 'ready') process.exit(1);
}

async function runGithubDecompose(args) {
  const repo = option(args, '--repo');
  const issueNumber = option(args, '--issue');
  const inputPath = option(args, '--input');
  const format = option(args, '--format') ?? 'json';
  const apply = args.includes('--apply');
  if (!repo || !issueNumber || !inputPath) { console.error('Usage: lighthouse-sdlc github-decompose --repo <owner/repo> --issue <number> --input <file> [--apply] [--format <json|text>]'); process.exit(2); }
  const parent = await readGithubIssue(repo, issueNumber);
  const input = await readJson(resolve(process.cwd(), inputPath));
  const plan = buildDecompositionPlan({ ...input, parent: { ...input.parent, id: parent.workItem.id, number: Number(issueNumber), title: parent.workItem.title } });
  const result = plan.canApply ? await createGithubSubIssues(repo, issueNumber, plan, { dryRun: !apply }) : { applied: false, operations: [] };
  output({ ...plan, github: result }, format);
  if (!plan.valid) process.exit(1);
}

async function optionalJson(path) {
  if (!path || !(await exists(path))) return null;
  return readJson(path);
}

async function writeRecord(path, plan, verified = true) {
  const recordPath = resolve(process.cwd(), path);
  await mkdir(dirname(recordPath), { recursive: true });
  await writeFile(recordPath, `${JSON.stringify({ ...plan.record, observedHash: plan.targetHash, verified }, null, 2)}\n`);
}

async function runReconcileLabels(args) {
  const declarationPath = option(args, '--input');
  const existingPath = option(args, '--existing');
  const recordPath = option(args, '--record') ?? '.lighthouse/reconciliation/labels.json';
  const format = option(args, '--format') ?? 'json';
  const apply = args.includes('--apply');
  if (!declarationPath || !existingPath) { console.error('Usage: lighthouse-sdlc reconcile-labels --input <capabilities.json> --existing <labels.json> [--record <path>] [--apply] [--format <json|text>]'); process.exit(2); }
  const declaration = await readJson(resolve(process.cwd(), declarationPath));
  const existing = await readJson(resolve(process.cwd(), existingPath));
  const plan = buildLabelReconciliationPlan(declaration, existing, await optionalJson(resolve(process.cwd(), recordPath)));
  if (apply && plan.canApply) {
    const current = await readJson(resolve(process.cwd(), existingPath));
    const reread = buildLabelReconciliationPlan(declaration, current);
    if (reread.observedHash !== plan.observedHash) throw new Error('Label reconciliation changed since the plan was created; refusing to apply.');
    const updated = applyLabelReconciliationPlan(reread, current);
    await writeFile(resolve(process.cwd(), existingPath), `${JSON.stringify(updated, null, 2)}\n`);
    await writeRecord(recordPath, reread);
    plan.applied = true;
    plan.record = { ...reread.record, observedHash: reread.targetHash, verified: true };
  } else plan.applied = false;
  output(plan, format);
  if (!plan.valid || !plan.canApply) process.exit(1);
}

async function runGithubLabels(args) {
  const repo = option(args, '--repo');
  const declarationPath = option(args, '--input');
  const recordPath = option(args, '--record') ?? '.lighthouse/reconciliation/labels.json';
  const format = option(args, '--format') ?? 'json';
  const apply = args.includes('--apply');
  if (!repo || !declarationPath) { console.error('Usage: lighthouse-sdlc github-labels --repo <owner/repo> --input <capabilities.json> [--record <path>] [--apply] [--format <json|text>]'); process.exit(2); }
  const declaration = await readJson(resolve(process.cwd(), declarationPath));
  const labels = await readGithubLabels(repo);
  const plan = buildLabelReconciliationPlan(declaration, labels, await optionalJson(resolve(process.cwd(), recordPath)));
  if (apply && plan.canApply) {
    const current = await readGithubLabels(repo);
    if (buildLabelReconciliationPlan(declaration, current).observedHash !== plan.observedHash) throw new Error('GitHub labels changed since the plan was created; refusing to apply.');
    for (const operation of plan.operations) await createGithubLabel(repo, operation, { dryRun: false });
    const finalLabels = await readGithubLabels(repo);
    const appliedPlan = buildLabelReconciliationPlan(declaration, finalLabels);
    if (!appliedPlan.canApply || appliedPlan.operations.length > 0) throw new Error('GitHub label reconciliation did not reach the declared state.');
    await writeRecord(recordPath, appliedPlan);
    plan.applied = true;
    plan.record = { ...appliedPlan.record, observedHash: appliedPlan.targetHash, verified: true };
  } else plan.applied = false;
  output(plan, format);
  if (!plan.valid || !plan.canApply) process.exit(1);
}

const command = process.argv[2] ?? 'verify';
if (!['contract', 'verify', 'triage', 'state', 'stage-result', 'browser-e2e', 'control-plane', 'memory', 'launch', 'decompose', 'stacked', 'route', 'github-triage', 'github-decompose', 'reconcile-labels', 'github-labels'].includes(command)) {
  console.error('Usage: lighthouse-sdlc <contract|verify|triage|state|stage-result|browser-e2e|control-plane|memory|launch|decompose|stacked|route|github-triage|github-decompose|reconcile-labels|github-labels>');
  process.exit(2);
}
if (command === 'contract') {
  console.log(await readFile(contractPath, 'utf8'));
} else if (command === 'triage') {
  await runTriage(process.argv.slice(3));
} else if (command === 'state') {
  await runState(process.argv.slice(3));
} else if (command === 'control-plane') {
  await runControlPlane(process.argv.slice(3));
} else if (command === 'stage-result') {
  await runStageResult(process.argv.slice(3));
} else if (command === 'browser-e2e') {
  await runBrowserE2e(process.argv.slice(3));
} else if (command === 'memory') {
  await runMemory(process.argv.slice(3));
} else if (command === 'launch') {
  await runLaunch(process.argv.slice(3));
} else if (command === 'decompose') {
  await runDecompose(process.argv.slice(3));
} else if (command === 'route') {
  await runRoute(process.argv.slice(3));
} else if (command === 'stacked') {
  await runStacked(process.argv.slice(3));
} else if (command === 'github-triage') {
  await runGithubTriage(process.argv.slice(3));
} else if (command === 'github-decompose') {
  await runGithubDecompose(process.argv.slice(3));
} else if (command === 'reconcile-labels') {
  await runReconcileLabels(process.argv.slice(3));
} else if (command === 'github-labels') {
  await runGithubLabels(process.argv.slice(3));
} else {
  const problems = await verifyContract();
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    process.exit(1);
  }
  console.log('Lighthouse SDLC package contract is valid.');
}

export { contractPath, runTriage, verifyContract, runState, runStageResult, runBrowserE2e, runControlPlane, runMemory, runLaunch, runDecompose, runRoute, runStacked, runGithubTriage, runGithubDecompose, runReconcileLabels, runGithubLabels };
