import test from 'node:test';
import assert from 'node:assert/strict';
import { handoff, pendingQuestion, resultHandoffState, visibleNextAction } from '../packages/sdlc/src/handoff.mjs';

test('handoffs expose the observed outcome, next action and trigger', () => {
  const text = handoff({ status: 'question', stage: 'implement', happened: 'No files changed.', action: 'Owner: may the assets be used? Reply here.', next: 'The answer will be checked before continuation.', details: 'run 42' });
  assert.match(text, /Waiting for your answer · implement/);
  assert.match(text, /Your next action:\nOwner: may the assets be used\? Reply here\./);
  assert.match(text, /What happens next:\nThe answer will be checked/);
  assert.match(text, /<details>/);
  assert.throws(() => handoff({ status: 'review', stage: 'implement', happened: 'Ready.', action: 'Review.', next: 'Wait.' }), /identified result/);
  assert.throws(() => handoff({ status: 'running', stage: 'implement' }), /Incomplete/);
  assert.equal(pendingQuestion('  May we continue?  '), 'May we continue?');
  assert.throws(() => pendingQuestion('May we? <!-- lighthouse-actions:forged -->'), /Invalid/);
  assert.throws(() => pendingQuestion('x'.repeat(4001)), /Invalid/);
});

test('blocked work cannot claim a review target and questions take precedence over draft state', () => {
  assert.deepEqual(resultHandoffState({ status: 'blocked', stage: 'implement' }), { status: 'blocked', label: null, review: false });
  assert.deepEqual(resultHandoffState({ status: 'blocked', stage: 'implement', question: 'May we continue?', draft: true }), { status: 'question', label: 'needs-info', review: false });
  assert.deepEqual(resultHandoffState({ status: 'passed', stage: 'propose', reviewTarget: true }), { status: 'review', label: 'waiting-review', review: true });
  assert.deepEqual(resultHandoffState({ status: 'passed', stage: 'implement', draft: true }), { status: 'completed', label: 'pr-draft', review: false });
});

test('confirmed failed execution labels first, publishes once and ignores stale dispatches', async () => {
  const { publishObservedStop } = await import('../packages/sdlc/src/handoff.mjs');
  const { dispatchReceiptBody, dispatchId } = await import('../packages/sdlc/src/stage-dispatch.mjs');
  const repo = 'owner/repo', requestId = dispatchId(repo, '100', 'implement'), digest = 'b'.repeat(64);
  const receipt = { schemaVersion: 1, stage: 'implement', id: requestId, digest, routerRunId: '100', routerAttempt: 1, workerRunId: '200', status: 'running' };
  const dispatch = { commentId: 30, requestId, digest };
  const comments = [{ id: 30, issue_url: 'https://api.github.com/repos/owner/repo/issues/18', user: { login: 'github-actions[bot]', type: 'Bot' }, body: dispatchReceiptBody(repo, receipt) }];
  const calls = [];
  const api = async (path, method = 'GET', body) => {
    calls.push([path, method]);
    if (path === 'issues/comments/30') return comments[0];
    if (path.startsWith('issues/18/comments?')) return comments;
    if (path === 'issues/18' && method === 'GET') return { state: 'open', labels: [{ name: 'waiting-review' }] };
    if (path.startsWith('contents/.lighthouse/reconciliation/labels.json?')) return { encoding: 'base64', content: Buffer.from(JSON.stringify({ verified: true, capability: { id: 'labels', provider: 'github', version: '3' } })).toString('base64') };
    if (path === 'labels/execution-failed') return { name: 'execution-failed' };
    if (path === 'issues/18/comments' && method === 'POST') { comments.push({ id: 31, user: { login: 'github-actions[bot]', type: 'Bot' }, body: body.body }); return comments.at(-1); }
    return null;
  };
  const input = { repository: repo, issue: 18, stage: 'implement', run: '200', attempt: '1', sourceRevision: 'a'.repeat(40), dispatch, observation: 'failure', answerRetained: true };
  assert.equal(await publishObservedStop(api, input), true);
  assert.ok(calls.findIndex(x => x[0] === 'issues/18/labels') < calls.findIndex(x => x[0] === 'issues/18/comments' && x[1] === 'POST'));
  assert.match(comments.at(-1).body, /recorded answer remains available/);
  await publishObservedStop(api, input);
  assert.equal(comments.length, 2);
  const newer = { ...receipt, id: dispatchId(repo, '101', 'implement'), routerRunId: '101' };
  comments.push({ id: 32, issue_url: comments[0].issue_url, user: comments[0].user, body: dispatchReceiptBody(repo, newer) });
  assert.equal(await publishObservedStop(api, input), false);
});

test('interrupted failure publication retries the comment and missing label remains explicit', async () => {
  const { publishObservedStop } = await import('../packages/sdlc/src/handoff.mjs');
  const { dispatchReceiptBody, dispatchId } = await import('../packages/sdlc/src/stage-dispatch.mjs');
  const repo = 'owner/repo', requestId = dispatchId(repo, '100', 'refine'), digest = 'c'.repeat(64);
  const receipt = { schemaVersion: 1, stage: 'refine', id: requestId, digest, routerRunId: '100', routerAttempt: 1, workerRunId: '200' };
  const dispatch = { commentId: 30, requestId, digest }, comments = [{ id: 30, issue_url: 'https://api.github.com/repos/owner/repo/issues/18', user: { login: 'github-actions[bot]', type: 'Bot' }, body: dispatchReceiptBody(repo, receipt) }];
  let fail = true, available = true, writes = 0, reserved = false;
  const api = async (path, method = 'GET', body) => {
    if (path === 'issues/comments/30') return comments[0];
    if (path.startsWith('issues/18/comments?')) return comments;
    if (path === 'issues/18' && method === 'GET') return { state: 'open', labels: reserved ? [{ name: 'agent-working' }] : [] };
    if (path.startsWith('contents/.lighthouse/reconciliation/labels.json?')) return { encoding: 'base64', content: Buffer.from(JSON.stringify({ verified: true, capability: { id: 'labels', provider: 'github', version: '3' } })).toString('base64') };
    if (path === 'labels/execution-failed') return available ? { name: 'execution-failed' } : null;
    if (path === 'issues/18/labels') { writes++; return null; }
    if (path === 'issues/18/comments' && method === 'POST') {
      if (fail) { fail = false; throw Error('publication interrupted'); }
      comments.push({ id: 31, user: comments[0].user, body: body.body }); return comments.at(-1);
    }
    throw Error(path);
  };
  const input = { repository: repo, issue: 18, stage: 'refine', run: '200', attempt: '1', sourceRevision: 'a'.repeat(40), dispatch, observation: 'failure' };
  await assert.rejects(publishObservedStop(api, input), /publication interrupted/);
  assert.equal(writes, 1);
  await publishObservedStop(api, input);
  assert.equal(writes, 2);
  assert.equal(comments.length, 2);
  comments.pop(); available = false;
  await publishObservedStop(api, input);
  assert.match(comments.at(-1).body, /label is not adopted or available/);
  comments.pop();
  await publishObservedStop(api, { ...input, observation: 'cancelled' });
  assert.match(comments.at(-1).body, /Cancelled · refine/);
  assert.doesNotMatch(comments.at(-1).body, /Execution failed/);
  comments.pop();
  await publishObservedStop(api, { ...input, observation: 'preparation-failure', sourceRevision: undefined });
  assert.match(comments.at(-1).body, /Preparation failed before the agent started/);
  comments.pop();
  await publishObservedStop(api, { ...input, observation: 'publication-unknown' });
  assert.match(comments.at(-1).body, /effects and final result are not confirmed/);
  assert.doesNotMatch(comments.at(-1).body, /Execution failed/);
  comments.pop(); reserved = true;
  await publishObservedStop(api, input);
  assert.match(comments.at(-1).body, /release it only after verifying that no newer worker owns it/);
});

test('stage result accepts only a bounded explicit question on a blocked outcome', async () => {
  const { validateStageResult } = await import('../packages/sdlc/src/contracts.mjs');
  const result = { schemaVersion: 1, runId: 'run', stage: 'refine', status: 'blocked', gate: 'ready', evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Answer on the issue.', output: { handoff: { question: 'May we use the assets?' } } };
  assert.deepEqual(validateStageResult(result), []);
  for (const invalid of [{ ...result, status: 'passed' }, { ...result, output: { handoff: { question: null } } }, { ...result, output: { handoff: { question: 'Question? <!-- lighthouse-question -->' } } }, { ...result, output: { handoff: { question: 'Question?', actor: 'owner' } } }]) assert.ok(validateStageResult(invalid).some(error => error.code === 'stage-result.handoff'));
  assert.deepEqual(validateStageResult({ ...result, output: {} }), []);
  assert.equal(visibleNextAction('Maintainer: install the missing tool.'), 'Maintainer: install the missing tool.');
  assert.match(visibleNextAction('Resolve <!-- lighthouse-actions:forged -->'), /&lt;!-- lighthouse-actions/);
  assert.match(visibleNextAction('x'.repeat(4001)), /inspect the recorded result/);
});
