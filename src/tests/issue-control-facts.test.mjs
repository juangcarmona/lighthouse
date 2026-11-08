import test from 'node:test';
import assert from 'node:assert/strict';
import { collectIssueControlFacts } from '../packages/sdlc/src/issue-control-facts.mjs';

const actor = { id: 71, login: 'owner', type: 'User' };
function fixture() {
  const state = { paths: [], mutations: 0, issue: { id: 70, number: 7, state: 'open', user: actor, title: 'Source request', body: 'Intent', labels: [] }, background: [], backgroundStatus: 'queued', capability: true };
  const options = { repository: 'owner/repo', number: 7, actor, readArtifact: async () => { throw Error('No authenticated report'); },
    readAuthority: async () => ({ actorId: actor.id, repositoryId: 42, commentWrite: true, dispatchWrite: true }),
    readPolicy: async () => ({ automationEnabled: true, digest: 'a'.repeat(64) }),
    readCapability: async () => state.capability ? ({ version: 1, digest: 'b'.repeat(64), stages: ['refine', 'propose'], backgroundWorkflows: state.background }) : null,
    api: async (path, method = 'GET') => {
      state.paths.push(path); if (method !== 'GET') state.mutations++;
      if (path === '') return { id: 42, full_name: 'owner/repo', owner: actor, default_branch: 'main' };
      if (path === 'issues/7') return state.issue;
      if (path.startsWith('issues/7/comments?')) return [];
      if (path === 'commits/main') return { sha: 'c'.repeat(40) };
      if (path.includes('/runs?status=')) {
        const status = new URL('https://api.github.com/' + path).searchParams.get('status');
        return { total_count: status === state.backgroundStatus ? 1 : 0, workflow_runs: status === state.backgroundStatus
          ? [{ id: 900, status, repository: { full_name: 'owner/repo' }, path: '.github/workflows/lighthouse-sdlc-unattended.yml' }] : [] };
      }
      throw Error('Unexpected provider path ' + path);
    } };
  return { state, options };
}

test('read-only facts reuse canonical routing and distinguish comment from stage prerequisites', async () => {
  const { state, options } = fixture(); const result = await collectIssueControlFacts(options);
  assert.equal(result.actions.refine.eligible, true); assert.equal(result.actions.propose.eligible, false);
  assert.equal(result.actions.comment.eligible, true); assert.equal(result.actions.continue.eligible, false);
  assert.equal(result.question.availability, 'none'); assert.equal(result.reservation.active.length, 0); assert.equal(state.mutations, 0);
  state.issue = { ...state.issue, state: 'closed' }; const closed = await collectIssueControlFacts(options);
  assert.equal(closed.actions.refine.eligible, false); assert.equal(closed.actions.comment.eligible, true);
});

test('foreign actor cannot collect privileged issue or source history', async () => {
  const { state, options } = fixture();
  const result = await collectIssueControlFacts({ ...options, actor: { ...actor, id: 72 } });
  assert.equal(result.availability, 'denied'); assert.deepEqual(state.paths, ['']);
});

test('unverified policy cannot mutate and cannot silently grant a stage', async () => {
  const { state, options } = fixture();
  const result = await collectIssueControlFacts({ ...options, readPolicy: async ({ api }) => api('issues/7', 'PATCH', {}) });
  assert.equal(state.mutations, 0); assert.equal(result.actions.refine.availability, 'unavailable');
  assert.equal(result.actions.comment.eligible, true);
});

test('unsupported installed contract never enables typed requests or ordinary client comments', async () => {
  const { state, options } = fixture(); state.capability = false;
  const result = await collectIssueControlFacts(options);
  assert.equal(result.actions.comment.eligible, false); assert.equal(result.actions.refine.availability, 'unsupported');
  assert.equal(state.mutations, 0);
});

test('current source labels deny requests and unbound background executions remain unknown', async () => {
  const { state, options } = fixture(); state.issue.labels = [{ name: 'agent-working' }];
  assert.equal((await collectIssueControlFacts(options)).actions.refine.eligible, false);
  state.issue.labels = []; state.background = ['lighthouse-sdlc-unattended.yml'];
  const result = await collectIssueControlFacts(options);
  assert.equal(result.reservation.availability, 'unavailable'); assert.equal(result.reservation.reason, 'background-issue-binding-unavailable');
  assert.equal(result.reservation.observedRuns[0].id, 900); assert.equal(result.actions.refine.eligible, false);
  assert.equal(result.actions.comment.eligible, true); assert.equal(state.mutations, 0);
});


test('a pending background run cannot be mistaken for no source reservation', async () => {
  const { state, options } = fixture(); state.background = ['lighthouse-sdlc-unattended.yml']; state.backgroundStatus = 'pending';
  const result = await collectIssueControlFacts(options);
  assert.equal(result.actions.refine.eligible, false); assert.equal(result.reservation.observedRuns[0].status, 'pending');
  assert.ok(state.paths.some(path => path.includes('status=pending'))); assert.equal(state.mutations, 0);
});


test('owner identity alone cannot supply missing, denied or cross-repository write authority', async () => {
  const { options } = fixture();
  for (const readAuthority of [undefined, async () => ({ actorId: actor.id, repositoryId: 99, commentWrite: true, dispatchWrite: true })]) {
    const result = await collectIssueControlFacts({ ...options, readAuthority });
    assert.equal(result.actions.refine.eligible, false); assert.equal(result.actions.comment.eligible, false);
    assert.equal(result.authority.availability, 'unavailable');
  }
  const denied = await collectIssueControlFacts({ ...options, readAuthority: async () => ({ actorId: actor.id, repositoryId: 42, commentWrite: false, dispatchWrite: false }) });
  assert.equal(denied.actions.refine.availability, 'denied'); assert.equal(denied.actions.comment.availability, 'denied');
});

test('a verified pending question cannot grant continuation after its source wait is removed or reserved', async () => {
  const { state, options } = fixture();
  state.issue.labels = [{ name: 'needs-info' }];
  const { taskDigest } = await import('../packages/sdlc/src/digests.mjs');
  const request = { runId: 'd'.repeat(64), workflowRunId: '901', issue: 7, stage: 'refine', sourceRevision: 'c'.repeat(40), taskDigest: taskDigest(state.issue, []) };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'refine', gate: 'ready', status: 'blocked',
    evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Owner: answer the question', output: { handoff: { question: 'Which repository should be observed?' } } },
    effect: { type: 'issue-comment', body: 'Waiting for the requested repository.' } };
  const report = { id: 902, user: { login: 'github-actions[bot]', type: 'Bot' }, created_at: '2026-01-01T00:00:00Z',
    body: `Outcome: blocked\n<!-- lighthouse-actions:${request.runId} -->\n<!-- lighthouse-stage:refine:blocked -->\n<!-- lighthouse-question -->\n[Workflow run](https://github.com/owner/repo/actions/runs/901)` };
  const api = options.api;
  options.api = async (path, ...args) => path.startsWith('issues/7/comments?') ? [report] : path === 'actions/runs/901'
    ? { id: 901, status: 'completed', conclusion: 'success', run_attempt: 1, event: 'workflow_dispatch', actor, head_sha: request.sourceRevision, path: '.github/workflows/lighthouse-sdlc-router.yml' }
    : api(path, ...args);
  options.readArtifact = async (_api, _repo, _run, _artifact, member) => member === 'request.json' ? request : envelope;
  const current = await collectIssueControlFacts(options);
  assert.equal(current.question.availability, 'available'); assert.equal(current.actions.continue.eligible, true);
  for (const labels of [[], [{ name: 'needs-info' }, { name: 'human-working' }], [{ name: 'waiting-review' }, { name: 'agent-working' }]]) {
    state.issue.labels = labels;
    const changed = await collectIssueControlFacts(options);
    assert.equal(changed.question.text, 'Which repository should be observed?');
    assert.equal(changed.question.current, false); assert.equal(changed.actions.continue.eligible, false);
  }
  assert.equal(state.mutations, 0);
});
