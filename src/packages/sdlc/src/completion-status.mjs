const positive = value => /^[1-9][0-9]*$/.test(String(value));
const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');

export function completionSummary(request, receipt, status) {
  const merged = ['merged', 'merged-review-blocked'].includes(receipt.state) && sha(receipt.sha);
  const checks = receipt.postMerge?.map(check => `${check.workflow}: ${check.state ?? check.status}`).join('; ') || 'unavailable';
  const review = request.stage === 'integrate' ? receipt.state === 'merged' ? 'pending' : 'not requested' : `assessment ${status ?? 'unavailable'}; publication confirmed`;
  return `${merged ? `Merge confirmed at ${receipt.sha}.` : 'Merge is not confirmed by this receipt.'} Post-merge CI: ${checks}. Final review: ${review}.`;
}

// This durable hint locates evidence; it never authorizes a worker or a merge.
export function pendingReviewMarker(request, receipt) {
  if (request.stage !== 'integrate' || receipt.state !== 'merged' || !sha(receipt.sha)) return '';
  const hint = { schemaVersion: 1, repository: request.completion.binding.repository, issue: request.issue, pr: request.authorization.pr, head: request.authorization.head, merge: receipt.sha, run: String(request.workflowRunId), attempt: String(request.attempt) };
  if (!validPendingReview(hint)) throw Error('Invalid pending review identity');
  return `<!-- lighthouse-pending-review:${JSON.stringify(hint)} -->`;
}

export function validPendingReview(hint) {
  return hint?.schemaVersion === 1 && /^[\w.-]+\/[\w.-]+$/.test(hint.repository ?? '') && Number.isSafeInteger(hint.issue) && hint.issue > 0 && Number.isSafeInteger(hint.pr) && hint.pr > 0 && sha(hint.head) && sha(hint.merge) && positive(hint.run) && positive(hint.attempt);
}
