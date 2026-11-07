import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stageContext, executeUnattendedStage } from '../packages/sdlc/src/unattended-runtime.mjs';
import { validateStageEnvelope } from '../packages/sdlc/src/host-contract.mjs';
import { validateEstimate } from '../packages/sdlc/src/request-triage.mjs';
import estimateSchema from '../packages/sdlc/schemas/estimate.schema.json' with { type: 'json' };

const request = stage => ({ runId: 'f'.repeat(64), issue: 1, stage, worker: stage, sourceRevision: 'a'.repeat(40) });

test('native estimating stages expose the canonical schema and required stage status without inventing an estimate', () => {
  for (const [stage, status] of [['triage', 'provisional'], ['refine', 'confirmed']]) {
    const context = stageContext(request(stage), {});
    assert.deepEqual(context.contract.estimate, { schema: estimateSchema, status });
    assert.match(context.contract.rules, /contract\.estimate/);
    assert.equal(context.contract.envelope.result.output.estimate, undefined);
    const estimate = { points: 2, status, confidence: 'high', uncertainty: [],
      rationale: { scope: 'Two additive source facts.', dependencies: 'The existing collector is available.', verification: 'Focused collector and browser cases.' } };
    const envelope = structuredClone(context.contract.envelope);
    assert.deepEqual(validateEstimate(estimate, { provisional: stage === 'triage' }), []);
    envelope.result.output.estimate = estimate;
    assert.deepEqual(validateStageEnvelope(envelope, context.request), []);
    envelope.result.output.estimate = { points: 2, confirmed: true, reason: 'A small projection.' };
    assert.ok(validateEstimate(envelope.result.output.estimate, { provisional: stage === 'triage' }).length);
    if (stage === 'refine') assert.ok(validateStageEnvelope(envelope, context.request).some(error => /estimate\.(status|confidence|rationale|uncertainty)/.test(error)));
  }
  assert.equal(stageContext(request('implement'), {}).contract.estimate, undefined);
  const review = stageContext({ ...request('integrate'), worker: 'independent-review', reviewOutput: { protocol: 'verdict-v1', purpose: 'plan', binding: 'b'.repeat(64) } }, {});
  assert.equal(review.contract.estimate, undefined);
  assert.equal(review.contract.envelope, undefined);
  assert.equal(review.contract.review.binding, 'b'.repeat(64));
});

test('real native context serialization preserves values and keeps the contract visible to bounded line readers', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-readable-context-'));
  const config = join(root, 'engine.json');
  await writeFile(config, JSON.stringify({ image: 'invalid' }));
  const admitted = request('refine'), context = stageContext(admitted, { body: 'A'.repeat(5000) });
  try {
    await assert.rejects(executeUnattendedStage({ root, request: admitted, source: new Map(), context,
      prompt: 'Return the configured startup failure; no Docker execution.',
      env: { PATH: process.env.PATH, HOME: root, LIGHTHOUSE_ENGINE_CONFIG: config, GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '1' } }), /Invalid operator engine configuration/);
    const serialized = await readFile(join(root, admitted.runId, 'tmp/lighthouse-123-1/context.json'), 'utf8');
    assert.deepEqual(JSON.parse(serialized), context);
    const visible = serialized.split('\n').map(line => line.slice(0, 2000)).join('\n');
    assert.match(visible, /"estimate"\s*:/);
    assert.match(visible, /"confidence"\s*:/);
    assert.match(visible, /"status": "confirmed"/);
    await assert.rejects(executeUnattendedStage({ root, request: admitted, source: new Map(),
      context: { body: 'A'.repeat(2 * 1024 * 1024) }, prompt: '', env: {} }), /context exceeds.*2 MiB/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('packaged estimating skill pointers resolve to the shared intake and estimate schema', async () => {
  for (const stage of ['triage', 'refine']) {
    const file = new URL(`../packages/sdlc/skills/${stage}/SKILL.md`, import.meta.url);
    const source = await readFile(file, 'utf8');
    for (const target of ['../../request-triage.md', '../../schemas/estimate.schema.json']) {
      assert.ok(source.includes(`](${target})`), `${stage}: explicit reachable ${target}`);
      await access(new URL(target, file));
    }
  }
});
