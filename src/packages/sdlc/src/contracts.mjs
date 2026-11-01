import stageContract from '../stages.json' with { type: 'json' };
import resultSchema from '../schemas/stage-result.schema.json' with { type: 'json' };
import { validateProductChangeOutput } from './product-change.mjs';
import { pendingQuestion } from './handoff.mjs';

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
  for (const key of Object.keys(value)) if (!(Object.hasOwn(resultSchema.properties, key))) errors.push(issue('stage-result.unknown-field', `${key} is unsupported`, key));
  if (value.schemaVersion !== 1) errors.push(issue('stage-result.schema-version', 'schemaVersion must be 1', 'schemaVersion'));
  for (const field of ['runId', 'nextAction']) if (typeof value[field] !== 'string' || !value[field].trim()) errors.push(issue(`stage-result.${field}`, `${field} must be a non-empty string`, field));
  if (!stageSet.has(value.stage)) errors.push(issue('stage-result.stage', `stage must be one of ${STAGES.join(', ')}`, 'stage'));
  if (!stageStatusSet.has(value.status)) errors.push(issue('stage-result.status', `status must be one of ${STAGE_STATUSES.join(', ')}`, 'status'));
  if (value.gate !== null && !gateSet.has(value.gate)) errors.push(issue('stage-result.gate', `gate must be one of ${GATES.join(', ')} or null`, 'gate'));
  if (!Array.isArray(value.evidence)) errors.push(issue('stage-result.evidence', 'evidence must be an array', 'evidence'));
  else for (const [index, evidence] of value.evidence.entries()) {
    if (isRecord(evidence)) {
      for (const key of Object.keys(evidence)) if (!(Object.hasOwn(resultSchema.properties.evidence.items.properties, key))) errors.push(issue('stage-result.evidence-field', `evidence[${index}].${key} is unsupported`, `evidence[${index}]`));
      for (const key of ['source', 'reason']) if (evidence[key] !== undefined && typeof evidence[key] !== 'string') errors.push(issue('stage-result.evidence-field', `evidence[${index}].${key} must be a string`, `evidence[${index}]`));
    }
    if (!isRecord(evidence) || typeof evidence.id !== 'string' || !evidence.id.trim() || !evidenceStatusSet.has(evidence.status)) errors.push(issue('stage-result.evidence-item', `evidence[${index}] needs an id and a supported status`, `evidence[${index}]`));
  }
  for (const field of ['missingEvidence', 'unavailableChecks', 'pendingReview']) if (!Array.isArray(value[field]) || value[field].some((item) => typeof item !== 'string' || !item.trim())) errors.push(issue(`stage-result.${field}`, `${field} must be an array of names`, field));
  if (value.input !== undefined && !isRecord(value.input)) errors.push(issue('stage-result.input', 'input must be an object when present', 'input'));
  if (value.output !== undefined && !isRecord(value.output)) errors.push(issue('stage-result.output', 'output must be an object when present', 'output'));
  else if (isRecord(value.output) && value.output.productChange !== undefined) errors.push(...validateProductChangeOutput(value.output.productChange).map(message => issue('stage-result.product-change', message, 'output.productChange')));
  if (isRecord(value.output) && value.output.productGap !== undefined) {
    const gap = value.output.productGap;
    if (value.status !== 'blocked' || !['triage', 'refine', 'propose', 'implement'].includes(value.stage) || value.output.handoff !== undefined || value.output.productChange !== undefined || !isRecord(gap) || Object.keys(gap).length !== 2 || !['summary', 'scope'].every(key => typeof gap[key] === 'string' && gap[key].trim() && gap[key].length <= 4000 && !/<!--\s*lighthouse-/i.test(gap[key]))) errors.push(issue('stage-result.product-gap', 'a product gap requires a blocked result with a bounded summary and scope and no competing handoff', 'output.productGap'));
  }
  if (isRecord(value.output) && value.output.handoff !== undefined) {
    const handoff = value.output.handoff;
    if (!isRecord(handoff) || Object.keys(handoff).length !== 1 || typeof handoff.question !== 'string' || value.status !== 'blocked') errors.push(issue('stage-result.handoff', 'a handoff question requires a blocked result and no other handoff fields', 'output.handoff'));
    else try { pendingQuestion(handoff.question); } catch { errors.push(issue('stage-result.handoff', 'handoff question must be bounded, non-empty and free of reserved markers', 'output.handoff.question')); }
  }
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
