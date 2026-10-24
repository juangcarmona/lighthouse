import stageContract from '../stages.json' with { type: 'json' };
import resultSchema from '../schemas/stage-result.schema.json' with { type: 'json' };

export const STAGES = Object.freeze(['triage', 'refine', 'propose', 'implement', 'integrate', 'review']);
export const GATES = Object.freeze(['triaged', 'ready', 'planned', 'done']);
export const EVIDENCE_STATUSES = Object.freeze(['passed', 'failed', 'unavailable', 'unconfigured', 'pending-review', 'not-applicable']);
export const STAGE_STATUSES = Object.freeze(['ready', 'blocked', 'failed', 'passed']);

const stageSet = new Set(STAGES);
const gateSet = new Set(GATES);
const evidenceStatusSet = new Set(EVIDENCE_STATUSES);
const stageStatusSet = new Set(STAGE_STATUSES);

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function validateStageResult(value) {
  const errors = [];
  if (!isRecord(value)) return [issue('stage-result.invalid', 'stage result must be an object')];
  for (const key of Object.keys(value)) if (!(key in resultSchema.properties)) errors.push(issue('stage-result.unknown-field', `${key} is unsupported`, key));
  if (value.schemaVersion !== 1) errors.push(issue('stage-result.schema-version', 'schemaVersion must be 1', 'schemaVersion'));
  for (const field of ['runId', 'nextAction']) if (typeof value[field] !== 'string' || !value[field].trim()) errors.push(issue(`stage-result.${field}`, `${field} must be a non-empty string`, field));
  if (!stageSet.has(value.stage)) errors.push(issue('stage-result.stage', `stage must be one of ${STAGES.join(', ')}`, 'stage'));
  if (!stageStatusSet.has(value.status)) errors.push(issue('stage-result.status', `status must be one of ${STAGE_STATUSES.join(', ')}`, 'status'));
  if (value.gate !== null && !gateSet.has(value.gate)) errors.push(issue('stage-result.gate', `gate must be one of ${GATES.join(', ')} or null`, 'gate'));
  if (!Array.isArray(value.evidence)) errors.push(issue('stage-result.evidence', 'evidence must be an array', 'evidence'));
  else for (const [index, evidence] of value.evidence.entries()) {
    if (isRecord(evidence)) {
      for (const key of Object.keys(evidence)) if (!(key in resultSchema.properties.evidence.items.properties)) errors.push(issue('stage-result.evidence-field', `evidence[${index}].${key} is unsupported`, `evidence[${index}]`));
      for (const key of ['source', 'reason']) if (evidence[key] !== undefined && typeof evidence[key] !== 'string') errors.push(issue('stage-result.evidence-field', `evidence[${index}].${key} must be a string`, `evidence[${index}]`));
    }
    if (!isRecord(evidence) || typeof evidence.id !== 'string' || !evidence.id.trim() || !evidenceStatusSet.has(evidence.status)) errors.push(issue('stage-result.evidence-item', `evidence[${index}] needs an id and a supported status`, `evidence[${index}]`));
  }
  for (const field of ['missingEvidence', 'unavailableChecks', 'pendingReview']) if (!Array.isArray(value[field]) || value[field].some((item) => typeof item !== 'string' || !item.trim())) errors.push(issue(`stage-result.${field}`, `${field} must be an array of names`, field));
  if (value.input !== undefined && !isRecord(value.input)) errors.push(issue('stage-result.input', 'input must be an object when present', 'input'));
  if (value.output !== undefined && !isRecord(value.output)) errors.push(issue('stage-result.output', 'output must be an object when present', 'output'));
  return errors;
}

export function isValidStageResult(value) {
  return validateStageResult(value).length === 0;
}

export function validateStageCompletion(value, { stage, runId } = {}) {
  const errors = validateStageResult(value);
  const expected = stageContract.stages.find((item) => item.id === stage);
  if (!expected) errors.push(issue('stage-completion.expected-stage', 'a declared expected stage is required'));
  if (typeof runId !== 'string' || !runId.trim()) errors.push(issue('stage-completion.expected-run', 'a non-empty expected runId is required'));
  if (!isRecord(value)) return errors;
  if (value.stage !== stage) errors.push(issue('stage-completion.stage', 'result stage does not match the dispatched stage', 'stage'));
  if (expected && value.gate !== expected.gate) errors.push(issue('stage-completion.gate', 'result gate does not match stages.json', 'gate'));
  if (value.runId !== runId) errors.push(issue('stage-completion.run', 'result runId does not match the dispatched run', 'runId'));
  if (value.status !== 'passed') errors.push(issue('stage-completion.status', 'only a passed result can complete a worker', 'status'));
  for (const field of ['missingEvidence', 'unavailableChecks', 'pendingReview']) {
    if (Array.isArray(value[field]) && value[field].length) errors.push(issue(`stage-completion.${field}`, `${field} must be empty to complete a worker`, field));
  }
  if (Array.isArray(value.evidence)) for (const [index, evidence] of value.evidence.entries()) {
    if (!['passed', 'not-applicable'].includes(evidence?.status)) errors.push(issue('stage-completion.evidence', 'unresolved evidence prevents worker completion', `evidence[${index}]`));
  }
  return errors;
}
