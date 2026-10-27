// Selection is configuration, never authority or proof of provider access.
export const MODEL_PROFILES = Object.freeze(['plan', 'build', 'fast']);
export const REASONING_EFFORTS = Object.freeze(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value ?? {}, key);
function keys(value, allowed, label) {
  if (!record(value) || Object.keys(value).some(key => !allowed.includes(key))) throw Error(`Invalid ${label}`);
}
function validateSettings(value, operator = false) {
  keys(value, ['schemaVersion', 'profiles', 'workers', 'defaultProfile', ...(operator ? ['enabled'] : [])], 'model profile configuration');
  if (value.schemaVersion !== 1) throw Error('Model profiles require schemaVersion 1');
  if (operator && typeof value.enabled !== 'boolean') throw Error('Operator model profiles require explicit enabled');
  if (own(value, 'defaultProfile') && !MODEL_PROFILES.includes(value.defaultProfile)) throw Error('Invalid default model profile');
  if (own(value, 'profiles')) {
    keys(value.profiles, MODEL_PROFILES, 'profile names');
    for (const profile of Object.values(value.profiles)) {
      keys(profile, ['model', 'reasoningEffort'], 'model profile settings');
      if (own(profile, 'model') && !/^openai\/[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(profile.model)) throw Error('Profile model must be an OpenAI provider/model identifier without a variant');
      if (own(profile, 'reasoningEffort') && !REASONING_EFFORTS.includes(profile.reasoningEffort)) throw Error('Invalid reasoning effort');
    }
  }
  if (own(value, 'workers')) {
    if (!record(value.workers) || Object.entries(value.workers).some(([worker, profile]) => !/^[a-z][a-z0-9-]{0,63}$/.test(worker) || !MODEL_PROFILES.includes(profile))) throw Error('Invalid worker profile assignments');
  }
  return value;
}

export function resolveModelProfile({ project = null, operator, worker, profile } = {}) {
  if (!record(operator)) throw Error('Operator model configuration required');
  if (project !== null) validateSettings(project);
  const local = operator.modelProfiles;
  if (local !== undefined) validateSettings(local, true);
  if (!local?.enabled) {
    if (profile !== undefined) throw Error('Delegated profiles require operator opt-in');
    if (typeof operator.model !== 'string' || !operator.model.trim() || /[\0\r\n]/.test(operator.model)) throw Error('Legacy operator model required');
    return { mode: 'legacy', profile: null, model: operator.model, reasoningEffort: null, engineModel: operator.model, source: 'operator.model', capabilityEvidence: 'not-checked-legacy' };
  }
  if (profile !== undefined && !MODEL_PROFILES.includes(profile)) throw Error('Invalid requested model profile');
  const choices = [[profile, 'task.profile'], [local.workers?.[worker], 'operator.workers'], [project?.workers?.[worker], 'project.workers'], [local.defaultProfile, 'operator.defaultProfile'], [project?.defaultProfile, 'project.defaultProfile']];
  const choice = choices.find(([name]) => name !== undefined);
  if (!choice) throw Error('No model profile assigned to worker');
  const [name, source] = choice;
  const base = project?.profiles?.[name] ?? {}, override = local.profiles?.[name] ?? {};
  const selected = { ...base, ...override };
  if (!selected.model || !selected.reasoningEffort) throw Error(`Incomplete model profile: ${name}`);
  const capability = operator.modelCapabilities?.[selected.model];
  if (!record(capability) || capability.available !== true || capability.tools !== true || !Array.isArray(capability.reasoningEfforts) || !capability.reasoningEfforts.includes(selected.reasoningEffort)) throw Error(`Model or reasoning unavailable in operator capabilities: ${name}`);
  return { mode: 'profile', profile: name, ...selected, engineModel: `${selected.model}#${selected.reasoningEffort}`, source, fields: { model: own(override, 'model') ? 'operator' : 'project', reasoningEffort: own(override, 'reasoningEffort') ? 'operator' : 'project' }, capabilityEvidence: 'operator-configuration-only' };
}

export function modelExecutionReceipt(selection) {
  return {
    requested: { profile: selection.profile, model: selection.model, reasoningEffort: selection.reasoningEffort },
    resolved: selection,
    providerReported: { model: null, reasoningEffort: null, status: 'unverified', reason: 'The current adapter has no authenticated provider-settings receipt' },
    billing: { route: 'unchanged', actualCost: null, estimatedApiEquivalentCost: null, subscriptionUsage: null },
  };
}
