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
  if (contract.scenario !== 'design-advice' && !contract.writeScope.length) errors.push({ code: 'skill-trace.scope', message: 'Scoped scenarios require a declared write scope.' });
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
  if (contract.scenario === 'refinement') return result.output.scope.length > 0 && result.output.scope.every(path => withinScope(path, contract.writeScope));
  return sameSet(result.output.changes, events.filter(event => event.type === 'write').map(event => event.path)) && sameSet(result.output.checks, contract.requiredChecks);
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
  'protocol.scope': ({ contract, events }) => contract.scenario === 'design-advice' || events.filter(event => event.type === 'write').every(event => !event.path.endsWith('/') && withinScope(event.path, contract.writeScope)),
  'protocol.no-duplicate-interview': ({ events }) => events.filter(event => event.type === 'interview').length === new Set(events.filter(event => event.type === 'interview').map(event => event.decisionId)).size,
  'protocol.no-reinterview': ({ contract, events }) => !events.some(event => event.type === 'interview' && contract.acceptedDecisions.includes(event.decisionId)),
  'protocol.preserve-decisions': ({ contract, events }) => !events.some(event => event.type === 'replace-decision' && contract.acceptedDecisions.includes(event.decisionId)),
  'completion.result': state => resultReady(state),
  'completion.checks': state => checksReady(state),
  'completion.delivery': ({ contract, events, result, resultIndex }) => Boolean(result) && events.some((event, index) => event.type === 'delivered' && index > resultIndex && event.resultId === result.id && event.requester === contract.requester) && !events.slice(resultIndex + 1).some(event => ['write', 'replace-decision', 'interview'].includes(event.type)),
};

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
  const assertions = Object.entries(assertionPredicates).map(([id, predicate]) => ({ id, status: predicate(state) ? 'passed' : 'failed' }));
  const dimension = prefix => assertions.filter(assertion => assertion.id.startsWith(`${prefix}.`)).every(assertion => assertion.status === 'passed') ? 'passed' : 'failed';
  return { ...base, status: assertions.every(assertion => assertion.status === 'passed') ? 'passed' : 'failed', selection: dimension('selection'), protocol: dimension('protocol'), completion: dimension('completion'), assertions, errors: [] };
}
