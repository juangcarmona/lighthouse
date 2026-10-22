import { MEMORY_SCOPES } from './memory.mjs';
import { WORKFLOW_STATES } from './workflow.mjs';

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

export function validateControlPlane(value) {
  const errors = [];
  if (!isRecord(value)) return [issue('control-plane.invalid', 'control plane must be an object')];
  if (value.schemaVersion !== 1) errors.push(issue('control-plane.schema-version', 'schemaVersion must be 1', 'schemaVersion'));
  if (!isRecord(value.package) || typeof value.package.name !== 'string' || typeof value.package.version !== 'string') errors.push(issue('control-plane.package', 'package needs name and version', 'package'));
  for (const field of ['routes', 'gates']) if (!Array.isArray(value[field]) || value[field].some((item) => typeof item !== 'string' || !item.trim())) errors.push(issue(`control-plane.${field}`, `${field} must be an array of names`, field));
  if (!isRecord(value.state) || typeof value.state.provider !== 'string' || !value.state.provider.trim()) errors.push(issue('control-plane.state', 'state.provider is required', 'state'));
  if (value.state?.states !== undefined && (!Array.isArray(value.state.states) || value.state.states.some((state) => !WORKFLOW_STATES.includes(state)))) errors.push(issue('control-plane.state-states', 'state.states must contain known workflow states', 'state.states'));
  if (!isRecord(value.memory) || typeof value.memory.provider !== 'string' || !value.memory.provider.trim()) errors.push(issue('control-plane.memory', 'memory.provider is required', 'memory'));
  if (!Array.isArray(value.memory?.scopes) || value.memory.scopes.length === 0 || value.memory.scopes.some((scope) => !MEMORY_SCOPES.includes(scope))) errors.push(issue('control-plane.memory-scopes', `memory.scopes must contain values from ${MEMORY_SCOPES.join(', ')}`, 'memory.scopes'));
  if (value.memory?.scopes?.includes('shared') && value.memory.shared !== true) errors.push(issue('control-plane.shared-memory', 'shared memory requires memory.shared=true', 'memory.shared'));
  if (!isRecord(value.roles)) errors.push(issue('control-plane.roles', 'roles must be an object', 'roles'));
  else for (const [name, role] of Object.entries(value.roles)) {
    if (typeof role === 'string' && role.trim()) continue;
    if (!isRecord(role)) errors.push(issue('control-plane.role', `role ${name} must be an object or provider reference`, `roles.${name}`));
    else {
      for (const field of ['inputSchema', 'outputSchema']) if (typeof role[field] !== 'string' || !role[field].trim()) errors.push(issue('control-plane.role-schema', `role ${name} needs ${field}`, `roles.${name}.${field}`));
      if (!Array.isArray(role.tools)) errors.push(issue('control-plane.role-tools', `role ${name} needs a tools array`, `roles.${name}.tools`));
      if (!Array.isArray(role.writeScope)) errors.push(issue('control-plane.role-write-scope', `role ${name} needs a writeScope array`, `roles.${name}.writeScope`));
    }
  }
  if (!isRecord(value.adapters)) errors.push(issue('control-plane.adapters', 'adapters must be an object', 'adapters'));
  return errors;
}

export function validateLaunchRequest(request, controlPlane) {
  const errors = [];
  if (!isRecord(request)) return [issue('launch.invalid', 'launch request must be an object')];
  for (const field of ['runId', 'role', 'outputSchema']) if (typeof request[field] !== 'string' || !request[field].trim()) errors.push(issue(`launch.${field}`, `${field} must be a non-empty string`, field));
  const role = controlPlane?.roles?.[request.role];
  if (!role) errors.push(issue('launch.role', `role ${request.role} is not declared`, 'role'));
  if (role && request.outputSchema !== role.outputSchema) errors.push(issue('launch.output-schema', `outputSchema does not match role ${request.role}`, 'outputSchema'));
  if (!Array.isArray(request.tools)) errors.push(issue('launch.tools', 'tools must be an array', 'tools'));
  else if (role) for (const tool of request.tools) if (!role.tools.includes(tool)) errors.push(issue('launch.tool', `tool ${tool} is not allowed for role ${request.role}`, 'tools'));
  if (!Array.isArray(request.writeScope)) errors.push(issue('launch.write-scope', 'writeScope must be an array', 'writeScope'));
  else if (role) for (const path of request.writeScope) if (!role.writeScope.includes(path)) errors.push(issue('launch.write-path', `write path ${path} is not allowed for role ${request.role}`, 'writeScope'));
  if (!isRecord(request.limits)) errors.push(issue('launch.limits', 'limits must be an object', 'limits'));
  if (!Array.isArray(request.stopConditions)) errors.push(issue('launch.stop-conditions', 'stopConditions must be an array', 'stopConditions'));
  return errors;
}
