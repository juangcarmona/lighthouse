import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateProcessGuards } from '../packages/sdlc/src/process-guards.mjs';
import { validateStageEnvelope } from '../packages/sdlc/src/host-contract.mjs';
import { stageContext } from '../packages/sdlc/src/unattended-runtime.mjs';

const proof = () => JSON.parse(readFileSync(new URL('../../docs/process/20261118-102-process-guards/managed-command.json', import.meta.url)));

test('the actual command-capture guard records behavioral red/green proof and honest unavailable pilot observations', () => {
  const value = proof();
  assert.deepEqual(validateProcessGuards(value), []);
  assert.equal(value.records[0].check.red.exitCode, 1); assert.equal(value.records[0].check.green.exitCode, 0);
  for (const observation of Object.values(value.records[0].observations)) assert.match(observation, /Unavailable/);
});

test('a reasoned no-guard disposition needs no new recurring mechanism', () => {
  assert.deepEqual(validateProcessGuards({ schemaVersion: 1, outcome: 'no-guard', reason: 'Existing assertions cover the isolated defect; no process gap was established. The owned proposal remains in the retrospective.', records: [] }), []);
  const value = proof(); value.outcome = 'no-guard'; assert.ok(validateProcessGuards(value).length);
});

test('unverified, ownerless, duplicate and unmaintainable guards are refused', () => {
  for (const mutate of [
    record => { record.check.red.exitCode = 0; },
    record => { record.check.green.exitCode = 7; },
    record => { record.check.red.evidence = []; },
    record => { record.check.green.revision = 'not a revision'; },
    record => { record.owner = ''; },
    record => { delete record.adoption.rollback; },
    record => { delete record.observations.falsePositives; },
  ]) { const value = proof(); mutate(value.records[0]); assert.ok(validateProcessGuards(value).length); }
  const duplicate = proof(); duplicate.records.push(structuredClone(duplicate.records[0])); assert.ok(validateProcessGuards(duplicate).length);
});

test('new final reviews require the guard disposition; legacy results keep their prior contract', () => {
  const request = { stage: 'review', runId: 'a'.repeat(64), processGuardReview: 1 };
  const envelope = stageContext(request, { number: 102 }).contract.envelope;
  assert.match(validateStageEnvelope(envelope, request).join('\n'), /Process guard/);
  envelope.result.output.processGuards = proof(); assert.deepEqual(validateStageEnvelope(envelope, request), []);
  delete envelope.result.output.processGuards;
  assert.deepEqual(validateStageEnvelope(envelope, { ...request, processGuardReview: undefined }), []);
});
