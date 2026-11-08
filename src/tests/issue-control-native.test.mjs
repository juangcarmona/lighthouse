import test from 'node:test';
import assert from 'node:assert/strict';
import { createIssueIntent, canonicalIssueIntent } from '../packages/sdlc/src/issue-control-intent.mjs';
import { createControlRequest } from '../packages/sdlc/src/issue-control-ledger.mjs';
import { controlStageDispatch } from '../packages/sdlc/src/issue-control-admission.mjs';
import { loadClientDispatch, clientDispatchRoute, checkClientSnapshot } from '../packages/sdlc/src/issue-control-native.mjs';
import { stageContext } from '../packages/sdlc/src/unattended-runtime.mjs';
import { validateStageEnvelope } from '../packages/sdlc/src/host-contract.mjs';

function fixture() {
  const actor = { id: 11, type: 'User', login: 'owner' }, repository = 'owner/repo';
  const metadata = { id: 22, full_name: repository, owner: actor, default_branch: 'main' };
  const facts = { availability: 'available', repository: { id: 22, name: repository }, issue: { id: 33, number: 7 }, actor,
    sourceRevision: 'a'.repeat(40), defaultBranch: 'main', inputDigest: 'b'.repeat(64), policy: { digest: 'c'.repeat(64), autoImplement: true, productChangeEnabled: true },
    capability: { digest: 'd'.repeat(64), stages: ['refine'] }, actions: { refine: { eligible: true } } };
  const intent = createIssueIntent({ id: '12345678-1234-4234-8234-123456789abc', facts, action: 'refine' });
  const event = { sender: actor, inputs: { issue: '7', stage: 'refine', workflow: 'stage', client_request: canonicalIssueIntent(intent) } };
  const request = createControlRequest(intent, facts.sourceRevision, 44, 1);
  const run = { id: 44, run_attempt: 1, path: '.github/workflows/lighthouse-sdlc-router.yml', event: 'workflow_dispatch',
    head_sha: facts.sourceRevision, head_branch: 'main', repository: metadata, actor, triggering_actor: actor };
  const native = controlStageDispatch({ request, facts, run, event, repository, owner: 'owner' });
  const options = { repository, owner: 'owner', native, api: async path => path === '' ? metadata : run, readArtifact: async () => request };
  return { request, native, options, facts, run };
}

test('an authenticated native worker loads the exact original client request and preserves its stage-only grant', async () => {
  const { request, native, options } = fixture();
  const loaded = await loadClientDispatch(options); assert.deepEqual(loaded, request);
  assert.equal(clientDispatchRoute(loaded, native, { id: 33, number: 7, state: 'open' }, []).stage, 'refine');
  for (const changed of [{ autoImplement: true }, { productChangeEnabled: true }, { stage: 'implement' }, { handoff: true }, { worker: 'product-change' },
    { client: { ...native.client, key: 'e'.repeat(64) } }])
    await assert.rejects(loadClientDispatch({ ...options, native: { ...native, ...changed } }), /grant-mismatch/);
  assert.equal(await loadClientDispatch({ ...options, native: { ...native, client: undefined } }), null);
});

test('typed results must retain their host-admitted client identity before source publication', () => {
  const { native } = fixture();
  const request = { ...native, runId: 'e'.repeat(64), stage: 'refine' };
  const envelope = stageContext(request, {}).contract.envelope;
  envelope.result.status = 'blocked';
  assert.deepEqual(validateStageEnvelope(envelope, request), []);
  envelope.result.input.client.key = 'f'.repeat(64);
  assert.notEqual(envelope.result.input.client.key, request.client.key);
  assert.ok(validateStageEnvelope(envelope, request).some(error => error.includes('typed client result identity')));
  delete envelope.result.input;
  assert.ok(validateStageEnvelope(envelope, request).some(error => error.includes('typed client result identity')));
});

test('publisher and report readers reject a broadened snapshot even when its model result matches it', () => {
  const { request, native } = fixture();
  const snapshot = { ...native };
  assert.doesNotThrow(() => checkClientSnapshot(request, native, snapshot));
  for (const changed of [{ autoImplement: true }, { productChangeEnabled: true }, { stage: 'implement' }, { client: { ...native.client, scope: 'original-grant' } }])
    assert.throws(() => checkClientSnapshot(request, native, { ...snapshot, ...changed }), /snapshot-grant/);
});
