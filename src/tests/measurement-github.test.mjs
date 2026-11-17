import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectGithubMeasurements } from '../packages/sdlc/src/measurement-github.mjs';
import { renderMeasurementReport } from '../packages/sdlc/src/measurement-report.mjs';
import { deriveMeasurements } from '../packages/sdlc/src/measurement.mjs';
const ref = 'a'.repeat(40), date = '2026-01-10T00:00:00Z';
function fixture({ deny = false, expired = false, nativeNames = false } = {}) {
  const methods = [];
  const result = { schemaVersion: 1, runId: 'worker:1', stage: 'review', status: 'blocked', gate: null, evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: ['Owner judgement'], nextAction: 'Owner: inspect the exact candidate.', output: { handoff: { question: 'Accept this exact candidate?' } } };
  const run = { id: 100, run_attempt: 1, repository: { id: 1 }, head_sha: ref, path: '.github/workflows/lighthouse-sdlc-review.lock.yml', html_url: 'https://github.com/example/project/actions/runs/100', created_at: date, updated_at: date, status: 'completed', conclusion: 'failure' };
  const artifact = { id: 9, name: nativeNames ? 'lighthouse-result-1-1' : 'lighthouse-review-result-1-1', expired, size_in_bytes: 1000 };
  const api = async (path, method) => {
    methods.push(method); assert.equal(method, 'GET');
    if (path === '') return { id: 1, full_name: 'example/project', default_branch: 'main' };
    if (path.startsWith('issues?')) { if (deny) throw Object.assign(Error('not echoed'), { status: 403 }); return [{ id: 2, number: 1, html_url: 'https://github.com/example/project/issues/1', created_at: date, closed_at: null, state: 'open' }]; }
    if (path.startsWith('issues/1/timeline')) return [];
    if (path.startsWith('issues/1/comments')) return [{ id: 3, created_at: date, user: { id: 4, type: 'User' }, html_url: 'https://github.com/example/project/issues/1#issuecomment-3' }];
    if (path.startsWith('pulls?')) return [];
    if (path.startsWith('actions/runs?')) return { total_count: 1, workflow_runs: [run] };
    if (path === 'actions/runs/100/artifacts?per_page=100') return { total_count: 1, artifacts: [artifact] };
    if (path === 'actions/runs/100/attempts/1') return run;
    if (path.startsWith('actions/runs/100/attempts/1/jobs')) return { total_count: 2, jobs: [
      { id: 5, name: 'agent', html_url: run.html_url + '/job/5', completed_at: date, conclusion: 'success', steps: [{ number: 1, name: 'OpenCode progress and result', conclusion: 'success', started_at: '2026-01-09T23:59:30Z', completed_at: date }] },
      { id: 6, name: nativeNames ? 'Validate, publish and release' : 'publish', html_url: run.html_url + '/job/6', completed_at: date, conclusion: 'failure', steps: [] },
    ] };
    throw Error('Unexpected read ' + path);
  };
  const readArtifact = async () => file => file === 'envelope.json' ? { result } : null;
  return { api, readArtifact, methods };
}
const options = f => ({ api: f.api, readArtifact: f.readArtifact, now: () => '2026-02-01T00:00:00Z' });
const window = { start: '2026-01-01T00:00:00Z', end: '2026-02-01T00:00:00Z' };

test('collector makes GET requests only and preserves failed publication, blocked assessment and missing usage separately', async () => {
  const f = fixture(), bundle = await collectGithubMeasurements('example/project', window, options(f));
  assert.ok(f.methods.every(m => m === 'GET'));
  assert.equal(bundle.collections.find(c => c.kind === 'workflow-attempt').status, 'incomplete');
  assert.match(bundle.collections.find(c => c.kind === 'workflow-attempt').reason, /Earlier-created/);
  assert.equal(bundle.records.find(r => r.kind === 'stage-result').data.status, 'blocked');
  assert.equal(bundle.records.find(r => r.kind === 'workflow-job' && r.data.publication).data.conclusion, 'failure');
  assert.equal(bundle.records.find(r => r.kind === 'usage').data.coverage, 'unavailable');
  const report = deriveMeasurements(bundle);
  assert.equal(report.metrics.find(m => m.id === 'model.token-usage.v1').fields.inputTokens.value, null);
  assert.equal(report.metrics.find(m => m.id === 'execution.blocking-reason.v1').counts.human, 1);
  assert.equal(report.metrics.find(m => m.id === 'autonomy.human-touches.v1').numerator, 1);
});
for (const reason of ['deny', 'expired']) test(`partial ${reason} source remains visible`, async () => {
  const f = fixture({ [reason]: true }), bundle = await collectGithubMeasurements('example/project', window, options(f));
  assert.ok(bundle.collections.some(c => c.status !== 'complete' && c.reason));
  if (reason === 'deny') assert.equal(bundle.collector.resources.find(r => r.httpStatus === 403).status, 'unavailable');
  if (reason === 'expired') assert.equal(bundle.records.some(r => r.kind === 'stage-result'), false);
});
test('request and pagination bounds produce explicit gaps, never a complete empty population', async () => {
  const f = fixture(), bundle = await collectGithubMeasurements('example/project', window, { ...options(f), bounds: { maxRequests: 1 } });
  assert.ok(bundle.collections.find(c => c.kind === 'issue').status !== 'complete');
  assert.equal(deriveMeasurements(bundle).metrics.find(m => m.id === 'execution.stage-outcome.v1').numerator, null);
});
test('offline report is byte stable, escapes source prose and rejects active or cross-repository source links', async () => {
  const f = fixture(), bundle = await collectGithubMeasurements('example/project', window, options(f));
  const stage = bundle.records.find(r => r.kind === 'stage-result');
  stage.data.nextAction = '<script>alert("credential")</script>'; stage.source.url = 'javascript:alert(1)';
  const html = renderMeasurementReport(bundle);
  assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes("default-src 'none'"));
  assert.ok(html.includes("min-block-size:var(--lh-space-6)"));
  assert.ok(html.includes('.scroll table{min-width:70rem}'));
  assert.ok(html.includes('tabindex="0" role="region" aria-label="Operator findings table"'));
  assert.equal(html, renderMeasurementReport(JSON.parse(JSON.stringify(bundle))));
  stage.source.url = 'https://github.com/another/repository/issues/1';
  assert.ok(!renderMeasurementReport(bundle).includes('href="https://github.com/another/'));
});
test('root repository mismatch is terminal and no source body or token is retained', async () => {
  const f = fixture();
  await assert.rejects(collectGithubMeasurements('wrong/project', window, options(f)), /identity mismatch/);
  const bundle = await collectGithubMeasurements('example/project', window, options(f));
  assert.ok(!JSON.stringify(bundle).includes('Accept this exact candidate?'));
  assert.ok(!JSON.stringify(bundle).includes('authorization'));
});

test('existing generic completion artifacts and native publication job names retain the same meaning', async () => {
  const f = fixture({ nativeNames: true }), bundle = await collectGithubMeasurements('example/project', window, options(f));
  assert.equal(bundle.records.find(r => r.kind === 'stage-result').data.stage, 'review');
  assert.equal(bundle.records.find(r => r.kind === 'workflow-job' && r.data.publication).data.conclusion, 'failure');
});
test('future collection windows are refused before a source observation', async () => {
  const f = fixture();
  await assert.rejects(collectGithubMeasurements('example/project', { ...window, end: '2026-03-01T00:00:00Z' }, options(f)), /no later/);
  assert.equal(f.methods.length, 0);
});
