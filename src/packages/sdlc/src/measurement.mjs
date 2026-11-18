import { createHash } from 'node:crypto';
import { validatePublishable } from './process-publication.mjs';

export const measurementVersion = 1;
export const stableJson = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export const measurementHash = value => createHash('sha256').update(stableJson(value)).digest('hex');
const finite = value => Number.isSafeInteger(value) && value >= 0;
const instant = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const fullSha = value => /^[a-f0-9]{40}$/.test(value ?? '');
const identity = value => Number.isSafeInteger(value) && value > 0;

const entries = [
  ['evidence.completeness.v1', 'records', 'Review retained provenance coverage', 'all', 'valid source-bound records / enumerated records', 'measured', 'All enumerated records; a missing collection is a coverage gap, never an empty population.'],
  ['execution.stage-outcome.v1', 'stage results', 'Separate delivery assessments from Actions outcomes', 'stage-result', 'counts by explicit passed, failed, blocked and uncertain status / eligible stage results', 'measured', 'A blocked assessment never becomes passed from a green workflow.'],
  ['execution.attempt-outcome.v1', 'workflow attempts', 'Inspect technical retries independently', 'workflow-attempt', 'counts by native conclusion / enumerated workflow attempts', 'measured', 'Each run ID and attempt is distinct; skipped work is not an agent invocation.'],
  ['execution.blocking-reason.v1', 'blocked results', 'Distinguish human decisions from technical blockers', 'stage-result', 'counts by explicit human, technical or unknown cause / blocked results', 'measured', 'Only an explicit source classification establishes human blocking.'],
  ['delivery.issue-to-pr.v1', 'seconds', 'Observe candidate lead time', 'issue', 'sum of observed issue-to-first-linked-PR seconds / issues with observed linked PR', 'measured', 'Cohort: issues created in [start,end); unlinked issues are right-censored. PR relation must be retained explicitly.'],
  ['delivery.issue-to-integration.v1', 'seconds', 'Observe integration separately from candidate creation', 'issue', 'sum of observed issue-to-first-linked-merge seconds / issues with observed linked merge', 'measured', 'Cohort: issues created in [start,end); only explicit merged PR plus full merge SHA qualifies; missing integrations are right-censored.'],
  ['autonomy.human-touches.v1', 'events', 'Observe visible human interactions', 'human-touch', 'explicit User comment/review events / enumerated touch events', 'measured', 'Exclude bots and reactions; no per-person ranking or effort inference.'],
  ['autonomy.human-wait-time.v1', 'seconds', 'Observe explicit decision waiting', 'human-wait', 'sum of clipped explicit human-wait interval seconds / observed wait intervals', 'measured', 'Clip to the window; unresolved intervals are right-censored lower bounds; overlapping intervals remain separate work-item waits.'],
  ['autonomy.delegated-integration.v1', 'integrations', 'Observe integrations with authenticated delegation', 'delegated-integration', 'unique merge identities supported by a retained verifier assessment / eligible integration records', 'inferred', 'Requires exact head/merge binding, source proof references and the integration verifier; a boolean, bot actor or merge alone is insufficient.'],
  ['delivery.confirmed-reverts.v1', 'reverts', 'Observe explicitly evidenced reversals', 'revert', 'unique reversal identities with an explicit verified source relation / eligible revert records', 'inferred', 'Requires a declared source adapter and retained original/reversal revisions; titles and commit-message guesses are excluded.'],
  ['execution.agent-step-duration.v1', 'seconds', 'Observe the actual agent execution step', 'agent-step', 'sum of measured non-skipped agent step seconds / measured agent steps', 'measured', 'Exact run/attempt/job/step identity is required; workflow, queue and model-request time are excluded.'],
  ['model.token-usage.v1', 'tokens', 'Observe usage with per-field coverage', 'usage', 'sum of measured values per token field / eligible invocations, with measured N/M per field', 'measured', 'Keep requested/resolved/provider-reported identity and authentication route separate; missing fields stay unknown and reasoning is never added again to output.'],
  ['evidence.external-unknowns.v1', 'availability', 'Expose unsupported external conclusions', 'external', 'no fabricated numerator or denominator', 'measured', 'Provider confirmation, billing, deployment, incident rates, active human effort and accepted delivery need their own independently authenticated sources.'],
];
export const metricDefinitions = entries.map(([id, unit, useCase, kind, formula, classification, rules]) => ({ id, version: 1, unit, useCase, kind, formula, classification, rules, sourceRequirements: 'Numeric repository identity, stable source/event identity, retained content digest, exact revision and safe source URL; run/attempt lineage when applicable. Offline integrity is distinct from live source authentication.', window: 'UTC [start,end); event cohorts except issue lead-time cohorts and clipped wait intervals; no future or out-of-window completions.', deduplication: 'Same kind and logical ID with identical retained bytes is one event; changed bytes at one identity are conflicting and excluded. Retries remain separate attempts, never new accepted deliveries.', coverage: 'Numerator, denominator, measured count, eligible count, missing source collections, censored count and raw source references remain visible.', unavailableReason: 'No eligible measurement, required source/adapter unavailable, invalid binding, incomplete collection or contradictory source.', privacy: 'Repository scope; no transcripts, raw logs, credentials, personal scores or individual rankings.', aggregation: 'Totals and arithmetic mean over observed samples only; no imputation, scoring, price estimation or automatic policy change.' }));

export function measurementRecord(repository, kind, id, time, data, source) {
  const digest = measurementHash({ kind, time, data });
  return { kind, id, time, data, source: { ...source, repositoryId: repository.id, revision: source.revision && !source.revision.startsWith('sha256:') ? source.revision : `sha256:${digest}`, sha256: digest } };
}

function validSource(record, repository) {
  const source = record.source;
  if (!source || source.repositoryId !== repository.id || typeof source.id !== 'string' || !source.id || !instant(source.observedAt) || source.sha256 !== measurementHash({ kind: record.kind, time: record.time, data: record.data }) || !(fullSha(source.revision) || /^sha256:[a-f0-9]{64}$/.test(source.revision ?? ''))) return false;
  if (source.revision.startsWith('sha256:') && source.revision !== `sha256:${source.sha256}`) return false;
  try {
    const url = new URL(source.url);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && (!url.hash || /^#(?:issuecomment|pullrequestreview|event)-[1-9][0-9]*$/.test(url.hash)) && (url.hostname === 'github.com' && url.pathname.startsWith(`/${repository.fullName}/`) || url.hostname === 'api.github.com' && url.pathname.startsWith(`/repos/${repository.fullName}/`));
  } catch { return false; }
}

export function deriveMeasurements(bundle) {
  if (bundle?.schemaVersion !== 1 || !identity(bundle.repository?.id) || !/^[\w.-]+\/[\w.-]+$/.test(bundle.repository.fullName) || !instant(bundle.window?.start) || !instant(bundle.window?.end) || Date.parse(bundle.window.start) >= Date.parse(bundle.window.end) || !Array.isArray(bundle.records) || bundle.records.length > 10000 || !Array.isArray(bundle.collections)) throw Error('Invalid bounded measurement bundle');
  if (Buffer.byteLength(stableJson(bundle)) > 4 * 1024 * 1024) throw Error('Measurement bundle exceeds 4 MiB');
  validatePublishable({ 'metadata.json': stableJson({ ...bundle, records: [] }) });
  for (const record of bundle.records) validatePublishable({ 'record.json': stableJson(record) });
  const logicalId = record => record.kind === 'workflow-attempt' && identity(record.data?.runId) && identity(record.data?.attempt) ? `${record.data.runId}:${record.data.attempt}` : record.kind === 'usage' && record.data?.invocationId ? record.data.invocationId : record.source?.id ?? record.id;
  const recordKey = record => `${record.kind}:${logicalId(record)}`;
  const signature = record => measurementHash({ kind: record.kind, time: record.time, data: record.data, repositoryId: record.source?.repositoryId, sha256: record.source?.sha256, revision: record.source?.revision });
  const start = Date.parse(bundle.window.start), end = Date.parse(bundle.window.end), byId = new Map(), conflicts = new Set();
  for (const record of bundle.records) {
    if (typeof record.kind !== 'string' || typeof record.id !== 'string' || !record.id || !record.data || typeof record.data !== 'object') throw Error('Invalid measurement record');
    const key = recordKey(record);
    if (byId.has(key) && signature(byId.get(key)) !== signature(record)) conflicts.add(key);
    else if (!byId.has(key) || stableJson(record) < stableJson(byId.get(key))) byId.set(key, record);
  }
  const all = [...byId.values()].sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));
  const inWindow = record => instant(record.time) && Date.parse(record.time) >= start && Date.parse(record.time) < end;
  const within = all.filter(inWindow);
  const usable = record => !conflicts.has(recordKey(record)) && validSource(record, bundle.repository);
  const good = within.filter(usable);
  const collection = kind => bundle.collections.filter(c => c.kind === kind);
  const complete = kind => collection(kind).length === 1 && collection(kind)[0].status === 'complete';
  const metrics = [];
  function metric(id, kinds, eligible, measured, numerator, denominator, details = {}) {
    const required = Array.isArray(kinds) ? kinds : [kinds];
    const missingCollections = required.filter(kind => !complete(kind));
    const relatedConflicts = eligible.filter(r => conflicts.has(recordKey(r))).map(r => r.id);
    const coverage = { measured: measured.length, eligible: eligible.length, missingCollections, conflictingIds: relatedConflicts };
    const status = relatedConflicts.length ? 'conflicting' : !measured.length && (eligible.length || missingCollections.length || numerator === null) ? 'unavailable' : measured.length < eligible.length || missingCollections.length ? 'incomplete' : 'measured';
    metrics.push({ id, definitionVersion: 1, classification: metricDefinitions.find(d => d.id === id).classification, status, numerator, denominator, coverage, sources: measured.map(r => ({ id: r.id, kind: r.kind, ...r.source })).sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`)), ...details });
  }
  const sourceRecords = all.filter(usable);
  metric('evidence.completeness.v1', [...new Set([...all.map(r => r.kind), ...bundle.collections.map(c => c.kind)])], all, sourceRecords, sourceRecords.length ? sourceRecords.length : null, all.length || null, { meaning: 'Structural retained-source coverage; does not authenticate producer or freshness.' });
  for (const [id, kind, key, accepted] of [
    ['execution.stage-outcome.v1', 'stage-result', 'status', ['ready', 'passed', 'failed', 'blocked', 'uncertain']],
    ['execution.attempt-outcome.v1', 'workflow-attempt', 'conclusion', ['success', 'failure', 'cancelled', 'timed_out', 'skipped', 'neutral', 'action_required', 'stale', 'pending']],
  ]) {
    const eligible = within.filter(r => r.kind === kind), measured = good.filter(r => r.kind === kind && accepted.includes(r.data[key]));
    metric(id, kind, eligible, measured, measured.length || complete(kind) && !eligible.length ? measured.length : null, eligible.length, { counts: Object.fromEntries(accepted.map(status => [status, measured.length || complete(kind) ? measured.filter(r => r.data[key] === status).length : null])) });
  }
  const blocked = within.filter(r => r.kind === 'stage-result' && r.data.status === 'blocked'), validBlocked = blocked.filter(usable);
  metric('execution.blocking-reason.v1', 'stage-result', blocked, validBlocked, validBlocked.length || complete('stage-result') ? validBlocked.length : null, blocked.length, { counts: Object.fromEntries(['human', 'technical', 'unknown'].map(cause => [cause, validBlocked.length || complete('stage-result') ? validBlocked.filter(r => (['human', 'technical'].includes(r.data.blockingCause) ? r.data.blockingCause : 'unknown') === cause).length : null])) });
  const issues = within.filter(r => r.kind === 'issue');
  for (const [id, field] of [['delivery.issue-to-pr.v1', 'createdAt'], ['delivery.issue-to-integration.v1', 'mergedAt']]) {
    const samples = [], measured = [];
    for (const issue of issues.filter(usable)) {
      const candidates = all.filter(r => r.kind === 'pull-request' && usable(r) && r.data.linkedIssueIds?.includes(issue.data.id) && r.data.linkProof?.some(proof => proof.issueId === issue.data.id && all.some(relation => relation.kind === 'issue-pr-relation' && relation.id === proof.sourceId && usable(relation) && relation.source.sha256 === proof.sha256 && relation.data.issueId === issue.data.id && relation.data.prId === r.data.id)) && instant(r.data[field]) && Date.parse(r.data[field]) >= Date.parse(issue.time) && Date.parse(r.data[field]) < end && (field !== 'mergedAt' || r.data.merged === true && fullSha(r.data.mergeCommitSha)));
      candidates.sort((a, b) => Date.parse(a.data[field]) - Date.parse(b.data[field]) || a.id.localeCompare(b.id));
      if (candidates[0]) { measured.push(issue, candidates[0], ...all.filter(relation => relation.kind === 'issue-pr-relation' && relation.data.issueId === issue.data.id && relation.data.prId === candidates[0].data.id && usable(relation))); samples.push({ issueId: issue.id, pullRequestId: candidates[0].id, seconds: (Date.parse(candidates[0].data[field]) - Date.parse(issue.time)) / 1000 }); }
    }
    metric(id, ['issue', 'pull-request'], issues, measured.filter(r => r.kind === 'issue'), samples.length ? samples.reduce((sum, s) => sum + s.seconds, 0) : null, samples.length, { eligibleIssues: issues.length, censored: issues.length - samples.length, samples, relatedSources: measured.filter(r => r.kind !== 'issue').map(r => ({ id: r.id, ...r.source })), meanSeconds: samples.length ? samples.reduce((sum, s) => sum + s.seconds, 0) / samples.length : null });
  }
  const touches = within.filter(r => r.kind === 'human-touch' && r.data.actorType !== 'Bot'), human = touches.filter(r => usable(r) && r.data.actorType === 'User' && identity(r.data.actorId) && ['comment', 'review'].includes(r.data.event));
  metric('autonomy.human-touches.v1', 'human-touch', touches, human, human.length || complete('human-touch') ? human.length : null, touches.length, { activeHumanSeconds: null });
  const waits = all.filter(r => r.kind === 'human-wait' && instant(r.data.start) && Date.parse(r.data.start) < end && (!r.data.end || Date.parse(r.data.end) > start));
  const intervals = waits.filter(r => usable(r) && r.data.cause === 'human' && (r.data.end === null || instant(r.data.end) && Date.parse(r.data.end) >= Date.parse(r.data.start)));
  const samples = intervals.map(r => ({ id: r.id, seconds: (Math.min(end, r.data.end ? Date.parse(r.data.end) : end) - Math.max(start, Date.parse(r.data.start))) / 1000, censored: r.data.end === null || Date.parse(r.data.end) > end }));
  metric('autonomy.human-wait-time.v1', 'human-wait', waits, intervals, samples.length ? samples.reduce((sum, s) => sum + s.seconds, 0) : null, intervals.length, { samples, censored: samples.filter(s => s.censored).length, activeHumanSeconds: null });
  for (const [id, kind, adapter] of [['autonomy.delegated-integration.v1', 'delegated-integration', 'lighthouse.integration.v1'], ['delivery.confirmed-reverts.v1', 'revert', 'lighthouse.revert.v1']]) {
    const eligible = within.filter(r => r.kind === kind);
    const measured = eligible.filter(r => usable(r) && r.data.verification?.adapter === adapter && r.data.verification.status === 'verified-at-collection' && fullSha(r.data.head) && fullSha(r.data.merge) && r.data.verification.sourceIds?.length >= 2 && r.data.verification.bindingSha256 === measurementHash({ repositoryId: bundle.repository.id, head: r.data.head, merge: r.data.merge }) && r.data.verification.sourceIds.every(id => all.some(s => s.id === id && usable(s))) && (kind === 'delegated-integration' ? r.data.verification.sourceIds.some(id => all.some(s => s.id === id && s.kind === 'integration-authorization' && s.data.head === r.data.head && usable(s))) && r.data.verification.sourceIds.some(id => all.some(s => s.id === id && s.kind === 'integration-merge' && s.data.head === r.data.head && s.data.merge === r.data.merge && usable(s))) : r.data.verification.sourceIds.some(id => all.some(s => s.id === id && s.kind === 'reversal-source' && s.data.reverts === r.data.head && s.data.reversal === r.data.merge && usable(s)))));
    const identities = new Set(measured.map(r => `${r.data.head}:${r.data.merge}`));
    metric(id, kind, eligible, measured, identities.size || complete(kind) && !eligible.length ? identities.size : null, eligible.length, { limitation: 'Retained adapter assessment, not a fresh authentication. No title, actor, boolean or workflow-success inference.' });
  }
  const steps = within.filter(r => r.kind === 'agent-step' && r.data.conclusion !== 'skipped');
  const measuredSteps = steps.filter(r => usable(r) && identity(r.data.runId) && identity(r.data.attempt) && identity(r.data.jobId) && Number.isSafeInteger(r.data.stepNumber) && r.data.stepNumber > 0 && r.data.stepName === 'OpenCode progress and result' && instant(r.data.startedAt) && instant(r.data.completedAt) && Date.parse(r.data.completedAt) >= Date.parse(r.data.startedAt));
  const stepSeconds = measuredSteps.map(r => ({ id: r.id, seconds: (Date.parse(r.data.completedAt) - Date.parse(r.data.startedAt)) / 1000 }));
  metric('execution.agent-step-duration.v1', 'agent-step', steps, measuredSteps, stepSeconds.length ? stepSeconds.reduce((s, x) => s + x.seconds, 0) : null, measuredSteps.length, { samples: stepSeconds, meaning: 'Native agent wrapper step wall time; not model-request or CPU time.' });
  const usage = within.filter(r => r.kind === 'usage'), fields = ['inputTokens', 'outputTokens', 'reasoningTokens', 'cacheReadTokens', 'cacheWriteTokens'];
  const usableUsage = usage.filter(r => usable(r) && typeof r.data.invocationId === 'string' && r.data.invocationId && r.data.usageSource && r.data.authenticationRoute && r.data.identity && ['observed', 'incomplete', 'unavailable'].includes(r.data.coverage));
  const fieldCoverage = Object.fromEntries(fields.map(field => {
    const measured = usableUsage.filter(r => r.data.coverage !== 'unavailable' && finite(r.data[field]));
    const total = measured.reduce((sum, r) => sum + r.data[field], 0), representable = Number.isSafeInteger(total);
    return [field, { value: measured.length && representable ? total : null, measured: measured.length, eligible: usage.length, status: measured.length && representable ? measured.length === usage.length && complete('usage') && measured.every(r => r.data.coverage === 'observed') ? 'measured' : 'incomplete' : 'unavailable' }];
  }));
  metric('model.token-usage.v1', 'usage', usage, usableUsage.filter(r => fields.some(field => finite(r.data[field])) && r.data.coverage !== 'unavailable'), null, usage.length, { fields: fieldCoverage, identities: usableUsage.map(r => ({ id: r.id, ...r.data.identity, authenticationRoute: r.data.authenticationRoute, usageSource: r.data.usageSource })), actualBilledCost: null, billableOutputTokens: null });
  const usageMetric = metrics.at(-1);
  if (usageMetric.status === 'measured' && Object.values(fieldCoverage).some(field => field.status !== 'measured')) usageMetric.status = 'incomplete';
  metric('evidence.external-unknowns.v1', 'external', [], [], null, null, { providerConfirmation: null, actualBilledCost: null, deployment: null, incidents: null, activeHumanEffort: null, acceptedDelivery: null, reason: 'The first report does not contain independently authenticated sources for these conclusions.' });
  return { schemaVersion: 1, definitionVersion: 1, inputSha256: measurementHash(bundle), repository: bundle.repository, window: bundle.window, trust: 'Reproducible projection of retained observations; offline integrity does not establish live authenticity or freshness.', metrics, limitations: bundle.collections.filter(c => c.status !== 'complete').map(c => ({ kind: c.kind, status: c.status, reason: c.reason ?? 'Source incomplete' })).sort((a, b) => a.kind.localeCompare(b.kind)), conflictingRecordIds: [...conflicts].sort() };
}
