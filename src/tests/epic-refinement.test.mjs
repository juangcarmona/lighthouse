import test from 'node:test';
import assert from 'node:assert/strict';
import { observeEpicRefinement } from '../packages/sdlc/src/epic-refinement.mjs';
import { taskDigest } from '../packages/sdlc/src/issue-actions.mjs';
import { dispatchId, dispatchReceiptBody } from '../packages/sdlc/src/stage-dispatch.mjs';

const owner = 'owner', repository = 'owner/repo', child = 18;
const bot = { login: 'github-actions[bot]', type: 'Bot' };
const epic = { parent: 146, slice: 'first', planDigest: 'a'.repeat(64), base: 'lighthouse/epic-146', sourceRevision: 'b'.repeat(40) };
function fixture() {
  const issue = { number: child, title: 'Bounded child', body: 'Implement the bounded child.', state: 'open', labels: [] };
  const report = { id: 50, user: bot, body: '<!-- lighthouse-stage:triage:passed -->' };
  const comments = [report];
  const request = { issue: child, runId: 'c'.repeat(64), stage: 'triage', sourceRevision: epic.sourceRevision, originalRequest: issue.body, taskDigest: taskDigest(issue, []), epic };
  const estimate = { points: 1, status: 'provisional', rationale: { scope: 'One bounded slice', dependencies: 'None', verification: 'Unit checks' }, confidence: 'medium', uncertainty: [] };
  const output = { estimate, requestAnalysis: { originalRequest: issue.body, problem: 'A bounded issue', desiredResult: 'An independently checked result', inferences: [], unknowns: [], questions: [] } };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: 'triage', gate: 'triaged', status: 'passed', evidence: [{ id: 'triage', status: 'passed' }], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Await authorized refinement.', output }, effect: { type: 'issue-comment', body: 'Triage completed.' } };
  const api = async path => path === `issues/${child}` ? issue : path.startsWith(`issues/${child}/comments?`) ? comments : assert.fail(path);
  const options = { api, repository, owner, child, authenticate: async () => epic, loadReport: async () => ({ request, envelope, run: { id: 100, run_attempt: 1 } }) };
  return { issue, report, comments, request, envelope, options };
}

test('epic refinement observation binds current owner intent and the authenticated triage to the child plan', async () => {
  const f = fixture();
  assert.deepEqual(await observeEpicRefinement(f.options), { child, epic, taskDigest: f.request.taskDigest, triage: { runId: '100', attempt: 1, reportId: 50, runIdentity: f.request.runId } });
  for (const change of [
    f => { f.issue.labels.push({ name: 'future' }); },
    f => { f.issue.body += ' Changed.'; },
    f => { f.request.epic = { ...epic, planDigest: 'd'.repeat(64) }; },
    f => { f.envelope.result.status = 'blocked'; },
    f => { f.comments.push({ id: 51, user: { login: owner, type: 'User' }, body: 'Changed scope.', updated_at: '2026-11-02T00:00:00Z' }); },
    f => { f.report.user = { login: 'other', type: 'User' }; },
    f => { f.comments.push({ id: 52, user: bot, body: '<!-- lighthouse-stage:triage:blocked -->' }); },
    f => { const receipt = { schemaVersion: 1, stage: 'triage', id: dispatchId(repository, '200', 'triage'), digest: 'e'.repeat(64), routerRunId: '200', routerAttempt: 1, workerRunId: null }; f.comments.push({ id: 52, user: bot, issue_url: `https://api.github.com/repos/${repository}/issues/${child}`, body: dispatchReceiptBody(repository, receipt) }); },
  ]) {
    const candidate = fixture(); change(candidate);
    await assert.rejects(observeEpicRefinement(candidate.options));
  }
});
