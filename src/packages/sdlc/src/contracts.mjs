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
  if (value.schemaVersion !== 1) errors.push(issue('stage-result.schema-version', 'schemaVersion must be 1', 'schemaVersion'));
  for (const field of ['runId', 'nextAction']) if (typeof value[field] !== 'string' || !value[field].trim()) errors.push(issue(`stage-result.${field}`, `${field} must be a non-empty string`, field));
  if (!stageSet.has(value.stage)) errors.push(issue('stage-result.stage', `stage must be one of ${STAGES.join(', ')}`, 'stage'));
  if (!stageStatusSet.has(value.status)) errors.push(issue('stage-result.status', `status must be one of ${STAGE_STATUSES.join(', ')}`, 'status'));
  if (value.gate !== null && !gateSet.has(value.gate)) errors.push(issue('stage-result.gate', `gate must be one of ${GATES.join(', ')} or null`, 'gate'));
  if (!Array.isArray(value.evidence)) errors.push(issue('stage-result.evidence', 'evidence must be an array', 'evidence'));
  else for (const [index, evidence] of value.evidence.entries()) {
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
