# Request intake and relative estimates

For GitHub actions and labels, start with the [delivery guide](README.md).

The public form requires the problem and desired result. Examples or context are optional. Do not ask a reporter for acceptance criteria, architecture, an estimate or a PR plan; refinement derives engineering criteria.

## Admission and continuation

With the native workflows installed and automation enabled, the owner applies `triage` or manually selects the triage stage to admit an open issue, including an external request. Opening an issue alone starts no agent. Only an owner reply can resume a pending clarification. Admission permits triage only; the result stops for the owner to decide whether to request refinement. An external request can continue when the owner requests the next stage and the host verifies its triage and refinement evidence. Admission never grants implementation or merge permission.

Triage preserves the exact issue body in `output.requestAnalysis.originalRequest`, adds `problem` and `desiredResult`, records `inferences` as `{inference, source}`, lists `unknowns` separately and records `questions` as `{question, blocks}`. An empty questions array means no blocking question. Do not turn nonblocking details into mandatory questions. Cite repository evidence rather than presenting an inference as the requester's words.

## Estimate contract

`output.estimate` follows `schemas/estimate.schema.json`: numeric `points`, `status`, `rationale` with `scope`, `dependencies` and `verification`, `confidence` and a separate `uncertainty` array. Native triage uses `status: provisional`. Missing information that prevents a defensible estimate blocks triage; it does not justify an invented number. Uncertainty can remain when it does not block the outcome.

| Points | Initial relative anchor |
| --- | --- |
| 1 | Localized familiar correction |
| 2 | Small component behavior |
| 3 | Bounded outcome across a few components |
| 5 | Outcome crossing contracts with integration checks |
| 8 | Broad cohesive outcome with several verification paths |
| 13 | Work needing decomposition analysis |

These owner-approved initial anchors consider scope, dependencies and verification or migration effort. They will be calibrated against the first few stories; they are not historically validated or time estimates. Confidence describes strength of evidence, not size. Never inflate points to encode uncertainty or convert S/M/L/XL into points.

Refinement rechecks a supplied `context.triage`, returns `output.estimate`, and retains `output.estimateRevision.previous` plus a `reason` even if unchanged. Direct engineering entry without a triage record remains supported; it must not fabricate a predecessor. Decomposition and aggregate delivery are tracked separately in #146.

## Upgrade and recovery

Follow the [packaged workflow installation and update procedure](README.md#install-or-update-workflows). Triage is included by default. The installer preserves an existing `.github/ISSUE_TEMPLATE/change-request.yml`. Reconcile `triage`, `triaged` and `needs-info` through the declared label catalog. To recover, disable automation and restore the previously reviewed package/workflow revision; issue bodies are never changed.
