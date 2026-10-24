const DIMENSIONS = Object.freeze({
  size: ['S', 'M', 'L', 'XL'],
  urgency: ['normal', 'asap', 'now'],
  impact: ['low', 'medium', 'high'],
  risk: ['low', 'medium', 'high'],
  'blast-radius': ['low', 'medium', 'high'],
});

const CONFIDENCE = new Set(['low', 'medium', 'high']);
const ROLES = new Set(['state', 'command', 'classification', 'overlay']);
const ROUTES = new Set(['supervised', 'plan-only', 'unattended', 'hotfix', 'stacked']);
const DEPENDENCY_STATES = new Set(['resolved', 'open', 'unknown']);
const EVIDENCE_STATES = new Set(['provided', 'unavailable', 'pending-review']);
const HEX = /^[0-9a-f]{6}$/iu;
const EVIDENCE_FIELDS = ['size', 'urgency', 'impact', 'risk', 'blast-radius'];

export const suggestedLabelColors = Object.freeze({
  'size-s': 'BFE3FF',
  'size-m': '80C2FF',
  'size-l': '4DA3FF',
  'size-xl': '1F6FEB',
  'urgency-normal': '8B949E',
  'urgency-asap': 'D29922',
  'urgency-now': 'CF222E',
  'impact-low': 'E9D5FF',
  'impact-medium': 'A371F7',
  'impact-high': '6E40C9',
  'risk-low': 'FFEBE9',
  'risk-medium': 'F0883E',
  'risk-high': 'CF222E',
  'blast-radius-low': 'C7F0E8',
  'blast-radius-medium': '4FB3A4',
  'blast-radius-high': '0F766E',
});

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizedValue(dimension, value) {
  if (dimension === 'size') return String(value ?? '').toUpperCase();
  return String(value ?? '').toLowerCase();
}

function labelFor(dimension, value) {
  return `${dimension}-${normalizedValue(dimension, value).toLowerCase()}`;
}

function issue(code, message, field) {
  return field ? { code, field, message } : { code, message };
}

function addIssue(issues, code, message, field) {
  issues.push(issue(code, message, field));
}

export function validateConfiguration(configuration) {
  const errors = [];
  const labels = Array.isArray(configuration?.labels) ? configuration.labels : null;
  const byName = new Map();
  const classifications = new Map();
  const stateLabels = new Set();
  const commandLabels = new Set();

  if (!labels) addIssue(errors, 'configuration.labels', 'configuration.labels must be an array', 'configuration.labels');
  for (const descriptor of labels ?? []) {
    if (!isRecord(descriptor) || typeof descriptor.name !== 'string' || !descriptor.name.trim()) {
      addIssue(errors, 'label.invalid', 'every label descriptor needs a non-empty name', 'configuration.labels');
      continue;
    }
    const name = descriptor.name.trim();
    if (byName.has(name)) addIssue(errors, 'label.duplicate', `label ${name} is declared more than once`, 'configuration.labels');
    byName.set(name, descriptor);
    if (!ROLES.has(descriptor.role)) {
      addIssue(errors, 'label.role', `label ${name} must use role state, command, classification or overlay`, 'configuration.labels');
      continue;
    }
    if (descriptor.role === 'state') stateLabels.add(name);
    if (descriptor.role === 'command') commandLabels.add(name);
    if (descriptor.role !== 'classification') continue;
    const dimension = String(descriptor.dimension ?? '').toLowerCase();
    const value = normalizedValue(dimension, descriptor.value);
    if (!Object.hasOwn(DIMENSIONS, dimension) || !DIMENSIONS[dimension].includes(value)) {
      addIssue(errors, 'label.classification', `label ${name} has an invalid classification dimension or value`, 'configuration.labels');
      continue;
    }
    if (labelFor(dimension, value) !== name) {
      addIssue(errors, 'label.syntax', `classification label ${name} must use the ${labelFor(dimension, value)} syntax`, 'configuration.labels');
    }
    const key = `${dimension}:${value}`;
    if (classifications.has(key)) addIssue(errors, 'label.classification-duplicate', `classification ${key} is declared more than once`, 'configuration.labels');
    classifications.set(key, name);
    if (descriptor.color !== undefined && (typeof descriptor.color !== 'string' || !HEX.test(descriptor.color))) {
      addIssue(errors, 'label.color', `classification label ${name} color must be six hexadecimal characters`, 'configuration.labels');
    }
  }

  const transitions = Array.isArray(configuration?.transitions) ? configuration.transitions : [];
  const transitionSet = new Set();
  for (const transition of transitions) {
    if (!isRecord(transition) || typeof transition.from !== 'string' || typeof transition.to !== 'string') {
      addIssue(errors, 'transition.invalid', 'every transition needs from and to labels', 'configuration.transitions');
      continue;
    }
    const key = `${transition.from}->${transition.to}`;
    if (transitionSet.has(key)) addIssue(errors, 'transition.duplicate', `transition ${key} is declared more than once`, 'configuration.transitions');
    transitionSet.add(key);
  }

  return { errors, byName, classifications, stateLabels, commandLabels, transitionSet };
}

function validateWorkItem(workItem, errors) {
  if (!isRecord(workItem)) {
    addIssue(errors, 'work-item.invalid', 'workItem must be an object', 'workItem');
    return;
  }
  for (const field of ['id', 'title']) {
    if (typeof workItem[field] !== 'string' || !workItem[field].trim()) addIssue(errors, `work-item.${field}`, `workItem.${field} must be a non-empty string`, `workItem.${field}`);
  }
  if (workItem.type !== undefined && (typeof workItem.type !== 'string' || !workItem.type.trim())) addIssue(errors, 'work-item.type', 'workItem.type must be a non-empty string when provided', 'workItem.type');
}

function validateAssessment(assessment, errors) {
  if (!isRecord(assessment)) {
    addIssue(errors, 'assessment.invalid', 'assessment must be an object', 'assessment');
    return;
  }
  for (const dimension of Object.keys(DIMENSIONS)) {
    const value = normalizedValue(dimension, assessment[dimension === 'blast-radius' ? 'blastRadius' : dimension]);
    if (!DIMENSIONS[dimension].includes(value) && !(dimension === 'blast-radius' && value === 'unknown')) {
      addIssue(errors, `assessment.${dimension}`, `${dimension} has an unsupported value`, `assessment.${dimension}`);
    }
  }
  if (!ROUTES.has(assessment.route)) addIssue(errors, 'assessment.route', `route must be one of ${[...ROUTES].join(', ')}`, 'assessment.route');
  if (typeof assessment.nextState !== 'string' || !assessment.nextState.trim()) addIssue(errors, 'assessment.next-state', 'nextState must be a non-empty string', 'assessment.nextState');
  if (typeof assessment.owner !== 'string' || !assessment.owner.trim()) addIssue(errors, 'assessment.owner', 'owner must be a non-empty string', 'assessment.owner');
  if (!isRecord(assessment.confidence)) {
    addIssue(errors, 'assessment.confidence', 'confidence must be an object with one value per triage dimension', 'assessment.confidence');
  } else {
    for (const dimension of EVIDENCE_FIELDS) if (!CONFIDENCE.has(assessment.confidence[dimension])) addIssue(errors, `assessment.confidence.${dimension}`, `${dimension} confidence must be low, medium or high`, `assessment.confidence.${dimension}`);
  }
  if (!Array.isArray(assessment.dependencies)) {
    addIssue(errors, 'assessment.dependencies', 'dependencies must be an array', 'assessment.dependencies');
  } else {
    for (const dependency of assessment.dependencies) {
      if (!isRecord(dependency) || typeof dependency.id !== 'string' || !DEPENDENCY_STATES.has(dependency.status)) addIssue(errors, 'assessment.dependency', 'each dependency needs an id and a resolved, open or unknown status', 'assessment.dependencies');
    }
  }
  if (!Array.isArray(assessment.evidence)) {
    addIssue(errors, 'assessment.evidence', 'evidence must be an array', 'assessment.evidence');
  } else {
    const fields = new Set();
    for (const evidence of assessment.evidence) {
      const status = evidence?.status ?? 'provided';
      const valid = isRecord(evidence) && EVIDENCE_FIELDS.includes(evidence.field) && EVIDENCE_STATES.has(status);
      if (!valid) {
        addIssue(errors, 'assessment.evidence-item', 'each evidence item needs a known field and a provided, unavailable or pending-review status', 'assessment.evidence');
        continue;
      }
      if (fields.has(evidence.field)) addIssue(errors, 'assessment.evidence-duplicate', `${evidence.field} has more than one evidence status`, 'assessment.evidence');
      fields.add(evidence.field);
      if (status === 'provided' && (typeof evidence.source !== 'string' || !evidence.source.trim())) addIssue(errors, 'assessment.evidence-source', 'provided evidence needs a non-empty source', 'assessment.evidence');
      if (status !== 'provided' && (typeof evidence.reason !== 'string' || !evidence.reason.trim())) addIssue(errors, 'assessment.evidence-reason', `${status} evidence needs a non-empty reason`, 'assessment.evidence');
    }
  }
}

function currentState(labels, configuration) {
  const states = labels.filter((label) => configuration.stateLabels.has(label));
  return { states, value: states.length === 1 ? states[0] : null };
}

function classificationState(labels, configuration) {
  const byDimension = new Map();
  for (const label of labels) {
    const descriptor = configuration.byName.get(label);
    if (!descriptor || descriptor.role !== 'classification') continue;
    const list = byDimension.get(descriptor.dimension) ?? [];
    list.push(label);
    byDimension.set(descriptor.dimension, list);
  }
  return byDimension;
}

function proposedLabels(currentLabels, assessment, configuration) {
  const result = new Set(currentLabels.filter((label) => {
    const descriptor = configuration.byName.get(label);
    return !descriptor || (descriptor.role !== 'state' && descriptor.role !== 'classification' && descriptor.role !== 'command');
  }));
  for (const label of configuration.stateLabels) if (currentLabels.includes(label)) result.add(label);
  for (const label of configuration.commandLabels) if (currentLabels.includes(label)) result.delete(label);
  const state = currentState(currentLabels, configuration).value;
  if (state) result.delete(state);
  if (assessment.nextState) result.add(assessment.nextState);
  for (const dimension of Object.keys(DIMENSIONS)) {
    const key = dimension === 'blast-radius' ? 'blastRadius' : dimension;
    const value = normalizedValue(dimension, assessment[key]);
    for (const label of configuration.classifications.values()) {
      const descriptor = configuration.byName.get(label);
      if (descriptor?.dimension === dimension) result.delete(label);
    }
    if (value !== 'UNKNOWN') {
      const label = configuration.classifications.get(`${dimension}:${value}`);
      if (label) result.add(label);
    }
  }
  return [...result].sort((a, b) => a.localeCompare(b));
}

export function buildTriageReport(input) {
  const errors = [];
  if (!isRecord(input)) return { schemaVersion: 1, status: 'invalid', valid: false, canApply: false, errors: [issue('input.invalid', 'triage input must be an object')], warnings: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], labels: { current: [], proposed: [] } };
  if (input.schemaVersion !== 1) addIssue(errors, 'input.schema-version', 'schemaVersion must be 1', 'schemaVersion');
  const configuration = validateConfiguration(input.configuration);
  errors.push(...configuration.errors);
  const currentLabels = Array.isArray(input.currentLabels) ? [...new Set(input.currentLabels.filter((label) => typeof label === 'string'))].sort() : [];
  if (!Array.isArray(input.currentLabels)) addIssue(errors, 'labels.invalid', 'currentLabels must be an array', 'currentLabels');
  validateWorkItem(input.workItem, errors);
  validateAssessment(input.assessment, errors);

  const state = currentState(currentLabels, configuration);
  if (state.states.length > 1) addIssue(errors, 'state.ambiguous', `work item has multiple workflow state labels: ${state.states.join(', ')}`, 'currentLabels');
  if (state.states.length === 0) addIssue(errors, 'state.missing', 'work item needs one configured workflow state label', 'currentLabels');
  const assessment = isRecord(input.assessment) ? input.assessment : {};
  if (state.value && typeof assessment.nextState === 'string' && configuration.stateLabels.has(assessment.nextState)) {
    if (state.value !== assessment.nextState && !configuration.transitionSet.has(`${state.value}->${assessment.nextState}`)) addIssue(errors, 'transition.illegal', `transition ${state.value}->${assessment.nextState} is not configured`, 'assessment.nextState');
  } else if (typeof assessment.nextState === 'string' && assessment.nextState && !configuration.stateLabels.has(assessment.nextState)) {
    addIssue(errors, 'transition.unconfigured', `next state ${assessment.nextState} is not configured`, 'assessment.nextState');
  }
  const currentClassifications = classificationState(currentLabels, configuration);
  for (const [dimension, values] of currentClassifications) if (values.length > 1) addIssue(errors, 'classification.ambiguous', `work item has multiple ${dimension} classification labels: ${values.join(', ')}`, 'currentLabels');
  for (const dimension of Object.keys(DIMENSIONS)) {
    const value = normalizedValue(dimension, assessment[dimension === 'blast-radius' ? 'blastRadius' : dimension]);
    if (value !== 'UNKNOWN' && configuration.classifications.has(`${dimension}:${value}`) === false) addIssue(errors, 'classification.unconfigured', `${labelFor(dimension, value)} is not configured`, `assessment.${dimension}`);
  }

  const evidence = Array.isArray(assessment.evidence) ? assessment.evidence : [];
  const evidenceFields = new Set(evidence.filter(isRecord).map((item) => item.field));
  const missingEvidence = EVIDENCE_FIELDS.filter((field) => !evidenceFields.has(field));
  const unavailableChecks = evidence.filter((item) => isRecord(item) && item.status === 'unavailable').map((item) => item.field);
  const pendingReview = evidence.filter((item) => isRecord(item) && item.status === 'pending-review').map((item) => item.field);
  const warnings = [
    ...missingEvidence.map((field) => issue('evidence.missing', `${field} has no evidence record`, field)),
    ...unavailableChecks.map((field) => issue('evidence.unavailable', `${field} could not be checked`, field)),
    ...pendingReview.map((field) => issue('evidence.pending-review', `${field} is waiting for judgement`, field)),
  ];
  const proposed = proposedLabels(currentLabels, assessment, configuration);
  const status = errors.length ? 'invalid' : warnings.length ? 'blocked' : 'ready';
  return {
    schemaVersion: 1,
    status,
    valid: errors.length === 0,
    canApply: status === 'ready',
    workItem: input.workItem ?? null,
    assessment: {
      size: normalizedValue('size', assessment.size),
      urgency: normalizedValue('urgency', assessment.urgency),
      impact: normalizedValue('impact', assessment.impact),
      risk: normalizedValue('risk', assessment.risk),
      blastRadius: normalizedValue('blast-radius', assessment.blastRadius),
      dependencies: assessment.dependencies ?? [],
      route: assessment.route ?? null,
      owner: assessment.owner ?? null,
      confidence: assessment.confidence ?? {},
      evidence,
    },
    transition: { from: state.value, to: assessment.nextState ?? null },
    labels: { current: currentLabels, proposed },
    missingEvidence,
    unavailableChecks,
    pendingReview,
    suggestedColors: suggestedLabelColors,
    errors,
    warnings,
  };
}

export function applyTriageLabels(report) {
  if (!report?.canApply) throw new Error('Triage report is not ready to apply. Resolve its errors or outstanding evidence state first.');
  return [...report.labels.proposed];
}

export { DIMENSIONS, ROUTES };
