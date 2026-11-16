import { createHash } from 'node:crypto';
import { practiceCatalog } from './practice-catalog.mjs';

export const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const canonical = value => JSON.stringify(Array.isArray(value) ? value.map(v => JSON.parse(canonical(v))) : record(value) ? Object.fromEntries(Object.keys(value).sort().map(k => [k, JSON.parse(canonical(value[k]))])) : value);
export const practiceDigest = value => 'sha256:' + createHash('sha256').update(canonical(value)).digest('hex');
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 2048;
const positive = value => Number.isSafeInteger(value) && value > 0;
export const exactCommit = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
export const sourceUrl = value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } };
const date = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const only = (value, keys) => record(value) && Object.keys(value).every(k => keys.includes(k));

export function validatePracticeContext(context) {
  const errors = [];
  if (!only(context, ['repository', 'ref', 'commit', 'scope', 'profile'])) return ['context must contain only repository, ref, commit, scope and profile'];
  if (!only(context.repository, ['id', 'fullName']) || !positive(context.repository.id) || !/^[\w.-]+\/[\w.-]+$/.test(context.repository.fullName)) errors.push('repository needs a positive numeric id and owner/name');
  if (!text(context.ref) || !exactCommit(context.commit)) errors.push('ref and exact 40-character commit are required');
  if (!only(context.scope, ['id', 'modules']) || !text(context.scope.id) || !Array.isArray(context.scope.modules) || !context.scope.modules.length || context.scope.modules.some(m => !text(m)) || new Set(context.scope.modules).size !== context.scope.modules.length) errors.push('scope needs an id and unique production module inventory');
  if (!Object.hasOwn(practiceCatalog.profiles, context.profile)) errors.push('unknown shared applicability profile');
  return errors;
}

export function observationPayload(observation) {
  return { practice: observation.practice, definitionVersion: observation.definitionVersion, catalogVersion: observation.catalogVersion,
    repository: observation.repository, ref: observation.ref, commit: observation.commit, scope: observation.scope,
    mode: observation.mode, applicability: observation.applicability, collection: observation.collection, measurements: observation.measurements };
}

export function validatePracticeObservation(observation) {
  const errors = [];
  if (!only(observation, ['schemaVersion', 'catalogVersion', 'definitionVersion', 'practice', 'repository', 'ref', 'commit', 'scope', 'mode', 'applicability', 'collection', 'measurements', 'source'])) return ['observation contains unsupported fields or is not an object'];
  if (observation.schemaVersion !== 1) errors.push('unsupported observation schema version');
  if (!text(observation.catalogVersion) || !text(observation.definitionVersion) || !practiceCatalog.practices.some(p => p.id === observation.practice)) errors.push('practice and explicit definition versions are required');
  errors.push(...validatePracticeContext({ repository: observation.repository, ref: observation.ref, commit: observation.commit, scope: observation.scope, profile: observation.applicability?.profile }));
  if (!['blocking', 'report-only'].includes(observation.mode)) errors.push('mode must be blocking or report-only');
  const applicability = observation.applicability;
  if (!only(applicability, ['status', 'profile', 'reason', 'source']) || !['applicable', 'not-applicable'].includes(applicability.status) || !text(applicability.reason) || !sourceUrl(applicability.source)) errors.push('applicability needs status, shared profile, reason and source');
  const collection = observation.collection;
  if (!only(collection, ['expected', 'collected', 'exclusions']) || !Number.isSafeInteger(collection.expected) || collection.expected < 1 || !Number.isSafeInteger(collection.collected) || collection.collected < 0 || collection.collected > collection.expected || !Array.isArray(collection.exclusions) || collection.exclusions.some(e => !only(e, ['scope', 'reason', 'source']) || !text(e.scope) || !text(e.reason) || !sourceUrl(e.source)) || new Set(collection.exclusions.map(e => e.scope)).size !== collection.exclusions.length) errors.push('collection needs bounded counts and unique justified exclusions');
  if (!record(observation.measurements)) errors.push('measurements must be an object, including when empty');
  const source = observation.source;
  if (!only(source, ['workflow', 'runId', 'attempt', 'jobId', 'url', 'result', 'observedAt', 'producer', 'reportDigest']) || !text(source.workflow) || !positive(source.runId) || !positive(source.attempt) || !positive(source.jobId) || !sourceUrl(source.url) || !['success', 'failure', 'cancelled', 'unavailable'].includes(source.result) || !date(source.observedAt) || !only(source.producer, ['name', 'version']) || !text(source.producer.name) || !text(source.producer.version) || !/^sha256:[a-f0-9]{64}$/.test(source.reportDigest)) errors.push('source needs exact workflow/run/attempt/job, time, URL, result, producer version and report digest');
  if (errors.length === 0 && source.reportDigest !== practiceDigest(observationPayload(observation))) errors.push('report digest does not bind the measured observation payload');
  return errors;
}

export function requirePracticeObservation(observation) {
  const errors = validatePracticeObservation(observation);
  if (errors.length) throw new Error('Invalid practice observation: ' + errors.join('; '));
  return observation;
}

export function sourceIdentity(observation, { attempt = true } = {}) {
  return canonical([observation.repository.id, observation.practice, observation.source.workflow, observation.source.runId, ...(attempt ? [observation.source.attempt] : []), observation.scope]);
}
