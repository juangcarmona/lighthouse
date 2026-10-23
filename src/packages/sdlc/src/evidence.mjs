import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { EVIDENCE_STATUSES, validateStageResult } from './contracts.mjs';
import { validateBrowserEvidence } from './browser-e2e.mjs';

export const EVIDENCE_SCOPES = Object.freeze(['product', 'architecture', 'delivery', 'release', 'run']);
export const COVERAGE_STATUSES = Object.freeze(['unverified', 'observed', 'verified', 'incomplete', 'conflict', 'not-applicable']);

const evidenceStatusSet = new Set(EVIDENCE_STATUSES);
const scopeSet = new Set(EVIDENCE_SCOPES);
const coverageStatusSet = new Set(COVERAGE_STATUSES);

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function text(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function relativePath(value) {
  return text(value) && !value.startsWith('/') && !value.split('/').includes('..');
}

function validSubject(value) {
  return record(value) && text(value.type) && text(value.id);
}

function subjectKey(value) {
  return `${value.type}:${value.id}`;
}

function validateAuthorityRefs(value, errors, field = 'authorityRefs') {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(issue('evidence.authority-refs', 'authorityRefs must be an array', field));
    return;
  }
  for (const [index, item] of value.entries()) {
    if (!record(item) || !text(item.authority) || !text(item.id)) errors.push(issue('evidence.authority-ref', `authorityRefs[${index}] needs authority and id`, `${field}[${index}]`));
    if (item.path !== undefined && !relativePath(item.path)) errors.push(issue('evidence.authority-path', `authorityRefs[${index}].path must be relative`, `${field}[${index}].path`));
  }
}

function validateArtifacts(value, errors, field = 'artifacts') {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(issue('evidence.artifacts', 'artifacts must be an array', field));
    return;
  }
  const ids = new Set();
  for (const [index, item] of value.entries()) {
    if (!record(item) || !text(item.type) || !relativePath(item.path)) {
      errors.push(issue('evidence.artifact', `artifacts[${index}] needs a type and relative path`, `${field}[${index}]`));
      continue;
    }
    if (item.id !== undefined) {
      if (!text(item.id) || ids.has(item.id)) errors.push(issue('evidence.artifact-id', `artifacts[${index}].id must be unique`, `${field}[${index}].id`));
      ids.add(item.id);
    }
    if (item.sha256 !== undefined && !/^[a-f0-9]{64}$/u.test(item.sha256)) errors.push(issue('evidence.artifact-hash', `artifacts[${index}].sha256 must be a lowercase SHA-256`, `${field}[${index}].sha256`));
  }
}

export function validateEvidenceRecord(value) {
  const errors = [];
  if (!record(value)) return [issue('evidence.invalid', 'evidence record must be an object')];
  if (value.schemaVersion !== 1) errors.push(issue('evidence.schema-version', 'schemaVersion must be 1', 'schemaVersion'));
  for (const field of ['id', 'runId', 'kind', 'producer']) if (!text(value[field]) && field !== 'producer') errors.push(issue(`evidence.${field}`, `${field} must be a non-empty string`, field));
  if (!text(value.producer)) errors.push(issue('evidence.producer', 'producer must be a non-empty string', 'producer'));
  if (!scopeSet.has(value.scope)) errors.push(issue('evidence.scope', `scope must be one of ${EVIDENCE_SCOPES.join(', ')}`, 'scope'));
  if (!evidenceStatusSet.has(value.status)) errors.push(issue('evidence.status', `status must be one of ${EVIDENCE_STATUSES.join(', ')}`, 'status'));
  if (!record(value.payload)) errors.push(issue('evidence.payload', 'payload must be an object', 'payload'));
  if (value.subject !== undefined && !validSubject(value.subject)) errors.push(issue('evidence.subject', 'subject needs a type and id', 'subject'));
  validateAuthorityRefs(value.authorityRefs, errors);
  validateArtifacts(value.artifacts, errors);
  if (value.source !== undefined && (!record(value.source) || (value.source.path !== undefined && !relativePath(value.source.path)))) errors.push(issue('evidence.source', 'source must be an object with a relative path', 'source'));
  if (value.observedAt !== undefined && (typeof value.observedAt !== 'string' || Number.isNaN(Date.parse(value.observedAt)))) errors.push(issue('evidence.observed-at', 'observedAt must be an ISO date-time', 'observedAt'));
  if (['failed', 'unavailable', 'unconfigured', 'pending-review'].includes(value.status) && !text(value.nextAction)) errors.push(issue('evidence.next-action', `status ${value.status} needs nextAction`, 'nextAction'));
  if (value.nextAction !== undefined && !text(value.nextAction)) errors.push(issue('evidence.next-action', 'nextAction must be a non-empty string when present', 'nextAction'));
  return errors;
}

function clean(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function recordFrom(value, { id, kind, scope = 'delivery', producer, subject, authorityRefs, source, artifacts, nextAction } = {}) {
  const status = kind === 'stage-result'
    ? ({ passed: 'passed', failed: 'failed', blocked: 'pending-review', ready: 'pending-review' }[value.status] ?? 'unconfigured')
    : value.status;
  return clean({
    schemaVersion: 1,
    id: id ?? `${kind}:${value.runId ?? value.journey?.id ?? 'unknown'}`,
    runId: value.runId ?? `${kind}:${value.journey?.id ?? 'unknown'}`,
    kind,
    scope,
    status,
    producer,
    subject,
    authorityRefs,
    source,
    observedAt: value.observedAt,
    artifacts: artifacts ?? value.artifacts ?? [],
    payload: value,
    nextAction: nextAction ?? value.nextAction,
  });
}

export function adaptStageResult(value, options = {}) {
  const errors = validateStageResult(value);
  return { record: errors.length ? null : recordFrom(value, { ...options, kind: 'stage-result', producer: options.producer ?? 'lighthouse-sdlc' }), errors };
}

export function adaptBrowserEvidence(value, options = {}) {
  const errors = validateBrowserEvidence(value);
  return { record: errors.length ? null : recordFrom(value, { ...options, kind: 'browser-e2e', producer: options.producer ?? 'lighthouse-sdlc' }), errors };
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function coverageStatus(records) {
  if (!records.length) return 'unverified';
  const statuses = new Set(records.map((item) => item.status));
  if (statuses.size === 1 && statuses.has('passed')) return 'verified';
  if (statuses.has('failed') && statuses.size > 1) return 'conflict';
  if (statuses.has('failed') || statuses.has('unavailable') || statuses.has('unconfigured') || statuses.has('pending-review')) return 'incomplete';
  if (statuses.size === 1 && statuses.has('not-applicable')) return 'not-applicable';
  return 'observed';
}

export function buildEvidenceIndex(records, { indexId = 'evidence-index', runId, repository, revision, subjects = [], recordPaths = {} } = {}) {
  const errors = [];
  if (!Array.isArray(records) || records.length === 0) errors.push(issue('evidence.index-records', 'records must contain at least one evidence record', 'records'));
  const validRecords = Array.isArray(records) ? records : [];
  for (const [index, item] of validRecords.entries()) for (const error of validateEvidenceRecord(item)) errors.push({ ...error, field: error.field ? `records[${index}].${error.field}` : `records[${index}]` });
  const ids = new Set();
  for (const [index, item] of validRecords.entries()) {
    if (ids.has(item.id)) errors.push(issue('evidence.duplicate-id', `records[${index}] duplicates evidence id ${item.id}`, `records[${index}].id`));
    ids.add(item.id);
  }
  const effectiveRunId = runId ?? validRecords[0]?.runId;
  if (!text(effectiveRunId)) errors.push(issue('evidence.index-run-id', 'runId must be provided or present on every record', 'runId'));
  const expected = [...subjects, ...validRecords.filter((item) => item.subject).map((item) => item.subject)];
  const subjectMap = new Map();
  for (const item of expected) if (validSubject(item)) subjectMap.set(subjectKey(item), item);
  const refs = validRecords.map((item) => clean({ id: item.id, path: recordPaths[item.id] ?? `records/${item.id}.json`, sha256: hash(item), kind: item.kind, status: item.status, subject: item.subject, authorityRefs: item.authorityRefs }));
  const coverage = [...subjectMap.entries()].map(([key, subject]) => {
    const related = validRecords.filter((item) => item.subject && subjectKey(item.subject) === key);
    const status = coverageStatus(related);
    return clean({ subject, status, evidenceIds: related.map((item) => item.id), nextAction: status === 'verified' || status === 'not-applicable' ? undefined : `Collect or resolve evidence for ${key}.` });
  });
  if (errors.length) return { index: null, errors };
  return {
    index: clean({ schemaVersion: 1, indexId, runId: effectiveRunId, repository, revision, records: refs, coverage }),
    errors: [],
  };
}

export function validateEvidenceIndex(value) {
  const errors = [];
  if (!record(value)) return [issue('evidence-index.invalid', 'evidence index must be an object')];
  if (value.schemaVersion !== 1) errors.push(issue('evidence-index.schema-version', 'schemaVersion must be 1', 'schemaVersion'));
  for (const field of ['indexId', 'runId']) if (!text(value[field])) errors.push(issue(`evidence-index.${field}`, `${field} must be a non-empty string`, field));
  if (!Array.isArray(value.records)) errors.push(issue('evidence-index.records', 'records must be an array', 'records'));
  else {
    const ids = new Set();
    for (const [index, item] of value.records.entries()) {
      if (!record(item) || !text(item.id) || !relativePath(item.path) || !/^[a-f0-9]{64}$/u.test(item.sha256) || !text(item.kind) || !evidenceStatusSet.has(item.status)) errors.push(issue('evidence-index.record-ref', `records[${index}] needs id, relative path, SHA-256, kind and status`, `records[${index}]`));
      if (item?.id && ids.has(item.id)) errors.push(issue('evidence-index.duplicate-id', `records[${index}] duplicates evidence id ${item.id}`, `records[${index}].id`));
      if (item?.id) ids.add(item.id);
      if (item?.subject !== undefined && !validSubject(item.subject)) errors.push(issue('evidence-index.subject', `records[${index}].subject needs a type and id`, `records[${index}].subject`));
      validateAuthorityRefs(item?.authorityRefs, errors, `records[${index}].authorityRefs`);
    }
  }
  if (!Array.isArray(value.coverage)) errors.push(issue('evidence-index.coverage', 'coverage must be an array', 'coverage'));
  else {
    const subjects = new Set();
    for (const [index, item] of value.coverage.entries()) {
      if (!record(item) || !validSubject(item.subject) || !coverageStatusSet.has(item.status) || !Array.isArray(item.evidenceIds)) errors.push(issue('evidence-index.coverage-entry', `coverage[${index}] needs subject, status and evidenceIds`, `coverage[${index}]`));
      const key = item?.subject && validSubject(item.subject) ? subjectKey(item.subject) : null;
      if (key && subjects.has(key)) errors.push(issue('evidence-index.coverage-duplicate', `coverage[${index}] duplicates subject ${key}`, `coverage[${index}].subject`));
      if (key) subjects.add(key);
    }
  }
  return errors;
}

export function evidenceReport(value) {
  const errors = value?.kind ? validateEvidenceRecord(value) : validateEvidenceIndex(value);
  return { schemaVersion: 1, status: errors.length ? 'invalid' : 'valid', valid: errors.length === 0, errors };
}

export async function readEvidenceIndex(path, cwd = process.cwd()) {
  const value = JSON.parse(await readFile(resolve(cwd, path), 'utf8'));
  return { value, errors: validateEvidenceIndex(value) };
}
