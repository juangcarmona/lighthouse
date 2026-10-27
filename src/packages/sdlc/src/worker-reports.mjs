import { digest } from './host-contract.mjs';
import { workers } from './stage-dispatch.mjs';

export const causes = Object.freeze({
  'worker-technical-failure': ['Technical execution failure', 'Inspect the failed step and retry budget; unresolved work needs an owner decision.'],
  'worker-stalled': ['Execution has stopped updating', 'Inspect the runner and execution; do not duplicate active work.'],
  'dispatch-unconfirmed': ['Dispatch confirmation is missing', 'Reconcile the recorded request with Actions before requesting more work.'],
  'execution-rerun': ['Execution was rerun outside recovery', 'Inspect all attempts and the original claim.'],
  'authority-changed': ['Source or owner intent changed', 'Request fresh work against the current source and intent.'],
  'manual-recovery': ['Outcome requires operator recovery', 'Inspect actual effects and make a new owner decision.'],
  'publication-uncertain': ['Publication effects are uncertain', 'Inspect the PR, issue and publication job before another request.'],
  'execution-time-unknown': ['Execution timestamp is unavailable', 'Inspect the Actions execution timestamps.'],
  'evidence-unavailable': ['Recovery evidence is unavailable', 'Inspect the maintenance run and original request artifacts.'],
});
const states = ['retryable', 'delayed', 'exhausted', 'uncertain', 'stalled', 'blocked', 'recovered'];
const positive = x => Number.isSafeInteger(Number(x)) && /^[1-9][0-9]*$/.test(String(x));
const hash = x => /^[a-f0-9]{64}$/.test(x ?? '');
export const reportSignature = (repository, worker, code) => digest(`${repository}:${worker}:${code}`);
const marker = 'lighthouse-worker-report';
const indexStart = '<!-- lighthouse-worker-report-index:start -->';
const indexEnd = '<!-- lighthouse-worker-report-index:end -->';

function parseMarker(body, name) {
  if (typeof body !== 'string' || Buffer.byteLength(body) > 128000) throw Error('Report body exceeds bounds');
  const values = [...body.matchAll(new RegExp(`<!-- ${name}:(\\{[^\\n]*\\}) -->`, 'g'))];
  if (values.length !== 1) throw Error('Missing or ambiguous report marker');
  return JSON.parse(values[0][1]);
}

function validateEntry(entry) {
  if (!positive(entry.issue) || !hash(entry.rootId) || !Number.isSafeInteger(entry.attempt) || entry.attempt < 0 || entry.attempt > 2 || !states.includes(entry.state) || (entry.runId !== null && !positive(entry.runId)) || entry.key !== (entry.runId ? `run:${entry.runId}` : `request:${entry.rootId}`)) throw Error('Invalid report occurrence');
  if (Object.keys(entry).sort().join(',') !== 'attempt,issue,key,rootId,runId,state') throw Error('Unexpected report occurrence fields');
}

export function readReport(issue, repository, worker, code) {
  if (issue.pull_request || issue.user?.login !== 'github-actions[bot]' || issue.user.type !== 'Bot') throw Error('Report is not bot-owned');
  const report = parseMarker(issue.body, marker);
  if (report.schemaVersion !== 1 || report.worker !== worker || report.code !== code || report.signature !== reportSignature(repository, worker, code) || !Array.isArray(report.entries) || report.entries.length > 200 || Object.keys(report).sort().join(',') !== 'code,entries,schemaVersion,signature,worker') throw Error('Invalid report identity');
  report.entries.forEach(validateEntry);
  if (new Set(report.entries.map(e => e.key)).size !== report.entries.length) throw Error('Duplicate report occurrences');
  return report;
}

function normalizedObservation(repository, observation) {
  if (!positive(observation.issue)) throw Error('Invalid observed issue');
  const worker = observation.worker ?? 'maintenance';
  if (![...workers, 'maintenance'].includes(worker)) throw Error('Unknown observed worker');
  const rootId = observation.rootId ?? digest(`${repository}:${observation.issue}:unavailable`);
  if (!hash(rootId)) throw Error('Invalid observed request');
  if (observation.state === 'succeeded') return { worker, rootId, succeeded: true };
  if (!Object.hasOwn(causes, observation.code) || !states.includes(observation.state) || observation.state === 'recovered') return null;
  const runId = observation.runId ?? observation.observedRunId ?? null;
  const entry = { key: runId ? `run:${runId}` : `request:${rootId}`, rootId, issue: observation.issue, runId: runId === null ? null : String(runId), attempt: observation.attempt ?? 0, state: observation.state };
  validateEntry(entry);
  return { worker, code: observation.code, entry };
}

export function mergeObservations(repository, previous, observations) {
  const entries = new Map(previous.entries.map(e => [e.key, { ...e }]));
  const recoveredRoots = new Set(previous.entries.filter(e => e.state === 'recovered').map(e => e.rootId));
  const normalized = observations.map(o => normalizedObservation(repository, o)).filter(Boolean);
  for (const o of normalized) if (o.worker === previous.worker && o.code === previous.code) entries.set(o.entry.key, { ...o.entry, ...(recoveredRoots.has(o.entry.rootId) ? { state: 'recovered' } : {}) });
  for (const o of normalized) if (o.succeeded && o.worker === previous.worker) for (const entry of entries.values()) if (entry.rootId === o.rootId) entry.state = 'recovered';
  if (entries.size > 200) throw Error('Report exceeds 200 distinct observations; operator archival is required');
  return { ...previous, entries: [...entries.values()].sort((a, b) => a.key.localeCompare(b.key)) };
}

export function reportBody(repository, report) {
  const active = report.entries.filter(e => e.state !== 'recovered').length;
  const rows = report.entries.map(e => `| [#${e.issue}](https://github.com/${repository}/issues/${e.issue}) | ${e.runId ? `[Execution](https://github.com/${repository}/actions/runs/${e.runId})` : 'Unconfirmed request'} | ${e.attempt}/2 | ${e.state} |`);
  const body = `## ${active ? '❌ Attention required' : '✅ Recovery confirmed'}\n\nWorker: \`${report.worker}\`. Cause: ${causes[report.code][0]}.\n\n${report.entries.length} distinct observed occurrence(s); ${active} unresolved. Counts cover retained observations, not all repository history.\n\nNext action: ${active ? causes[report.code][1] : 'No action for these occurrences. A new failure reuses this report.'}\n\n| Work item | Evidence | Retry | State |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n\n<!-- ${marker}:${JSON.stringify(report)} -->`;
  if (Buffer.byteLength(body) > 60000) throw Error('Report body exceeds issue bounds; operator archival is required');
  return body;
}

function readIndex(issue, owner) {
  if (issue.pull_request || issue.user?.login !== owner || issue.state !== 'open') throw Error('Report index must be an open owner-authored issue');
  const body = issue.body ?? '';
  if (!body.includes(indexStart) && !body.includes(indexEnd) && !body.includes('<!-- lighthouse-worker-report-index:')) return { schemaVersion: 1, reports: {} };
  if (body.split(indexStart).length !== 2 || body.split(indexEnd).length !== 2 || body.indexOf(indexStart) > body.indexOf(indexEnd)) throw Error('Ambiguous index block');
  const index = parseMarker(body, 'lighthouse-worker-report-index');
  if (index.schemaVersion !== 1 || !index.reports || typeof index.reports !== 'object' || Array.isArray(index.reports) || Object.keys(index.reports).length > 100) throw Error('Invalid report index');
  return index;
}

async function writeIndex(api, issue, index) {
  const current = await api(`issues/${issue.number}`);
  if (current.body !== issue.body || current.state !== 'open') throw Error('Report index changed; no overwrite');
  const links = Object.values(index.reports).map(r => r.issue ? `- #${r.issue}: ${r.worker} / ${r.code}` : `- Pending confirmation: ${r.worker} / ${r.code}`);
  const block = `${indexStart}\n## Worker error reports\n\n${links.join('\n')}\n\n<!-- lighthouse-worker-report-index:${JSON.stringify(index)} -->\n${indexEnd}`;
  const body = (issue.body ?? '').includes(indexStart) ? issue.body.slice(0, issue.body.indexOf(indexStart)) + block + issue.body.slice(issue.body.indexOf(indexEnd) + indexEnd.length) : `${issue.body ?? ''}\n\n${block}`;
  if (Buffer.byteLength(body) > 60000) throw Error('Report index exceeds issue bounds');
  const updated = await api(`issues/${issue.number}`, 'PATCH', { body });
  return updated;
}

async function reportIssues(api) {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const rows = await api(`issues?state=all&per_page=100&page=${page}`);
    all.push(...rows.filter(i => !i.pull_request && i.body?.includes(`<!-- ${marker}:`)));
    if (rows.length < 100) return all;
  }
  throw Error('Report reconciliation exceeds 500 issue/PR entries');
}

// Caller serializes all report publication with the repository-wide report job.
export async function publishReports(api, repository, owner, indexNumber, observations) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !positive(indexNumber) || !Array.isArray(observations) || observations.length > 1000) throw Error('Invalid report publication input');
  let indexIssue = await api(`issues/${indexNumber}`);
  const index = readIndex(indexIssue, owner), existing = await reportIssues(api), desired = new Map();
  for (const observation of observations) {
    const o = normalizedObservation(repository, observation);
    if (o?.entry) desired.set(reportSignature(repository, o.worker, o.code), { worker: o.worker, code: o.code });
  }
  for (const [signature, row] of Object.entries(index.reports)) {
    if (![...workers, 'maintenance'].includes(row.worker) || !Object.hasOwn(causes, row.code) || signature !== reportSignature(repository, row.worker, row.code) || row.issue !== null && !positive(row.issue)) throw Error('Invalid indexed report');
    desired.set(signature, row);
  }
  if (desired.size > 100) throw Error('Report index exceeds 100 causes');
  const results = [];
  for (const [signature, definition] of desired) {
    const { worker, code } = definition;
    const matches = existing.filter(i => { try { return parseMarker(i.body, marker).signature === signature; } catch { return false; } });
    if (matches.length > 1) throw Error('Ambiguous report identity; inspect duplicates');
    let issue = index.reports[signature]?.issue ? await api(`issues/${index.reports[signature].issue}`) : matches[0];
    if (issue) readReport(issue, repository, worker, code);
    if (!issue && Object.hasOwn(index.reports, signature)) throw Error('Report creation is unconfirmed; inspect the index before any resend');
    if (!issue) {
      const report = mergeObservations(repository, { schemaVersion: 1, signature, worker, code, entries: [] }, observations);
      const body = reportBody(repository, report);
      index.reports[signature] = { worker, code, issue: null };
      indexIssue = await writeIndex(api, indexIssue, index); // Durable intent precedes the non-idempotent POST.
      issue = await api('issues', 'POST', { title: `Worker ${worker}: ${causes[code][0]}`, body });
      readReport(issue, repository, worker, code);
      existing.push(issue);
    }
    if (index.reports[signature]?.issue !== issue.number) {
      index.reports[signature] = { worker, code, issue: issue.number };
      indexIssue = await writeIndex(api, indexIssue, index);
    }
    const previous = readReport(issue, repository, worker, code), report = mergeObservations(repository, previous, observations);
    const body = reportBody(repository, report), active = report.entries.some(e => e.state !== 'recovered');
    const newlyFailed = report.entries.some(e => e.state !== 'recovered' && !previous.entries.some(p => p.key === e.key && p.state !== 'recovered'));
    const state = !active ? 'closed' : newlyFailed ? 'open' : issue.state;
    if (issue.body !== body || issue.state !== state) await api(`issues/${issue.number}`, 'PATCH', { body, state });
    results.push({ number: issue.number, signature, count: report.entries.length, state });
  }
  return results;
}
