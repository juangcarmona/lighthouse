import schema from '../schemas/skill-contracts.schema.json' with { type: 'json' };

// This closed walker implements only the keywords used by the bundled schema.
// It is not a general JSON Schema implementation or a provider trace adapter.
function conforms(value, rule) {
  if (rule.$ref) return conforms(value, schema.$defs[rule.$ref.split('/').at(-1)]);
  if (rule.oneOf && rule.oneOf.filter(candidate => conforms(value, candidate)).length !== 1) return false;
  if (Object.hasOwn(rule, 'const') && value !== rule.const) return false;
  if (rule.enum && !rule.enum.includes(value)) return false;
  if (rule.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if (rule.required?.some(key => !Object.hasOwn(value, key))) return false;
    if (rule.additionalProperties === false && Object.keys(value).some(key => !Object.hasOwn(rule.properties, key))) return false;
    if (Object.entries(rule.properties).some(([key, child]) => Object.hasOwn(value, key) && !conforms(value[key], child))) return false;
  }
  if (rule.type === 'array') {
    if (!Array.isArray(value) || value.length < (rule.minItems ?? 0) || value.length > (rule.maxItems ?? Infinity)) return false;
    // All uniqueItems arrays in this closed schema contain primitive strings.
    if (rule.uniqueItems && new Set(value).size !== value.length) return false;
    if (value.some(item => !conforms(item, rule.items))) return false;
  }
  if (rule.type === 'string') {
    if (typeof value !== 'string' || [...value].length < (rule.minLength ?? 0) || [...value].length > (rule.maxLength ?? Infinity)) return false;
    if (rule.pattern && !new RegExp(rule.pattern, 'u').test(value)) return false;
  }
  return true;
}

export function validateSkillTrace(value) {
  if (!conforms(value, schema)) return [{ code: 'skill-trace.schema', message: 'Trace does not conform to skill-contracts.schema.json.' }];
  const { contract } = value;
  const roles = contract.requiredContext.map(context => context.role);
  const requiredRoles = contract.scenario === 'design-advice' ? ['request', 'product', 'design'] : ['request', 'product', 'architecture'];
  const errors = [];
  if (requiredRoles.some(role => !roles.includes(role))) errors.push({ code: 'skill-trace.context', message: 'Contract lacks required authority roles.' });
  if (new Set(contract.requiredContext.map(context => context.id)).size !== contract.requiredContext.length) errors.push({ code: 'skill-trace.context-id', message: 'Context identities must be unique.' });
  if (contract.scenario === 'design-advice' && (!contract.acceptedDecisions.length || contract.writeScope.length)) errors.push({ code: 'skill-trace.advice', message: 'Advice requires accepted decisions and an empty write scope.' });
  if (contract.scenario === 'refinement' && (contract.writeScope.length || !contract.implementationScope?.length || !contract.requiredWork?.length)) errors.push({ code: 'skill-trace.refinement', message: 'Refinement requires no write permission, a proposed implementation scope and declared requested work.' });
  if (contract.scenario === 'implementation' && !contract.writeScope.length) errors.push({ code: 'skill-trace.scope', message: 'Implementation requires a declared write scope.' });
  if (contract.scenario === 'implementation' && !contract.requiredChecks.length) errors.push({ code: 'skill-trace.checks', message: 'Implementation requires completion checks.' });
  return errors;
}

const withinScope = (path, scope) => scope.some(entry => path === entry || (entry.endsWith('/') && path.startsWith(entry)));
const sameSet = (left, right) => new Set(left).size === new Set(right).size && left.every(item => right.includes(item));

function contextReady({ contract, events }) {
  const firstWork = events.findIndex(event => !['selected', 'read'].includes(event.type));
  const reads = events.slice(0, firstWork < 0 ? events.length : firstWork).filter(event => event.type === 'read');
  return contract.requiredContext.every(context => reads.some(read => read.contextId === context.id && read.revision === context.revision));
}

function resultReady({ contract, events, result }) {
  if (!result || events.filter(event => event.type === 'result').length !== 1 || result.output.kind !== contract.scenario) return false;
  if (contract.scenario === 'design-advice') return result.output.recommendations.every(item => contract.acceptedDecisions.includes(item.decisionId));
  if (contract.scenario === 'refinement') return refinementGaps(contract, result.output).length === 0;
  return sameSet(result.output.changes, events.filter(event => event.type === 'write').map(event => event.path)) && sameSet(result.output.checks, contract.requiredChecks);
}

function refinementGaps(contract, output) {
  const gaps = [];
  if (!output.problem) gaps.push('missing bounded problem');
  if (!output.acceptanceCriteria?.length) gaps.push('missing acceptance criteria');
  if (!output.scope?.length || !output.scope.every(path => withinScope(path, contract.implementationScope))) gaps.push('missing or outside proposed implementation scope');
  if (!output.dependencies || output.dependencies.some(item => item.status !== 'resolved') || new Set(output.dependencies.map(item => item.id)).size !== output.dependencies.length) gaps.push('missing, duplicate or unresolved dependencies');
  if (!output.estimate || output.estimate.status !== 'confirmed') gaps.push('missing confirmed explained estimate');
  for (const id of contract.requiredWork) if (!output.completedWork?.includes(id)) gaps.push(`missing requested work ${id}`);
  return gaps;
}

const matchingDelivery = ({ contract, events, result, resultIndex }) => events.findIndex((event, index) => event.type === 'delivered' && index > resultIndex && event.resultId === result?.id && event.requester === contract.requester);

function bindingReady(state, field) {
  const index = matchingDelivery(state);
  return (!state.result || state.result[field] === state.contract[field]) && (index < 0 || state.events[index][field] === state.contract[field]);
}

function checksReady({ contract, events, resultIndex }) {
  if (!contract.requiredChecks.length) return true;
  if (resultIndex < 0) return false;
  const lastWrite = events.findLastIndex(event => event.type === 'write');
  return contract.requiredChecks.every(id => {
    const index = events.findLastIndex(event => event.type === 'check' && event.id === id);
    return index > lastWrite && index < resultIndex && events[index].status === 'passed';
  });
}

// Keep predicates distinct: reports and mutation tests rely on their stable IDs.
const assertionPredicates = {
  'selection.expected': ({ contract, events }) => events.filter(event => event.type === 'selected').length === 1 && events[0]?.type === 'selected' && events[0].skill === contract.skill,
  'protocol.context': state => contextReady(state),
  'protocol.advice-read-only': ({ contract, events }) => contract.scenario !== 'design-advice' || !events.some(event => event.type === 'write'),
  'protocol.refinement-read-only': ({ contract, events }) => contract.scenario !== 'refinement' || !events.some(event => event.type === 'write'),
  'protocol.scope': ({ contract, events }) => contract.scenario !== 'implementation' || events.filter(event => event.type === 'write').every(event => !event.path.endsWith('/') && withinScope(event.path, contract.writeScope)),
  'protocol.no-duplicate-interview': ({ events }) => events.filter(event => event.type === 'interview').length === new Set(events.filter(event => event.type === 'interview').map(event => event.decisionId)).size,
  'protocol.no-reinterview': ({ contract, events }) => !events.some(event => event.type === 'interview' && contract.acceptedDecisions.includes(event.decisionId)),
  'protocol.preserve-decisions': ({ contract, events }) => !events.some(event => event.type === 'replace-decision' && contract.acceptedDecisions.includes(event.decisionId)),
  'completion.result': state => resultReady(state),
  'completion.checks': state => checksReady(state),
  'completion.delivery': ({ contract, events, result, resultIndex }) => Boolean(result) && events.some((event, index) => event.type === 'delivered' && index > resultIndex && event.resultId === result.id && event.requester === contract.requester) && !events.slice(resultIndex + 1).some(event => ['write', 'replace-decision', 'interview'].includes(event.type)),
  'completion.request-binding': state => bindingReady(state, 'requestId'),
  'completion.run-binding': state => bindingReady(state, 'runId'),
};

// Findings use bounded JSON Pointers into the supplied document, never native
// provenance claims. Missing observations reference the expectation instead.
function assertionFinding(id, state, passed) {
  const { contract, events, result, resultIndex } = state;
  const eventRefs = types => events.flatMap((event, index) => types.includes(event.type) ? [`/events/${index}`] : []);
  const refs = [];
  let applicable = true;
  let reason;
  if (id === 'selection.expected') {
    refs.push('/contract/skill', ...eventRefs(['selected']));
    reason = `${passed ? 'Observed' : 'Missing or incorrect unique initial selection of'} expected skill ${contract.skill}.`;
  } else if (id === 'protocol.context') {
    const firstWork = events.findIndex(event => !['selected', 'read'].includes(event.type));
    const missing = contract.requiredContext.filter(context => !events.slice(0, firstWork < 0 ? events.length : firstWork).some(event => event.type === 'read' && event.contextId === context.id && event.revision === context.revision));
    refs.push('/contract/requiredContext', ...eventRefs(['read']));
    reason = missing.length ? `Missing timely matching context reads: ${missing.map(item => `${item.id}@${item.revision} (${item.role})`).join(', ')}.` : 'Every declared context identity and revision was read before work.';
  } else if (id.endsWith('-read-only')) {
    const scenario = id === 'protocol.advice-read-only' ? 'design-advice' : 'refinement';
    applicable = contract.scenario === scenario;
    refs.push('/contract/scenario', ...eventRefs(['write']));
    reason = !applicable ? `Not applicable to ${contract.scenario}.` : passed ? `${scenario} has no observed project writes.` : `${scenario} forbids project writes; observed ${events.filter(event => event.type === 'write').map(event => event.path).join(', ')}.`;
  } else if (id === 'protocol.scope') {
    applicable = contract.scenario === 'implementation';
    refs.push('/contract/writeScope', ...eventRefs(['write']));
    reason = !applicable ? 'Not applicable: advice and refinement have separate zero-write obligations.' : passed ? 'Observed implementation writes stay within declared permission.' : `Out-of-scope or directory writes: ${events.filter(event => event.type === 'write' && (event.path.endsWith('/') || !withinScope(event.path, contract.writeScope))).map(event => event.path).join(', ')}.`;
  } else if (id.startsWith('protocol.')) {
    const types = id === 'protocol.preserve-decisions' ? ['replace-decision'] : ['interview'];
    refs.push('/contract/acceptedDecisions', ...eventRefs(types));
    reason = passed ? `No prohibited ${id === 'protocol.preserve-decisions' ? 'accepted-decision replacements' : id === 'protocol.no-reinterview' ? 'accepted-decision interviews' : 'duplicate interviews'} observed.` : `Prohibited decision activity for ${id}: ${events.filter(event => types.includes(event.type)).map(event => event.decisionId).join(', ')}.`;
  } else if (id === 'completion.result') {
    refs.push('/contract/scenario', ...eventRefs(['result']));
    const gaps = result?.output.kind === 'refinement' && contract.scenario === 'refinement' ? refinementGaps(contract, result.output) : [];
    if (contract.scenario === 'refinement') refs.push('/contract/requiredWork', '/contract/implementationScope');
    reason = passed ? 'One complete scenario-appropriate structured result observed.' : !result ? 'Missing result observation; reference reads are not completion.' : gaps.length ? `Incomplete refinement: ${gaps.join('; ')}.` : 'Result is duplicated, has the wrong scenario, or its recommendations/changes/checks do not correspond to the contract and observations.';
  } else if (id === 'completion.checks') {
    applicable = contract.requiredChecks.length > 0;
    refs.push('/contract/requiredChecks', ...eventRefs(['write', 'check', 'result']));
    const lastWrite = events.findLastIndex(event => event.type === 'write');
    const missing = contract.requiredChecks.filter(check => {
      const index = events.findLastIndex(event => event.type === 'check' && event.id === check);
      return index <= lastWrite || index >= resultIndex || events[index]?.status !== 'passed';
    });
    reason = !applicable ? 'Not applicable: caller declared no completion checks.' : passed ? 'Every declared check passed after the final write and before the result.' : `Missing timely passed check evidence: ${missing.join(', ') || 'result observation'}.`;
  } else if (id === 'completion.delivery') {
    refs.push('/contract/requester', ...eventRefs(['result', 'delivered', 'write', 'replace-decision', 'interview']));
    reason = passed ? `Result ${result.id} was delivered later to ${contract.requester}, without subsequent project or decision work.` : `Missing ordered delivery of result ${result?.id ?? '(absent)'} to ${contract.requester}, or work continued after the result.`;
  } else {
    const field = id === 'completion.request-binding' ? 'requestId' : 'runId';
    applicable = Boolean(result);
    refs.push(`/contract/${field}`, ...eventRefs(['result', 'delivered']));
    reason = !applicable ? 'Not applicable until a result exists; completion.result and completion.delivery report missing evidence.' : passed ? `Result and matching delivery, when present, bind ${field}=${contract[field]}; missing delivery is assessed separately.` : `Cross-${field === 'requestId' ? 'request' : 'run'} observation: expected ${contract[field]}, result supplied ${result[field]}, matching delivery supplied ${events[matchingDelivery(state)]?.[field] ?? '(absent)'}.`;
  }
  return { applicability: applicable ? 'applicable' : 'not-applicable', reason: reason.slice(0, 2048), observationRefs: refs.slice(0, 32) };
}

/** Evaluate observations, not their authenticity or general answer quality.
 * The caller must supply the admitted contract independently of agent output.
 */
export function evaluateSkillTrace(value) {
  const errors = validateSkillTrace(value);
  const base = { schemaVersion: 1, mode: 'simulation', providerMeasurement: 'unmeasured' };
  if (errors.length) return { ...base, status: 'invalid', selection: 'not-evaluated', protocol: 'not-evaluated', completion: 'not-evaluated', assertions: [], errors };
  const { contract, events } = value;
  const resultIndex = events.findIndex(event => event.type === 'result');
  const state = { contract, events, resultIndex, result: events[resultIndex] };
  const assertions = Object.entries(assertionPredicates).map(([id, predicate]) => {
    const passed = predicate(state);
    return { id, status: passed ? 'passed' : 'failed', ...assertionFinding(id, state, passed) };
  });
  const dimension = prefix => assertions.filter(assertion => assertion.id.startsWith(`${prefix}.`)).every(assertion => assertion.status === 'passed') ? 'passed' : 'failed';
  return { ...base, status: assertions.every(assertion => assertion.status === 'passed') ? 'passed' : 'failed', selection: dimension('selection'), protocol: dimension('protocol'), completion: dimension('completion'), assertions, errors: [] };
}
