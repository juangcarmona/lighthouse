import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildTriageReport } from '../packages/sdlc/src/triage.mjs';

const root = process.cwd();

test('the SDLC artifact contains its contract and lifecycle assets', () => {
  const packed = spawnSync('npm', ['pack', '--workspace', '@juangcarmona/lighthouse-sdlc', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' });
  assert.equal(packed.status, 0, packed.stderr);
  const [artifact] = JSON.parse(packed.stdout);
  assert.equal(artifact.name, '@juangcarmona/lighthouse-sdlc');
  const files = artifact.files.map((file) => file.path);
  for (const path of [
    'README.md',
    'commands/status.md',
    'commands/triage.md',
    'skills/triage/SKILL.md',
    'skills/refine/SKILL.md',
    'skills/propose/SKILL.md',
    'skills/implement/SKILL.md',
    'skills/integrate/SKILL.md',
    'skills/review/SKILL.md',
    'meta-commands/ff.md',
    'meta-commands/hotfix.md',
    'meta-commands/decompose.md',
    'meta-commands/stacked.md',
    'contract.json',
    'routes.json',
    'gates.json',
    'schemas/control-plane.schema.json',
    'schemas/triage.schema.json',
    'src/sdlc.mjs',
    'src/triage.mjs',
    'package.json'
  ]) assert.ok(files.includes(path), `missing ${path}`);
  const verified = spawnSync(process.execPath, ['src/packages/sdlc/src/sdlc.mjs', 'verify'], { cwd: root, encoding: 'utf8' });
  assert.equal(verified.status, 0, verified.stderr);
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
