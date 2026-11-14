import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryHealth } from '../../scripts/report-delivery-health.mjs';
import { reportBody, reportSignature } from '../packages/sdlc/src/worker-reports.mjs';

function fixture() {
  const repository = 'juangcarmona/lighthouse', worker = 'implement';
  const make = (number, code, states) => {
    const report = { schemaVersion: 1, worker, code, signature: reportSignature(repository, worker, code), entries: states.map(([root, state], i) => ({ key: `run:${number * 10 + i}`, runId: String(number * 10 + i), issue: 18, rootId: root.repeat(64), attempt: 0, state })) };
    return { number, body: reportBody(repository, report), user: { login: 'github-actions[bot]', type: 'Bot' }, html_url: `https://github.com/${repository}/issues/${number}`, updated_at: '2026-11-11T12:00:00Z' };
  };
  const issues = new Map([
    [2, make(2, 'worker-technical-failure', [['a', 'recovered'], ['b', 'uncertain']])],
    [3, make(3, 'publication-uncertain', [['b', 'uncertain']])]
  ]);
  const manifest = { reports: { a: { issue: 2, worker, code: 'worker-technical-failure' }, b: { issue: 3, worker, code: 'publication-uncertain' } } };
  const index = { user: { login: 'juangcarmona' }, html_url: `https://github.com/${repository}/issues/1`, body: `<!-- lighthouse-worker-report-index:${JSON.stringify(manifest)} -->` };
  const api = async path => !path ? { id: 1427668548, full_name: repository } : path === 'issues/1' ? index : issues.get(Number(path.split('/')[1]));
  return { api, index, issues };
}

test('health observations deduplicate requests across causes and retain unavailable measurements', async () => {
  const f = fixture(), report = await deliveryHealth(f.api, 1);
  assert.equal(report.metrics.requestsWithReportedFailures, 2);
  assert.equal(report.metrics.requestsWithAllReportedFailuresRecovered, 1);
  assert.equal(report.metrics.requestsWithUnresolvedReportedFailures, 1);
  assert.equal(report.metrics.acceptedDeliveries, null);
  assert.equal(report.metrics.autonomousRecoveryRate, null);
  assert.equal(report.metrics.humanAttentionMinutes, null);
  assert.equal(report.sources.length, 2);
});

test('missing index and spoofed report ownership cannot become healthy zero counts', async () => {
  const f = fixture(); f.index.body = 'Not initialized';
  await assert.rejects(deliveryHealth(f.api, 1), /missing or ambiguous/);
  const g = fixture(); g.issues.get(2).user.login = 'outsider';
  await assert.rejects(deliveryHealth(g.api, 1), /bot-owned/);
});
