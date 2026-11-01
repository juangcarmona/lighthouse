// Selection is configuration, never authority or proof of provider access.
export const MODEL_PROFILES = Object.freeze(['plan', 'build', 'fast']);
export const REASONING_EFFORTS = Object.freeze(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value ?? {}, key);
const profileName = (name, version) => typeof name === 'string' && (version === 1 ? MODEL_PROFILES.includes(name) : /^[a-z][a-z0-9-]{0,63}$/.test(name));
function keys(value, allowed, label) {
  if (!record(value) || Object.keys(value).some(key => !allowed.includes(key))) throw Error(`Invalid ${label}`);
}
function validatePair(value, complete = false) {
  keys(value, ['model', 'reasoningEffort'], 'model profile settings');
  if (complete && (!own(value, 'model') || !own(value, 'reasoningEffort'))) throw Error('Direct model selection must include model and reasoning effort');
  if (own(value, 'model') && (typeof value.model !== 'string' || !/^openai\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(value.model))) throw Error('Profile model must be an OpenAI provider/model identifier without a variant');
  if (own(value, 'reasoningEffort') && !REASONING_EFFORTS.includes(value.reasoningEffort)) throw Error('Invalid reasoning effort');
}
function selector(value, version) {
  if (profileName(value, version)) return value;
  if (version === 2 && record(value)) { validatePair(value, true); return value; }
  throw Error('Invalid model selector');
}
function validateSettings(value, operator = false) {
  keys(value, ['schemaVersion', 'profiles', 'workers', 'defaultProfile', ...(operator ? ['enabled', 'allowExecutionSelection'] : [])], 'model profile configuration');
  if (![1, 2].includes(value.schemaVersion)) throw Error('Model profiles require schemaVersion 1 or 2');
  if (operator && typeof value.enabled !== 'boolean') throw Error('Operator model profiles require explicit enabled');
  if (own(value, 'allowExecutionSelection') && (value.schemaVersion !== 2 || typeof value.allowExecutionSelection !== 'boolean')) throw Error('Execution selection requires version 2 and a boolean opt-in');
  if (own(value, 'defaultProfile')) selector(value.defaultProfile, value.schemaVersion);
  if (own(value, 'profiles')) {
    if (!record(value.profiles) || Object.keys(value.profiles).some(name => !profileName(name, value.schemaVersion))) throw Error('Invalid profile names');
    for (const profile of Object.values(value.profiles)) validatePair(profile);
  }
  if (own(value, 'workers')) {
    if (!record(value.workers)) throw Error('Invalid worker profile assignments');
    for (const [worker, valueForWorker] of Object.entries(value.workers)) {
      if (!/^[a-z][a-z0-9-]{0,63}$/.test(worker)) throw Error('Invalid worker profile assignments');
      selector(valueForWorker, value.schemaVersion);
    }
  }
  return value;
}

export function resolveModelProfile({ project = null, operator, worker, profile, executionSelection } = {}) {
  if (!record(operator)) throw Error('Operator model configuration required');
  if (project !== null) validateSettings(project);
  const local = operator.modelProfiles;
  if (local !== undefined) validateSettings(local, true);
  if (local?.enabled && project?.schemaVersion === 2 && local.schemaVersion !== 2) throw Error('Version 2 model settings require operator version 2');
  if (!local?.enabled) {
    if (profile !== undefined || executionSelection !== undefined) throw Error('Delegated profiles require operator opt-in');
    if (typeof operator.model !== 'string' || !operator.model.trim() || /[\0\r\n]/.test(operator.model)) throw Error('Legacy operator model required');
    return { mode: 'legacy', profile: null, model: operator.model, reasoningEffort: null, engineModel: operator.model, source: 'operator.model', capabilityEvidence: 'not-checked-legacy' };
  }
  if (profile !== undefined && !profileName(profile, local.schemaVersion)) throw Error('Invalid requested model profile');
  if (profile !== undefined && executionSelection !== undefined) throw Error('Conflicting model selections');
  let execution;
  if (executionSelection !== undefined) {
    if (local.schemaVersion !== 2 || local.allowExecutionSelection !== true) throw Error('Execution selection requires operator opt-in');
    keys(executionSelection, ['profile', 'model', 'reasoningEffort'], 'execution model selection');
    if (own(executionSelection, 'profile')) {
      if (Object.keys(executionSelection).length !== 1 || !profileName(executionSelection.profile, 2)) throw Error('Invalid execution model selection');
      execution = executionSelection.profile;
    } else { validatePair(executionSelection, true); execution = executionSelection; }
  }
  const choices = [[execution, 'execution'], [profile, 'task.profile'], [own(local.workers, worker) ? local.workers[worker] : undefined, 'operator.workers'], [own(project?.workers, worker) ? project.workers[worker] : undefined, 'project.workers'], [local.defaultProfile, 'operator.defaultProfile'], [project?.defaultProfile, 'project.defaultProfile']];
  const choice = choices.find(([value]) => value !== undefined);
  if (!choice) throw Error('No model profile assigned to worker');
  const [value, source] = choice, name = typeof value === 'string' ? value : null;
  const base = name && own(project?.profiles, name) ? project.profiles[name] : {};
  const override = name && own(local.profiles, name) ? local.profiles[name] : {};
  const selected = name ? { ...base, ...override } : value;
  if (!selected.model || !selected.reasoningEffort) throw Error(`Incomplete model profile: ${name}`);
  const capability = operator.modelCapabilities?.[selected.model];
  if (!record(capability) || capability.available !== true || capability.tools !== true || !Array.isArray(capability.reasoningEfforts) || !capability.reasoningEfforts.includes(selected.reasoningEffort)) throw Error(`Model or reasoning unavailable in operator capabilities: ${name ?? source}`);
  const directSource = source === 'execution' ? 'execution' : source.startsWith('operator.') ? 'operator' : 'project';
  return { mode: name ? 'profile' : 'direct', profile: name, ...selected, engineModel: `${selected.model}#${selected.reasoningEffort}`, source, fields: name ? { model: own(override, 'model') ? 'operator' : 'project', reasoningEffort: own(override, 'reasoningEffort') ? 'operator' : 'project' } : { model: directSource, reasoningEffort: directSource }, capabilityEvidence: 'operator-configuration-only' };
}

export function modelExecutionReceipt(selection) {
  return {
    requested: { profile: selection.profile, model: selection.model, reasoningEffort: selection.reasoningEffort },
    resolved: selection,
    providerReported: { model: null, reasoningEffort: null, status: 'unverified', reason: 'The current adapter has no authenticated provider-settings receipt' },
    billing: { route: 'unchanged', actualCost: null, estimatedApiEquivalentCost: null, subscriptionUsage: null },
  };
}
