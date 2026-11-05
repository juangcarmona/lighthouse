export function reviewOutputProtocol(request) {
  const output = request.reviewOutput;
  if (output === undefined) return null;
  if (request.worker !== 'independent-review' || request.stage !== 'integrate' || output?.protocol !== 'verdict-v1' ||
      !/^[a-f0-9]{64}$/.test(output.binding ?? '') || !['plan', 'candidate'].includes(output.purpose)) throw Error('Invalid host review output contract');
  return output;
}

export function reviewTemplate(output) {
  return { binding: output.binding, verdict: 'escalate', findings: ['Independent review has not been completed.'] };
}

export function validateReviewPayload(value, binding) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 3 ||
      Object.keys(value).some(key => !['binding', 'verdict', 'findings'].includes(key)) || value.binding !== binding ||
      !['accept', 'request-changes', 'escalate'].includes(value.verdict) || !Array.isArray(value.findings) ||
      value.findings.length > 30 || value.findings.some(f => typeof f !== 'string' || !f.trim() || f.length > 4000) ||
      (value.verdict === 'accept' ? value.findings.length !== 0 : value.findings.length === 0)) throw Error('Reviewer returned invalid or stale findings');
  return value;
}

export function reviewEnvelope(value, request) {
  const output = reviewOutputProtocol(request);
  if (!output) throw Error('Host review output contract is absent');
  validateReviewPayload(value, output.binding);
  const accepted = value.verdict === 'accept';
  return { schemaVersion: 1, result: {
    schemaVersion: 1, runId: request.runId, stage: request.stage, gate: 'done', status: accepted ? 'passed' : 'blocked',
    evidence: [], missingEvidence: value.findings, unavailableChecks: [], pendingReview: [], output: { review: value },
    nextAction: accepted ? 'Return to the trusted host for the remaining delivery gates.' : 'Resolve the independent review findings before continuation.',
  }, effect: { type: 'issue-comment', body: accepted ? 'Independent review accepted the supplied binding; subsequent host gates remain required.' : `Independent review: ${value.verdict}.\n\n${value.findings.join('\n\n')}` } };
}
