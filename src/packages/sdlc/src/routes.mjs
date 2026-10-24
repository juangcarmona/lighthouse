import { GATES, STAGES } from './contracts.mjs';

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

export function validateRouteDescriptor(route, contract = {}) {
  const errors = [];
  if (!route || typeof route !== 'object') return [issue('route.invalid', 'route must be an object')];
  if (typeof route.id !== 'string' || !route.id.trim()) errors.push(issue('route.id', 'route id must be a non-empty string', 'id'));
  if (!Array.isArray(route.stages) || route.stages.length === 0 || route.stages.some((stage) => !STAGES.includes(stage))) errors.push(issue('route.stages', `stages must use ${STAGES.join(', ')}`, 'stages'));
  if (!Array.isArray(route.humanGates) || route.humanGates.some((gate) => !GATES.includes(gate))) errors.push(issue('route.gates', `humanGates must use ${GATES.join(', ')}`, 'humanGates'));
  if (contract.stages && route.stages?.some((stage, index) => stage !== contract.stages[index])) errors.push(issue('route.order', 'route stages must preserve the package stage order', 'stages'));
  return errors;
}

export function buildRoutePlan(route, { available = [], decisions = {}, composition } = {}) {
  const errors = validateRouteDescriptor(route);
  if (composition !== undefined && !['stage', 'ff'].includes(composition)) errors.push(issue('route.composition', 'composition must be stage or ff', 'composition'));
  // shortcut: gh-aw has no verified approval adapter; enable ff when host decisions can be verified.
  if (composition === 'ff' && route.humanGates?.length) errors.push(issue('route.human-gates-unverified', 'ff requires verified human gate decisions; dispatch one stage while the approval adapter is unavailable', 'humanGates'));
  const prerequisites = (route.requires ?? []).map((requirement) => ({ id: requirement, status: available.includes(requirement) ? 'passed' : 'pending-review' }));
  const status = errors.length ? 'invalid' : prerequisites.some((item) => item.status !== 'passed') ? 'blocked' : 'ready';
  return { schemaVersion: 1, status, valid: errors.length === 0, canRun: status === 'ready', route: route.id, stages: [...(route.stages ?? [])], humanGates: [...(route.humanGates ?? [])], requires: prerequisites, decisions, errors };
}
