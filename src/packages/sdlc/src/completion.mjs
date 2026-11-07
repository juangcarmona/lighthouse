// Compatibility facade; internal services import their owning module directly.
export { fingerprint, sha, authorizeCompletion } from './completion-contract.mjs';
export { authorizeCompletionEvent } from './completion-events.mjs';
export { list, loadProfile, ruleRevision, evidenceProtection, requiredPolicy, observeChecks, assertCitedChecks, checkCommit, completionEffects, inspectCompletion, assertFresh, assertChecks, mergeAccepted, postMergeRuns } from './completion-state.mjs';
