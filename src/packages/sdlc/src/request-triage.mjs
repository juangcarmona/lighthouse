import { isDeepStrictEqual } from 'node:util';

// Semantic assessments come from the agent; these checks enforce the public contract.
export const storyPoints = Object.freeze([1, 2, 3, 5, 8, 13]);
const text = value => typeof value === 'string' && value.trim().length > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateEstimate(estimate, { provisional = false } = {}) {
  const errors = [];
  if (!record(estimate)) return ['estimate must be an object'];
  if (!storyPoints.includes(estimate.points)) errors.push('estimate.points must be 1, 2, 3, 5, 8 or 13');
  if (!['low', 'medium', 'high'].includes(estimate.confidence)) errors.push('estimate.confidence must be low, medium or high');
  if (!['provisional', 'confirmed'].includes(estimate.status) || provisional && estimate.status !== 'provisional') errors.push('estimate.status must match the provisional triage or confirmed refinement assessment');
  for (const factor of ['scope', 'dependencies', 'verification']) if (!text(estimate.rationale?.[factor])) errors.push(`estimate.rationale.${factor} must explain the estimate`);
  if (!Array.isArray(estimate.uncertainty) || estimate.uncertainty.some(item => !text(item))) errors.push('estimate.uncertainty must be a separate array of descriptions');
  return errors;
}

export function validateRequestTriage(output, originalRequest) {
  if (!record(output)) return ['triage output must be an object'];
  const errors = validateEstimate(output.estimate, { provisional: true });
  const analysis = output.requestAnalysis;
  if (!record(analysis)) return [...errors, 'requestAnalysis must preserve the request and distinguish inferences, unknowns and blocking questions'];
  if (typeof analysis.originalRequest !== 'string' || originalRequest !== undefined && analysis.originalRequest !== originalRequest) errors.push('requestAnalysis.originalRequest must preserve the exact original request');
  for (const field of ['problem', 'desiredResult']) if (!text(analysis[field])) errors.push(`requestAnalysis.${field} is required`);
  if (!Array.isArray(analysis.inferences) || analysis.inferences.some(item => !text(item?.inference) || !text(item?.source))) errors.push('each inference needs a description and evidence source');
  if (!Array.isArray(analysis.unknowns) || analysis.unknowns.some(item => !text(item))) errors.push('unknowns must be a separate array of descriptions');
  if (!Array.isArray(analysis.questions) || analysis.questions.some(item => !text(item?.question) || !text(item?.blocks))) errors.push('each question must state the outcome it blocks');
  if (analysis.questions?.length) errors.push('blocking questions prevent passed triage');
  return errors;
}

export function validateEstimateRevision(output, prior) {
  if (!prior) return [];
  const errors = validateEstimate(output?.estimate);
  if (!isDeepStrictEqual(output?.estimateRevision?.previous, prior)) errors.push('refinement must preserve the prior estimate');
  if (!text(output?.estimateRevision?.reason)) errors.push('refinement must explain whether and why the estimate changed');
  return errors;
}

// Later owner requests on external issues need the triage receipt checked in preparation.
export const eligibleIssueAuthor = (issue, owner, stage) => issue?.user?.login === owner || stage === 'triage' || issue?.labels?.some(label => label.name === 'triaged');
