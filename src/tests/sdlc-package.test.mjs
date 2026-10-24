import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildDecompositionPlan } from '../packages/sdlc/src/decompose.mjs';
import { validateControlPlane, validateLaunchRequest } from '../packages/sdlc/src/control-plane.mjs';
import { createGithubSubIssues, readGithubIssue, readGithubLabels } from '../packages/sdlc/src/github.mjs';
import { applyLabelReconciliationPlan, buildLabelReconciliationPlan } from '../packages/sdlc/src/reconcile.mjs';
import { validateMemoryRecord } from '../packages/sdlc/src/memory.mjs';
import { buildRoutePlan } from '../packages/sdlc/src/routes.mjs';
import { buildStackedPlan } from '../packages/sdlc/src/stacked.mjs';
import { buildTriageReport } from '../packages/sdlc/src/triage.mjs';
import { replayWorkflow } from '../packages/sdlc/src/workflow.mjs';
import { validateStageResult } from '../packages/sdlc/src/contracts.mjs';
import { browserEvidenceReport, validateBrowserEvidence } from '../packages/sdlc/src/browser-e2e.mjs';
import { adaptBrowserEvidence, adaptStageResult, buildEvidenceIndex, validateEvidenceIndex, validateEvidenceRecord } from '../packages/sdlc/src/evidence.mjs';
import { capabilityAdapter, declarationFromCatalog, initialAdoptionStatus, readCapabilityCatalog, validateCapabilityCatalog } from '../packages/sdlc/src/capabilities.mjs';
import { readCommandAliases, validateCommandAliases, verifyCommandAliases } from '../packages/sdlc/src/aliases.mjs';

const root = process.cwd();

test('the SDLC artifact contains its contract and lifecycle assets', async () => {
  const packed = spawnSync('npm', ['pack', '--workspace', '@juangcarmona/lighthouse-sdlc', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' });
  assert.equal(packed.status, 0, packed.stderr);
  const [artifact] = JSON.parse(packed.stdout);
  assert.equal(artifact.name, '@juangcarmona/lighthouse-sdlc');
  const files = artifact.files.map((file) => file.path);
  for (const path of [
    'README.md',
    'commands/status.md',
    'commands/aliases.md',
    'commands/control-plane.md',
    'commands/decompose.md',
    'commands/github-triage.md',
    'commands/github-decompose.md',
    'commands/reconcile-labels.md',
    'commands/github-labels.md',
    'commands/memory.md',
    'commands/launch.md',
    'commands/route.md',
    'commands/stacked.md',
    'commands/stage-result.md',
    'commands/browser-e2e.md',
    'commands/evidence.md',
    'commands/state.md',
    'commands/triage.md',
    'skills/triage/SKILL.md',
    'skills/refine/SKILL.md',
    'skills/propose/SKILL.md',
    'skills/implement/SKILL.md',
    'skills/integrate/SKILL.md',
    'skills/review/SKILL.md',
    'skills/browser-e2e/SKILL.md',
    'meta-commands/ff.md',
    'meta-commands/hotfix.md',
    'meta-commands/decompose.md',
    'meta-commands/stacked.md',
    'contract.json',
    'command-aliases.json',
    'routes.json',
    'gates.json',
    'stages.json',
    'schemas/control-plane.schema.json',
    'schemas/triage.schema.json',
    'schemas/stage-result.schema.json',
    'schemas/workflow-state.schema.json',
    'schemas/decomposition.schema.json',
    'schemas/capabilities.schema.json',
    'schemas/capability-catalog.schema.json',
    'schemas/browser-e2e.schema.json',
    'schemas/evidence-record.schema.json',
    'schemas/evidence-index.schema.json',
    'schemas/command-aliases.schema.json',
    'src/aliases.mjs',
    'src/browser-e2e.mjs',
    'src/evidence.mjs',
    'capabilities.json',
    'src/contracts.mjs',
    'src/capabilities.mjs',
    'src/control-plane.mjs',
    'src/decompose.mjs',
    'src/github.mjs',
    'src/memory.mjs',
    'src/reconcile.mjs',
    'src/routes.mjs',
    'src/sdlc.mjs',
    'src/triage.mjs',
    'src/workflow.mjs',
    'workflows/lighthouse-sdlc-router.yml',
    'workflows/lighthouse-sdlc-triage.md', 'workflows/lighthouse-sdlc-triage.lock.yml',
    'workflows/lighthouse-sdlc-refine.md', 'workflows/lighthouse-sdlc-refine.lock.yml',
    'workflows/lighthouse-sdlc-propose.md', 'workflows/lighthouse-sdlc-propose.lock.yml',
    'workflows/lighthouse-sdlc-implement.md', 'workflows/lighthouse-sdlc-implement.lock.yml',
    'workflows/lighthouse-sdlc-integrate.md', 'workflows/lighthouse-sdlc-integrate.lock.yml',
    'workflows/lighthouse-sdlc-review.md', 'workflows/lighthouse-sdlc-review.lock.yml',
    'workflows/shared/lighthouse-sdlc-stage.md',
    'package.json'
  ]) assert.ok(files.includes(path), `missing ${path}`);
  for (const path of [
    'lighthouse-sdlc-router.yml',
    'lighthouse-sdlc-triage.md', 'lighthouse-sdlc-triage.lock.yml',
    'lighthouse-sdlc-refine.md', 'lighthouse-sdlc-refine.lock.yml',
    'lighthouse-sdlc-propose.md', 'lighthouse-sdlc-propose.lock.yml',
    'lighthouse-sdlc-implement.md', 'lighthouse-sdlc-implement.lock.yml',
    'lighthouse-sdlc-integrate.md', 'lighthouse-sdlc-integrate.lock.yml',
    'lighthouse-sdlc-review.md', 'lighthouse-sdlc-review.lock.yml',
  ]) {
    assert.equal(await readFile(join(root, `.github/workflows/${path}`), 'utf8'), await readFile(join(root, `src/packages/sdlc/workflows/${path}`), 'utf8'));
  }
  assert.equal(await readFile(join(root, '.github/workflows/shared/lighthouse-sdlc-stage.md'), 'utf8'), await readFile(join(root, 'src/packages/sdlc/workflows/shared/lighthouse-sdlc-stage.md'), 'utf8'));
  const verified = spawnSync(process.execPath, ['src/packages/sdlc/src/sdlc.mjs', 'verify'], { cwd: root, encoding: 'utf8' });
  assert.equal(verified.status, 0, verified.stderr);
  const aliases = spawnSync(process.execPath, ['src/packages/sdlc/src/sdlc.mjs', 'aliases', '--format', 'json'], { cwd: root, encoding: 'utf8' });
  assert.equal(aliases.status, 0, aliases.stderr);
  const aliasReport = JSON.parse(aliases.stdout);
  assert.equal(aliasReport.status, 'valid');
  assert.equal(aliasReport.aliases.find((item) => item.alias === '/lh:impl').canonical, '/lighthouse:implement');
});

test('the SDLC alias contract is deterministic and fails closed on collisions', async () => {
  const contract = await readCommandAliases();
  assert.deepEqual(validateCommandAliases(contract), []);
  assert.equal(contract.aliases.find((item) => item.alias === '/lh:control').canonical, '/lighthouse:control-plane');
  const duplicateAlias = { ...contract, aliases: [...contract.aliases, { ...contract.aliases[0], canonical: '/lighthouse:status' }] };
  assert.ok(validateCommandAliases(duplicateAlias).some((error) => error.code === 'aliases.duplicate'));
  const duplicateTarget = { ...contract, aliases: [...contract.aliases, { ...contract.aliases[0], alias: '/lh:other' }] };
  assert.ok(validateCommandAliases(duplicateTarget).some((error) => error.code === 'aliases.duplicate-target'));
  const unknownAsset = { ...contract, aliases: contract.aliases.map((item, index) => index === 0 ? { ...item, asset: 'commands/missing.md' } : item) };
  assert.ok((await verifyCommandAliases(unknownAsset)).some((error) => error.code === 'aliases.missing-asset'));
});

test('the capability catalog is versioned, validates independently and projects the label declaration', async () => {
  const catalog = await readCapabilityCatalog();
  assert.deepEqual(validateCapabilityCatalog(catalog), []);
  assert.equal(catalog.package.name, '@juangcarmona/lighthouse-sdlc');
  assert.equal(catalog.capabilities[0].adapter, 'github-labels');
  assert.equal(capabilityAdapter(catalog.capabilities[0]), 'github-labels');
  assert.equal(initialAdoptionStatus(catalog.capabilities[0]), 'pending-adoption');
  const declaration = declarationFromCatalog(catalog, 'labels');
  assert.equal(declaration.capabilities[0].provider, 'github');
  assert.equal(declaration.capabilities[0].adapter, 'github-labels');
  assert.equal(declaration.capabilities[0].configuration.labels.find((label) => label.name === 'size-m').color, '80C2FF');
  assert.deepEqual(declaration.capabilities[0].configuration.transitions, [{ from: 'triage', to: 'refine' }]);
});

test('the catalog fails closed when a future capability has no registered adapter', async () => {
  const catalog = await readCapabilityCatalog();
  const future = {
    ...catalog,
    capabilities: [{
      id: 'hooks',
      provider: 'git',
      adapter: 'git-hooks',
      version: '1',
      title: 'Future hooks',
      selection: 'opt-in',
      configuration: { hooks: [] },
      operations: { allowed: ['create', 'preserve'], blocked: ['modify', 'rename', 'remove', 'ambiguous'] },
    }],
  };
  const errors = validateCapabilityCatalog(future);
  assert.ok(errors.some((error) => error.code === 'catalog.adapter-unsupported'));
  assert.equal(capabilityAdapter(future.capabilities[0]), null);
  assert.equal(initialAdoptionStatus({ selection: 'opt-in' }), 'available');
});

test('browser E2E evidence is deterministic and keeps missing, unavailable and pending states explicit', () => {
  const evidence = {
    schemaVersion: 1,
    runner: 'playwright',
    journey: { id: 'checkout.complete', boundedContext: 'checkout', title: 'Complete checkout' },
    command: 'npm run test:e2e -- checkout.complete',
    status: 'passed',
    evidence: [{ id: 'checkout.page', status: 'passed', source: 'playwright:test' }],
    artifacts: [{ type: 'trace', path: 'test-results/checkout/trace.zip' }],
    nextAction: 'Proceed to review.'
  };
  assert.deepEqual(validateBrowserEvidence(evidence), []);
  assert.equal(browserEvidenceReport(evidence).status, 'passed');
  const pending = { ...evidence, status: 'pending-review', evidence: [{ id: 'checkout.page', status: 'pending-review', source: 'playwright:test', reason: 'Product owner review is pending.' }], artifacts: [] };
  assert.deepEqual(validateBrowserEvidence(pending), []);
  const invalid = browserEvidenceReport({ ...evidence, artifacts: [{ type: 'trace', path: '/tmp/trace.zip' }] });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.code === 'browser-e2e.artifact'));
});

test('evidence adapters preserve existing producer payloads and build deterministic coverage', () => {
  const stage = {
    schemaVersion: 1,
    runId: 'run-1',
    stage: 'implement',
    status: 'passed',
    gate: 'done',
    evidence: [{ id: 'unit', status: 'passed', source: 'vitest' }],
    missingEvidence: [],
    unavailableChecks: [],
    pendingReview: [],
    nextAction: 'Continue to integrate.'
  };
  const browser = {
    schemaVersion: 1,
    runner: 'playwright',
    journey: { id: 'checkout.complete', boundedContext: 'checkout' },
    command: 'npm run test:e2e',
    status: 'passed',
    evidence: [{ id: 'checkout.page', status: 'passed', source: 'playwright:test' }],
    artifacts: [{ type: 'trace', path: 'test-results/checkout/trace.zip' }],
    nextAction: 'Proceed to review.'
  };
  const stageRecord = adaptStageResult(stage, { id: 'stage-1', subject: { type: 'product-requirement', id: 'FR-EVIDENCE-CONTRACT-001' } });
  const browserRecord = adaptBrowserEvidence(browser, { id: 'browser-1', subject: { type: 'architecture-decision', id: 'ADR-0001' } });
  assert.deepEqual(stageRecord.errors, []);
  assert.deepEqual(browserRecord.errors, []);
  assert.deepEqual(validateEvidenceRecord(stageRecord.record), []);
  assert.deepEqual(validateEvidenceRecord(browserRecord.record), []);
  assert.deepEqual(stageRecord.record.payload, stage);
  const first = buildEvidenceIndex([stageRecord.record, browserRecord.record], { indexId: 'index-1', repository: 'fixture/project', revision: 'abc123', subjects: [{ type: 'product-requirement', id: 'FR-EVIDENCE-CONTRACT-001' }, { type: 'architecture-decision', id: 'ADR-0001' }] });
  const second = buildEvidenceIndex([stageRecord.record, browserRecord.record], { indexId: 'index-1', repository: 'fixture/project', revision: 'abc123', subjects: [{ type: 'product-requirement', id: 'FR-EVIDENCE-CONTRACT-001' }, { type: 'architecture-decision', id: 'ADR-0001' }] });
  assert.deepEqual(first.errors, []);
  assert.deepEqual(first.index, second.index);
  assert.deepEqual(first.index.coverage.map((item) => item.status), ['verified', 'verified']);
  assert.deepEqual(validateEvidenceIndex(first.index), []);
});

test('evidence coverage distinguishes missing, incomplete and conflicting observations', () => {
  const base = { schemaVersion: 1, id: 'e-1', runId: 'run-1', kind: 'verification', scope: 'delivery', producer: 'fixture', payload: {}, subject: { type: 'product-requirement', id: 'FR-1' } };
  const incomplete = buildEvidenceIndex([{ ...base, status: 'pending-review', nextAction: 'Ask for human review.' }], { subjects: [{ type: 'product-requirement', id: 'FR-2' }] });
  assert.equal(incomplete.index.coverage.find((item) => item.subject.id === 'FR-1').status, 'incomplete');
  assert.equal(incomplete.index.coverage.find((item) => item.subject.id === 'FR-2').status, 'unverified');
  const conflict = buildEvidenceIndex([{ ...base, id: 'e-passed', status: 'passed' }, { ...base, id: 'e-failed', status: 'failed', nextAction: 'Resolve the failed check.' }]);
  assert.equal(conflict.index.coverage[0].status, 'conflict');
});

test('evidence CLI builds and validates an index only when output is explicit', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-evidence-cli-'));
  try {
    const inputPath = join(dir, 'records.json');
    const outputPath = join(dir, 'index.json');
    await writeFile(inputPath, await readFile(new URL('./fixtures/evidence/records.json', import.meta.url), 'utf8'));
    const build = spawnSync(process.execPath, ['src/packages/sdlc/src/sdlc.mjs', 'evidence', '--input', inputPath, '--build', '--output', outputPath, '--format', 'json'], { cwd: root, encoding: 'utf8' });
    assert.equal(build.status, 0, build.stderr);
    const report = JSON.parse(build.stdout);
    assert.equal(report.status, 'valid');
    assert.equal(JSON.parse(await readFile(join(dir, 'records/stage-1.json'), 'utf8')).id, 'stage-1');
    const index = JSON.parse(await readFile(outputPath, 'utf8'));
    assert.equal(index.coverage.length, 2);
    assert.deepEqual(validateEvidenceIndex(index), []);
    const validate = spawnSync(process.execPath, ['src/packages/sdlc/src/sdlc.mjs', 'evidence', '--input', outputPath, '--format', 'json'], { cwd: root, encoding: 'utf8' });
    assert.equal(validate.status, 0, validate.stderr);
    assert.equal(JSON.parse(validate.stdout).status, 'valid');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

function triageInput(overrides = {}) {
  return {
    schemaVersion: 1,
    workItem: { id: 'GH-42', title: 'Add the report', type: 'feature' },
    currentLabels: ['triage', 'unrelated'],
    assessment: {
      size: 'M',
      urgency: 'asap',
      impact: 'medium',
      risk: 'low',
      blastRadius: 'low',
      dependencies: [],
      route: 'supervised',
      nextState: 'refine',
      owner: 'juan',
      confidence: { size: 'high', urgency: 'medium', impact: 'medium', risk: 'high', 'blast-radius': 'medium' },
      evidence: ['size', 'urgency', 'impact', 'risk', 'blast-radius'].map((field) => ({ field, source: `fixture:${field}` }))
    },
    configuration: {
      labels: [
        { name: 'triage', role: 'state' },
        { name: 'refine', role: 'state' },
        { name: 'size-m', role: 'classification', dimension: 'size', value: 'M' },
        { name: 'urgency-asap', role: 'classification', dimension: 'urgency', value: 'asap' },
        { name: 'impact-medium', role: 'classification', dimension: 'impact', value: 'medium' },
        { name: 'risk-low', role: 'classification', dimension: 'risk', value: 'low' },
        { name: 'blast-radius-low', role: 'classification', dimension: 'blast-radius', value: 'low' }
      ],
      transitions: [{ from: 'triage', to: 'refine' }]
    },
    ...overrides
  };
}

test('triage produces a deterministic ready report and label projection', () => {
  const input = triageInput();
  const first = buildTriageReport(input);
  const second = buildTriageReport(input);
  assert.deepEqual(first, second);
  assert.equal(first.status, 'ready');
  assert.equal(first.canApply, true);
  assert.deepEqual(first.labels.proposed, ['blast-radius-low', 'impact-medium', 'refine', 'risk-low', 'size-m', 'unrelated', 'urgency-asap']);
  assert.equal(first.transition.from, 'triage');
  assert.equal(first.transition.to, 'refine');
});

test('triage rejects ambiguous classifications and reports missing evidence', () => {
  const input = triageInput({
    currentLabels: ['triage', 'size-m', 'size-s'],
    assessment: { ...triageInput().assessment, evidence: [] },
    configuration: {
      ...triageInput().configuration,
      labels: [...triageInput().configuration.labels, { name: 'size-s', role: 'classification', dimension: 'size', value: 'S' }]
    }
  });
  const report = buildTriageReport(input);
  assert.equal(report.status, 'invalid');
  assert.equal(report.canApply, false);
  assert.ok(report.errors.some((item) => item.code === 'classification.ambiguous'));
  assert.deepEqual(report.missingEvidence, ['size', 'urgency', 'impact', 'risk', 'blast-radius']);
});

test('triage keeps unavailable checks and pending judgement separate from missing evidence', () => {
  const input = triageInput({
    assessment: {
      ...triageInput().assessment,
      evidence: [
        { field: 'size', status: 'provided', source: 'fixture:size' },
        { field: 'urgency', status: 'unavailable', reason: 'tracker has no due-date data' },
        { field: 'impact', status: 'pending-review', reason: 'product owner must confirm affected users' },
        { field: 'risk', status: 'provided', source: 'fixture:risk' }
      ]
    }
  });
  const report = buildTriageReport(input);
  assert.equal(report.status, 'blocked');
  assert.deepEqual(report.missingEvidence, ['blast-radius']);
  assert.deepEqual(report.unavailableChecks, ['urgency']);
  assert.deepEqual(report.pendingReview, ['impact']);
  assert.equal(report.canApply, false);
});

test('triage rejects duplicate evidence statuses for one field', () => {
  const input = triageInput({
    assessment: {
      ...triageInput().assessment,
      evidence: [
        ...triageInput().assessment.evidence,
        { field: 'risk', status: 'pending-review', reason: 'owner confirmation is required' }
      ]
    }
  });
  const report = buildTriageReport(input);
  assert.equal(report.status, 'invalid');
  assert.ok(report.errors.some((item) => item.code === 'assessment.evidence-duplicate'));
});

test('triage CLI is read-only by default and applies only after an explicit matching request', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-triage-'));
  try {
    const inputPath = join(dir, 'triage.json');
    const labelsPath = join(dir, 'labels.json');
    await writeFile(inputPath, `${JSON.stringify(triageInput(), null, 2)}\n`);
    await writeFile(labelsPath, `${JSON.stringify(['triage', 'unrelated'])}\n`);
    const command = ['src/packages/sdlc/src/sdlc.mjs', 'triage', '--input', inputPath, '--format', 'json'];
    const preview = spawnSync(process.execPath, command, { cwd: root, encoding: 'utf8' });
    assert.equal(preview.status, 0, preview.stderr);
    assert.equal(JSON.parse(await readFile(labelsPath, 'utf8')).join(','), 'triage,unrelated');
    const applied = spawnSync(process.execPath, [...command, '--apply', '--labels-file', labelsPath], { cwd: root, encoding: 'utf8' });
    assert.equal(applied.status, 0, applied.stderr);
    assert.deepEqual(JSON.parse(await readFile(labelsPath, 'utf8')), ['blast-radius-low', 'impact-medium', 'refine', 'risk-low', 'size-m', 'unrelated', 'urgency-asap']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('label reconciliation preserves existing values, adds only missing labels and is idempotent', async () => {
  const declaration = {
    schemaVersion: 1,
    capabilities: [{
      id: 'labels',
      provider: 'github',
      version: '1',
      configuration: {
        labels: [
          { name: 'triage', role: 'state', color: '4DA3FF', description: 'workflow state' },
          { name: 'size-s', role: 'classification', dimension: 'size', value: 'S' },
          { name: 'size-m', role: 'classification', dimension: 'size', value: 'M' },
        ],
        transitions: [],
      },
    }],
  };
  const existing = [
    { name: 'triage', color: '123456', description: 'project-owned' },
    { name: 'custom', color: 'abcdef', description: 'keep' },
  ];
  const first = buildLabelReconciliationPlan(declaration, existing);
  assert.deepEqual(first, buildLabelReconciliationPlan(declaration, existing));
  assert.equal(first.status, 'ready');
  assert.deepEqual(first.operations.map((operation) => operation.name), ['size-m', 'size-s']);
  assert.equal(first.changes.find((change) => change.name === 'triage').status, 'customized');
  assert.equal(first.changes.find((change) => change.name === 'custom').status, 'preserved');
  const applied = applyLabelReconciliationPlan(first, existing);
  assert.deepEqual(applied.map((label) => label.name), ['custom', 'size-m', 'size-s', 'triage']);
  assert.equal(applied.find((label) => label.name === 'triage').color, '123456');
  const second = buildLabelReconciliationPlan(declaration, applied, first.record);
  assert.equal(second.operations.length, 0);
  assert.equal(second.drift.status, 'none');
});

test('label reconciliation blocks unsupported providers and malformed declarations', () => {
  const plan = buildLabelReconciliationPlan({ schemaVersion: 1, capabilities: [{ id: 'labels', provider: 'gitlab', version: '1', configuration: { labels: [], transitions: [] } }] }, []);
  assert.equal(plan.canApply, false);
  assert.ok(plan.errors.some((error) => error.code === 'capability.provider-unsupported'));
});

test('label reconciliation stops on a possible equivalent with a different name', () => {
  const declaration = {
    schemaVersion: 1,
    capabilities: [{ id: 'labels', provider: 'github', version: '1', configuration: { labels: [{ name: 'size-s', role: 'classification', dimension: 'size', value: 'S' }], transitions: [] } }],
  };
  const plan = buildLabelReconciliationPlan(declaration, [{ name: 'Size: S', color: 'BFE3FF' }]);
  assert.equal(plan.status, 'blocked');
  assert.equal(plan.canApply, false);
  assert.equal(plan.changes.find((change) => change.name === 'size-s').status, 'conflict');
  assert.equal(plan.operations.length, 0);
});

test('workflow state replays independently per run and rejects illegal transitions', () => {
  const events = [
    { schemaVersion: 1, eventId: 'e1', runId: 'run-a', route: 'supervised', stage: 'triage', from: null, to: 'ready', actor: 'fixture', timestamp: '2026-01-01T00:00:00Z', reason: 'created', evidence: [] },
    { schemaVersion: 1, eventId: 'e2', runId: 'run-a', route: 'supervised', stage: 'triage', from: 'ready', to: 'running', actor: 'fixture', timestamp: '2026-01-01T00:01:00Z', reason: 'started', evidence: [] },
    { schemaVersion: 1, eventId: 'e3', runId: 'run-b', route: 'plan-only', stage: 'triage', from: null, to: 'ready', actor: 'fixture', timestamp: '2026-01-01T00:00:00Z', reason: 'created', evidence: [] },
  ];
  const replayed = replayWorkflow(events);
  assert.equal(replayed.valid, true);
  assert.equal(replayed.runs['run-a'].state, 'running');
  assert.equal(replayed.runs['run-b'].state, 'ready');
  const invalid = replayWorkflow([...events, { ...events[1], eventId: 'e4', from: 'running', to: 'ready' }]);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.code === 'state-event.transition'));
});

test('decomposition produces a deterministic dependency order and catches cycles', () => {
  const input = { schemaVersion: 1, parent: { id: 'GH-10', title: 'Feature' }, slices: [
    { id: 'slice-b', title: 'B', acceptance: ['B evidence'], dependencies: ['slice-a'], scope: ['src/b'] },
    { id: 'slice-a', title: 'A', acceptance: ['A evidence'], dependencies: [], scope: ['src/a'] },
  ] };
  const plan = buildDecompositionPlan(input);
  assert.equal(plan.status, 'ready');
  assert.deepEqual(plan.order, ['slice-a', 'slice-b']);
  assert.deepEqual(plan, buildDecompositionPlan(input));
  const cycle = buildDecompositionPlan({ ...input, slices: input.slices.map((slice) => ({ ...slice, dependencies: slice.id === 'slice-a' ? ['slice-b'] : slice.dependencies })) });
  assert.equal(cycle.status, 'invalid');
  assert.ok(cycle.errors.some((error) => error.code === 'decompose.cycle'));
});

test('route plans expose unmet prerequisites before mutation', () => {
  const route = { id: 'unattended', stages: ['triage', 'refine', 'propose', 'implement', 'integrate', 'review'], humanGates: ['triaged', 'ready', 'planned', 'done'], requires: ['bounded-agent-run', 'independent-review'] };
  const blocked = buildRoutePlan(route, { available: ['bounded-agent-run'] });
  assert.equal(blocked.status, 'blocked');
  assert.equal(blocked.canRun, false);
  const ready = buildRoutePlan(route, { available: ['bounded-agent-run', 'independent-review'] });
  assert.equal(ready.status, 'ready');
  assert.equal(ready.canRun, true);
});

test('stacked plans follow dependency order and isolate pull-request bases', () => {
  const plan = buildStackedPlan({ parent: { id: 'GH-10', title: 'Feature', base: 'main' }, slices: [
    { id: 'slice-b', title: 'B', dependencies: ['slice-a'], acceptance: ['B evidence'] },
    { id: 'slice-a', title: 'A', dependencies: [], acceptance: ['A evidence'] },
  ] });
  assert.equal(plan.status, 'ready');
  assert.deepEqual(plan.order, ['slice-a', 'slice-b']);
  assert.equal(plan.operations[0].base, 'main');
  assert.equal(plan.operations[1].base, plan.slices.find((slice) => slice.id === 'slice-a').branch);
});

test('control-plane validation keeps provider runtime outside the declaration', () => {
  const valid = validateControlPlane({ schemaVersion: 1, package: { name: '@juangcarmona/lighthouse-sdlc', version: '0.3.0' }, routes: ['supervised'], gates: ['triaged'], state: { provider: 'agent-host' }, memory: { provider: 'agent-host', scopes: ['run', 'project'] }, roles: {}, adapters: {} });
  assert.deepEqual(valid, []);
  const invalid = validateControlPlane({ schemaVersion: 1, package: { name: '@juangcarmona/lighthouse-sdlc', version: '0.3.0' }, routes: ['supervised'], gates: ['triaged'], state: { provider: 'agent-host' }, memory: { provider: 'agent-host', scopes: ['shared'] }, roles: { worker: { inputSchema: 'in.json', outputSchema: 'out.json', tools: ['read'], writeScope: [] } }, adapters: {} });
  assert.ok(invalid.length > 0);
});

test('memory validation enforces typed run and project scopes', () => {
  const valid = validateMemoryRecord({ id: 'm-1', scope: 'run', runId: 'run-1', owner: 'agent', source: 'fixture', confidence: 'high', retention: 'run', sensitivity: 'internal', value: { fact: 'known' } });
  assert.deepEqual(valid, []);
  const shared = validateMemoryRecord({ id: 'm-2', scope: 'shared', owner: 'agent', source: 'fixture', confidence: 'medium', retention: 'project', sensitivity: 'internal', value: {} });
  assert.ok(shared.some((error) => error.code === 'memory.shared-disabled'));
});

test('agent launch validation is bounded by the declared role contract', () => {
  const controlPlane = { roles: { worker: { inputSchema: 'in.json', outputSchema: 'out.json', tools: ['read'], writeScope: ['src/'] } } };
  const valid = validateLaunchRequest({ runId: 'run-1', role: 'worker', outputSchema: 'out.json', tools: ['read'], writeScope: ['src/'], limits: { attempts: 1 }, stopConditions: ['schema-invalid'] }, controlPlane);
  assert.deepEqual(valid, []);
  const invalid = validateLaunchRequest({ runId: 'run-1', role: 'worker', outputSchema: 'out.json', tools: ['write'], writeScope: ['infra/'], limits: {}, stopConditions: [] }, controlPlane);
  assert.ok(invalid.some((error) => error.code === 'launch.tool'));
  assert.ok(invalid.some((error) => error.code === 'launch.write-path'));
});

test('stage results require an explicit next action and evidence statuses', () => {
  const valid = validateStageResult({ schemaVersion: 1, runId: 'run-1', stage: 'triage', status: 'ready', gate: 'triaged', input: {}, output: {}, evidence: [{ id: 'issue-read', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'refine' });
  assert.deepEqual(valid, []);
  const invalid = validateStageResult({ schemaVersion: 1, runId: 'run-1', stage: 'triage', status: 'ready', gate: 'triaged', evidence: [{ id: 'issue-read', status: 'unknown' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: '' });
  assert.ok(invalid.some((error) => error.code === 'stage-result.evidence-item'));
  assert.ok(invalid.some((error) => error.code === 'stage-result.nextAction'));
});

test('GitHub issue projection is deterministic with a provider fixture', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-github-'));
  try {
    const fixture = join(dir, 'issue.json');
    const command = join(dir, 'gh-fixture.mjs');
    await writeFile(fixture, JSON.stringify({ number: 42, title: 'Add the report', html_url: 'https://github.com/example/project/issues/42', state: 'open', labels: [{ name: 'triage' }, { name: 'size-m' }], parent: { number: 10 }, sub_issues: [{ number: 43 }], dependencies: [{ number: 7, status: 'blocked-by' }] }));
    await writeFile(command, `#!/usr/bin/env node\nimport { readFile } from 'node:fs/promises';\nprocess.stdout.write(await readFile(${JSON.stringify(fixture)}, 'utf8'));\n`);
    await chmod(command, 0o755);
    const first = await readGithubIssue('example/project', '42', { command });
    const second = await readGithubIssue('example/project', '42', { command });
    assert.deepEqual(first, second);
    assert.deepEqual(first.currentLabels, ['size-m', 'triage']);
    assert.equal(first.workItem.id, 'GH-42');
    assert.deepEqual(first.links.subIssues, [{ number: 43 }]);
    assert.deepEqual(first.dependencies, [{ number: 7, status: 'blocked-by' }]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('GitHub label projection is sorted and read-only by default', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-github-labels-'));
  try {
    const fixture = join(dir, 'labels.json');
    const command = join(dir, 'gh-fixture.mjs');
    await writeFile(fixture, JSON.stringify([{ name: 'size-m', color: '4DA3FF', description: null }, { name: 'triage', color: '8B949E' }]));
    await writeFile(command, `#!/usr/bin/env node\nimport { readFile } from 'node:fs/promises';\nprocess.stdout.write(await readFile(${JSON.stringify(fixture)}, 'utf8'));\n`);
    await chmod(command, 0o755);
    assert.deepEqual(await readGithubLabels('example/project', { command }), [{ name: 'size-m', color: '4DA3FF', description: null }, { name: 'triage', color: '8B949E', description: null }]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('GitHub decomposition stays read-only until apply is explicit', async () => {
  const plan = buildDecompositionPlan({ schemaVersion: 1, parent: { id: 'GH-10', title: 'Feature' }, slices: [{ id: 'slice-a', title: 'A', acceptance: ['A evidence'], dependencies: [] }] });
  const preview = await createGithubSubIssues('example/project', 10, plan);
  assert.equal(preview.applied, false);
  assert.equal(preview.operations[0].parent, 10);
  assert.match(preview.operations[0].body, /Parent issue: #10/);
});
