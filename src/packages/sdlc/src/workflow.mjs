export const WORKFLOW_STATES = Object.freeze(['ready', 'running', 'waiting-human', 'blocked', 'succeeded', 'failed', 'cancelled']);

const transitions = Object.freeze({
  ready: ['running', 'cancelled'],
  running: ['waiting-human', 'blocked', 'succeeded', 'failed', 'cancelled'],
  'waiting-human': ['running', 'blocked', 'cancelled'],
  blocked: ['ready', 'cancelled'],
  failed: ['ready', 'cancelled'],
  succeeded: [],
  cancelled: [],
});
const stateSet = new Set(WORKFLOW_STATES);

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function problem(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

export function allowedTransitions(state) {
  return [...(transitions[state] ?? [])];
}

export function validateStateEvent(event, previousState = null) {
  const errors = [];
  if (!isRecord(event)) return [problem('state-event.invalid', 'state event must be an object')];
  if (event.schemaVersion !== 1) errors.push(problem('state-event.schema-version', 'schemaVersion must be 1', 'schemaVersion'));
  for (const field of ['eventId', 'runId', 'route', 'stage', 'actor', 'timestamp', 'reason']) if (typeof event[field] !== 'string' || !event[field].trim()) errors.push(problem(`state-event.${field}`, `${field} must be a non-empty string`, field));
  if (!stateSet.has(event.to)) errors.push(problem('state-event.to', `to must be one of ${WORKFLOW_STATES.join(', ')}`, 'to'));
  if (event.from !== null && !stateSet.has(event.from)) errors.push(problem('state-event.from', `from must be one of ${WORKFLOW_STATES.join(', ')} or null`, 'from'));
  if (previousState !== null && event.from !== previousState) errors.push(problem('state-event.previous', `event from ${event.from} does not match current state ${previousState}`, 'from'));
  if (event.from !== null && !allowedTransitions(event.from).includes(event.to)) errors.push(problem('state-event.transition', `transition ${event.from}->${event.to} is not allowed`, 'to'));
  if (event.from === null && event.to !== 'ready') errors.push(problem('state-event.initial', 'the first event must enter ready', 'to'));
  if (!Array.isArray(event.evidence)) errors.push(problem('state-event.evidence', 'evidence must be an array', 'evidence'));
  return errors;
}

export function replayWorkflow(events) {
  if (!Array.isArray(events)) return { valid: false, errors: [problem('state.events', 'events must be an array')], runs: {} };
  const runs = new Map();
  const errors = [];
  const eventIds = new Set();
  for (const [index, event] of events.entries()) {
    const previous = runs.get(event?.runId)?.state ?? null;
    const eventErrors = validateStateEvent(event, previous);
    if (eventErrors.length) {
      errors.push(...eventErrors.map((error) => ({ ...error, index })));
      continue;
    }
    const current = runs.get(event.runId);
    if (eventIds.has(event.eventId)) {
      errors.push(problem('state-event.duplicate', `event ${event.eventId} appears more than once`, `events[${index}]`));
      continue;
    }
    eventIds.add(event.eventId);
    runs.set(event.runId, { state: event.to, route: event.route, stage: event.stage, events: [...(current?.events ?? []), event] });
  }
  const result = Object.fromEntries([...runs.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([runId, run]) => [runId, { ...run, events: run.events.map((event) => ({ ...event })) }]));
  return { valid: errors.length === 0, errors, runs: result };
}

export function createStateEvent({ eventId, runId, route, stage, from, to, actor, timestamp, reason, evidence = [], parentRunId }) {
  return { schemaVersion: 1, eventId, runId, ...(parentRunId ? { parentRunId } : {}), route, stage, from, to, actor, timestamp, reason, evidence };
}
