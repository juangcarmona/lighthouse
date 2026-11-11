import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readReport } from '../src/packages/sdlc/src/worker-reports.mjs';

export async function deliveryHealth(api, indexNumber, now = Date.now()) {
  const repository = await api('');
  if (repository.id !== 1427668548 || repository.full_name !== 'juangcarmona/lighthouse') throw Error('Delivery report repository identity mismatch');
  const index = await api(`issues/${indexNumber}`);
  if (index.user?.login !== 'juangcarmona' || index.pull_request) throw Error('Delivery report index is not owner-managed');
  const matches = [...(index.body ?? '').matchAll(/<!-- lighthouse-worker-report-index:(\{[^\n]*\}) -->/g)];
  if (matches.length !== 1) throw Error('Delivery report index is missing or ambiguous');
  const manifest = JSON.parse(matches[0][1]), sources = [], roots = new Map();
  if (!manifest.reports || Object.keys(manifest.reports).length > 100) throw Error('Delivery report inventory exceeds bounds');
  for (const row of Object.values(manifest.reports)) {
    if (!Number.isSafeInteger(row.issue) || row.issue < 1) throw Error('Report creation remains unconfirmed');
    const issue = await api(`issues/${row.issue}`);
    const report = readReport(issue, repository.full_name, row.worker, row.code);
    sources.push({ issue: issue.number, url: issue.html_url, updatedAt: issue.updated_at, worker: row.worker, code: row.code });
    for (const entry of report.entries) {
      const state = roots.get(entry.rootId) ?? { recovered: true, occurrences: 0, runIds: new Set() };
      state.recovered &&= entry.state === 'recovered';
      state.occurrences++;
      if (entry.runId) state.runIds.add(entry.runId);
      roots.set(entry.rootId, state);
    }
  }
  const recovered = [...roots.values()].filter(row => row.recovered).length;
  return {
    schemaVersion: 1, repository: repository.full_name, repositoryId: repository.id,
    observedAt: new Date(now).toISOString(), index: index.html_url,
    coverage: { source: 'retained-worker-reports', window: 'retained-history', reports: sources.length, excludes: ['unreported deliveries', 'human attention time', 'acceptance without a retained receipt'] },
    metrics: { requestsWithReportedFailures: roots.size, requestsWithAllReportedFailuresRecovered: recovered, requestsWithUnresolvedReportedFailures: roots.size - recovered, acceptedDeliveries: null, humanAttentionMinutes: null, autonomousRecoveryRate: null },
    unavailable: { acceptedDeliveries: 'Worker reports do not establish accepted delivery.', humanAttentionMinutes: 'No direct attention measurement is retained.', autonomousRecoveryRate: 'Recovery state alone does not identify human intervention.' }, sources
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [index, output, ...extra] = process.argv.slice(2);
    if (!/^[1-9]\d*$/.test(index ?? '') || !output || extra.length) throw Error('Usage: report-delivery-health.mjs <index-issue> <output.json>');
    const api = async path => JSON.parse(execFileSync('gh', ['api', `repos/juangcarmona/lighthouse${path ? '/' + path : ''}`], { encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 }));
    const report = await deliveryHealth(api, Number(index));
    await writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report.metrics));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
