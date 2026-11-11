import { digest } from './digests.mjs';
import { workers } from './stage-dispatch.mjs';

export const causes = Object.freeze({
  'worker-technical-failure': ['Technical execution failure', 'Inspect the failed step and retry budget; unresolved work needs an owner decision.'],
  'worker-stalled': ['Execution has stopped updating', 'Inspect the runner and execution; do not duplicate active work.'],
  'dispatch-unconfirmed': ['Dispatch confirmation is missing', 'Reconcile the recorded request with Actions before requesting more work.'],
  'execution-rerun': ['Execution was rerun outside recovery', 'Inspect all attempts and the original claim.'],
  'authority-changed': ['Source or owner intent changed', 'Request fresh work against the current source and intent.'],
  'workflow-ref-missing': ['Workflow reference no longer exists', 'Maintainer: reconcile the original execution and select an existing workflow ref under a fresh owner request; never resend or recreate its ref automatically.'],
  'manual-recovery': ['Outcome requires operator recovery', 'Inspect actual effects and make a new owner decision.'],
  'publication-uncertain': ['Publication effects are uncertain', 'Inspect the PR, issue and publication job before another request.'],
  'execution-time-unknown': ['Execution timestamp is unavailable', 'Inspect the Actions execution timestamps.'],
  'evidence-unavailable': ['Recovery evidence is unavailable', 'Inspect the maintenance run and original request artifacts.'],
  'dispatch-origin-unavailable': ['Original dispatch evidence is unavailable', 'Maintainer: restore authenticated original evidence or reconcile effects before a fresh owner request; never resend an uncertain dispatch.'],
  'substantive-failure': ['Execution failed without a safe technical retry', 'Maintainer: inspect the retained result and failed step before requesting more work.'],
  'duration-unknown': ['Execution duration is unavailable', 'Maintainer: inspect the original Actions timestamps before classifying the failure.'],
  'ci-launch-failure': ['Candidate CI launch needs reconciliation', 'Maintainer: inspect the retained CI request and current candidate before any resend.'],
  'publication-unconfirmed': ['Publication is not confirmed', 'Maintainer: reconcile the original publication receipt and remote effects.'],
  'completion-unconfirmed': ['Integration completion is not confirmed', 'Maintainer: inspect the original assessment, merge receipt and current PR; never repeat an uncertain merge.'],
  'checks-unconfirmed': ['Host checks are not confirmed', 'Maintainer: inspect the original check receipt before requesting more work.'],
  'handoff-unconfirmed': ['Result handoff is not confirmed', 'Maintainer: inspect the original result and current issue before restoring its handoff.'],
});
const states = ['retryable', 'delayed', 'exhausted', 'uncertain', 'stalled', 'blocked', 'recovered'];
const contextCodes = {
  'worker-active': 'None: follow the active execution; do not duplicate it.',
  'human-decision': 'Owner: answer the recorded question on the source issue or PR.',
  'stage-blocked': 'Owner or maintainer: resolve the blocker in the linked handoff before continuing.',
  'issue-paused': 'Owner: inspect the source issue decision or reservation before requesting work.',
  'worker-completed': 'None: this worker completed; delivery acceptance and publication remain separate.',
  'ci-recovery-disabled': 'Maintainer: reconcile the retained CI request and explicitly enable scoped recovery if appropriate.',
  'ci-requested': 'None: wait for the requested CI to appear; its result is not yet confirmed.',
  'ci-observed': 'None: follow the observed CI execution; CI success and delivery acceptance are separate.',
  'post-merge-ci-pending': 'None: follow the existing post-merge checks; do not run integration again.',
  'completion-recovery-disabled': 'Maintainer: explicitly enable scoped recovery before completing retained publication.',
  'completion-restored': 'None: follow the resumed review; restored publication is not review acceptance.',
  'blocked-handoff-restored': 'Owner or maintainer: resolve the original blocker; restoring its handoff grants no continuation.',
  'reservation-released': 'Maintainer: follow the retained failure outcome before requesting further work.',
  'preparation-failed': 'Maintainer: inspect the failed preparation before a new authorized request.',
  'handoff-restored': 'Owner or maintainer: follow the restored handoff and its recorded decision.',
};
const aliases = Object.fromEntries(['ci-request-evidence-missing', 'recovery-evidence-unavailable', 'ci-recovery-ambiguous', 'ci-recovery-unconfirmed', 'ci-start-unconfirmed'].map(code => [code, 'ci-launch-failure']));
const contextStates = [...states, 'active', 'waiting-human', 'succeeded', 'observed', 'reconciled'];
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

function validateContext(context) {
  if (!positive(context.issue) || !hash(context.rootId) || !contextStates.includes(context.state) || !Object.hasOwn(causes, context.code) && !Object.hasOwn(contextCodes, context.code) || !Number.isSafeInteger(context.attempt) || context.attempt < 0 || context.attempt > 2 || context.runId !== null && !positive(context.runId)) throw Error('Invalid report context');
  if (Object.keys(context).some(key => !['issue', 'rootId', 'runId', 'attempt', 'state', 'code', 'pr', 'head', 'retryAt', 'outcome'].includes(key))) throw Error('Unexpected report context fields');
  if (context.pr !== undefined && !positive(context.pr) || context.head !== undefined && !/^[a-f0-9]{40}$/.test(context.head) || context.retryAt !== undefined && (!Number.isFinite(Date.parse(context.retryAt)) || new Date(context.retryAt).toISOString() !== context.retryAt) || context.outcome !== undefined && !['requested', 'queued', 'active', 'unknown', 'question', 'technical-failure', 'cancelled', 'blocked', 'completed'].includes(context.outcome)) throw Error('Invalid report context metadata');
}

export function readReport(issue, repository, worker, code) {
  if (issue.pull_request || issue.user?.login !== 'github-actions[bot]' || issue.user.type !== 'Bot') throw Error('Report is not bot-owned');
  const report = parseMarker(issue.body, marker);
  if (![1, 2].includes(report.schemaVersion) || report.worker !== worker || report.code !== code || report.signature !== reportSignature(repository, worker, code) || !Array.isArray(report.entries) || report.entries.length > 200 || Object.keys(report).sort().join(',') !== (report.schemaVersion === 1 ? 'code,entries,schemaVersion,signature,worker' : 'code,contexts,entries,schemaVersion,signature,worker')) throw Error('Invalid report identity');
  report.entries.forEach(validateEntry);
  if (new Set(report.entries.map(e => e.key)).size !== report.entries.length) throw Error('Duplicate report occurrences');
  const contexts = report.schemaVersion === 1 ? [] : report.contexts;
  if (!Array.isArray(contexts) || contexts.length > 200 || new Set(contexts.map(c => c.rootId)).size !== contexts.length) throw Error('Invalid report contexts');
  for (const context of contexts) {
    validateContext(context);
    if (!report.entries.some(entry => entry.rootId === context.rootId && entry.issue === context.issue)) throw Error('Unbound report context');
  }
  return { ...report, schemaVersion: 2, contexts };
}

function normalizedObservation(repository, observation) {
  if (!positive(observation.issue)) throw Error('Invalid observed issue');
  const worker = observation.worker ?? 'maintenance';
  if (![...workers, 'maintenance'].includes(worker)) throw Error('Unknown observed worker');
  const rootId = observation.rootId ?? digest(`${repository}:${observation.issue}:unavailable`);
  if (!hash(rootId)) throw Error('Invalid observed request');
  const code = aliases[observation.code] ?? observation.code;
  if (!contextStates.includes(observation.state) || !Object.hasOwn(causes, code) && !Object.hasOwn(contextCodes, code)) return null;
  const runId = observation.runId ?? observation.observedRunId ?? null;
  const context = { issue: observation.issue, rootId, runId: runId === null ? null : String(runId), attempt: observation.attempt ?? 0, state: observation.state, code };
  for (const key of ['pr', 'head', 'retryAt', 'outcome']) if (observation[key] !== undefined) context[key] = observation[key];
  validateContext(context);
  if (code === 'worker-completed' && (!observation.rootId || runId === null || observation.state !== 'succeeded')) throw Error('Recovery requires a confirmed execution identity');
  if (!Object.hasOwn(causes, code) || !states.includes(observation.state) || observation.state === 'recovered') return { worker, rootId, context };
  const entry = { key: runId ? `run:${runId}` : `request:${rootId}`, rootId, issue: observation.issue, runId: runId === null ? null : String(runId), attempt: observation.attempt ?? 0, state: observation.state };
  validateEntry(entry);
  return { worker, rootId, code, entry, context };
}

export function mergeObservations(repository, previous, observations) {
  const entries = new Map(previous.entries.map(e => [e.key, { ...e }]));
  const recoveredRoots = new Set(previous.entries.filter(e => e.state === 'recovered').map(e => e.rootId));
  const contexts = new Map((previous.contexts ?? []).map(context => [context.rootId, context]));
  const normalized = observations.map(o => normalizedObservation(repository, o)).filter(Boolean);
  for (const o of normalized) if (o.worker === previous.worker && o.code === previous.code) {
    if (!o.entry.runId && [...entries.values()].some(entry => entry.rootId === o.rootId && entry.issue === o.entry.issue && entry.attempt === o.entry.attempt && entry.runId)) continue;
    const pending = entries.get(`request:${o.rootId}`);
    if (o.entry.runId && pending && pending.issue === o.entry.issue && pending.attempt === o.entry.attempt) entries.delete(pending.key);
    const prior = entries.get(o.entry.key);
    if (prior && (prior.rootId !== o.rootId || prior.issue !== o.entry.issue || prior.attempt !== o.entry.attempt)) throw Error('Report occurrence identity changed');
    entries.set(o.entry.key, { ...o.entry, ...(recoveredRoots.has(o.entry.rootId) ? { state: 'recovered' } : {}) });
  }
  for (const o of normalized) {
    if (o.worker !== previous.worker || ![...entries.values()].some(entry => entry.rootId === o.rootId)) continue;
    if ([...entries.values()].some(entry => entry.rootId === o.rootId && entry.issue !== o.context.issue)) throw Error('Report request issue changed');
    const prior = contexts.get(o.rootId);
    if (prior?.runId && !o.context.runId && o.context.attempt <= prior.attempt) continue;
    if (o.context.code === 'worker-completed' && previous.code === 'ci-launch-failure') continue;
    if (prior?.code === 'worker-completed' && o.context.runId === prior.runId && o.context.code !== prior.code) continue;
    if (prior && (o.context.attempt < prior.attempt || o.context.runId && prior.runId && BigInt(o.context.runId) < BigInt(prior.runId))) continue;
    if (recoveredRoots.has(o.rootId) && !['succeeded', 'reconciled', 'observed', 'waiting-human', 'active'].includes(o.context.state)) continue;
    contexts.set(o.rootId, o.context);
    const recovered = o.context.code === 'worker-completed' && o.context.state === 'succeeded' || o.context.code === 'ci-observed' && previous.code === 'ci-launch-failure' || o.context.code === 'completion-restored' && ['publication-uncertain', 'completion-unconfirmed', 'manual-recovery'].includes(previous.code) || o.context.code === 'handoff-restored' && ['publication-uncertain', 'handoff-unconfirmed'].includes(previous.code);
    if (recovered) for (const entry of entries.values()) if (entry.rootId === o.rootId) entry.state = 'recovered';
  }
  if (entries.size > 200) throw Error('Report exceeds 200 distinct observations; operator archival is required');
  return { ...previous, schemaVersion: 2, entries: [...entries.values()].sort((a, b) => a.key.localeCompare(b.key)), contexts: [...contexts.values()].sort((a, b) => a.rootId.localeCompare(b.rootId)) };
}

function nextAction(context, fallback) {
  if (context.state === 'exhausted') return 'Owner: retry budget exhausted; inspect the retained failure and decide the next authorized action.';
  if (context.state === 'delayed') return `None: wait${context.retryAt ? ` until ${context.retryAt}` : ' for the configured retry delay'}; recovery must be explicitly enabled.`;
  if (context.state === 'retryable') return 'Maintainer: follow the scoped recovery configuration; at most two linked retries are permitted.';
  return contextCodes[context.code] ?? causes[context.code]?.[1] ?? causes[fallback][1];
}

export function reportBody(repository, report) {
  const active = report.entries.filter(e => e.state !== 'recovered').length;
  const rows = report.entries.map(e => `| [#${e.issue}](https://github.com/${repository}/issues/${e.issue}) | ${e.runId ? `[Execution](https://github.com/${repository}/actions/runs/${e.runId})` : 'Unconfirmed request'} | ${e.attempt}/2 | ${e.state} |`);
  const current = (report.contexts ?? []).map(context => `- [#${context.issue}](https://github.com/${repository}/issues/${context.issue})${context.pr ? ` / [PR #${context.pr}](https://github.com/${repository}/pull/${context.pr})` : ''}${context.head ? ` at \`${context.head}\`` : ''}: **${context.state}** (${context.code})${context.runId ? `; [current execution](https://github.com/${repository}/actions/runs/${context.runId})` : ''}${context.outcome ? `; execution outcome: ${context.outcome}` : ''}. ${nextAction(context, report.code)}`);
  const body = `## ${active ? 'Attention required' : 'Recovery confirmed'}\n\nWorker: \`${report.worker}\`. Cause: ${causes[report.code][0]}.\n\n${report.entries.length} distinct observed occurrence(s); ${active} unresolved. Counts cover retained failures or uncertainties, not successful workers, CI executions or completed deliveries.\n\n${current.length ? current.join('\n') : `Next action: ${active ? causes[report.code][1] : 'None for these occurrences.'}`}\n\n| Work item | Original evidence | Retry | Incident state |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n\n<!-- ${marker}:${JSON.stringify(report)} -->`;
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
    const rows = await api(`issues?state=all&creator=github-actions%5Bbot%5D&per_page=100&page=${page}`);
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
