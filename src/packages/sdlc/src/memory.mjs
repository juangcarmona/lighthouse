export const MEMORY_SCOPES = Object.freeze(['run', 'project', 'shared']);
const scopeSet = new Set(MEMORY_SCOPES);

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

export function validateMemoryRecord(record, policy = {}) {
  const errors = [];
  if (!isRecord(record)) return [issue('memory.invalid', 'memory record must be an object')];
  for (const field of ['id', 'owner', 'source', 'confidence', 'retention', 'sensitivity']) if (typeof record[field] !== 'string' || !record[field].trim()) errors.push(issue(`memory.${field}`, `${field} must be a non-empty string`, field));
  if (!scopeSet.has(record.scope)) errors.push(issue('memory.scope', `scope must be one of ${MEMORY_SCOPES.join(', ')}`, 'scope'));
  if (record.scope === 'run' && (typeof record.runId !== 'string' || !record.runId.trim())) errors.push(issue('memory.run-id', 'run-scoped memory needs runId', 'runId'));
  if (record.scope === 'project' && (typeof record.projectId !== 'string' || !record.projectId.trim())) errors.push(issue('memory.project-id', 'project-scoped memory needs projectId', 'projectId'));
  if (record.scope === 'shared' && policy.shared !== true) errors.push(issue('memory.shared-disabled', 'shared memory is not enabled by the control-plane policy', 'scope'));
  if (!isRecord(record.value)) errors.push(issue('memory.value', 'value must be an object', 'value'));
  return errors;
}
