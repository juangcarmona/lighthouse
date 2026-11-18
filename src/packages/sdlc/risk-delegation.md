# Risk-bound continuation

Read this when `context.unattended.delegation` is present. It adds restrictive evidence to the existing [FF/hotfix composition](unattended.md); the host still owns authorization, isolation, limits and effects.

## Operator selection

Add this optional member to the project-owned `.lighthouse/unattended.json` after reviewing its sensitive surfaces. Paths are exact files or directory prefixes, without globs; an empty list is permitted when the project has no additional path-based stop. The reason explains the project rule.

```json
"delegation": {
  "schemaVersion": 1,
  "reason": "Authentication and irreversible data changes require the project owner.",
  "stopPaths": ["src/auth/", "src/data/migrations/"]
}
```

Omitting the member preserves the existing policy contract. Selecting it does not enable execution, merge or any new capability. Keep `merge`, size limits, correction limits and required checks under their existing ownership. No numerical risk score or automatic gate relaxation is introduced.

## Worker assessment

For refinement/triage and implementation, return `output.delegation` using the exact shape supplied in `context.unattended.delegation.assessment`. Inspect relevant callers and changed surfaces, then record:

- `inherentRisk`: `level` (`routine`, `sensitive`, `unknown`), `reversible`, a source-grounded `reason`, and bounded `dependents`. Explain an empty dependent list in the reason.
- `scope`: exact repository-relative files and a source-grounded effect `reason` for each. Refinement establishes the admitted file set; a candidate can use a subset. Extra files need fresh refinement even inside broader project paths.
- `defects`: `status` (`none`, `unresolved`, `unknown`) and a `reason` describing outstanding delivery findings. Keep a confirmed hotfix's original defect in the existing eligibility and regression evidence; it is not a fabricated passing verification.
- `evidence`: `confidence` (`sufficient`, `uncertain`, `unavailable`) and its `reason`. Confidence describes inspected evidence and its limits; the host separately requires executed checks and independent review.

Sensitive or unknown risk, irreversibility, unresolved/unknown findings, uncertain/unavailable proof and project stop paths block continuation. Model text cannot waive a stop. The host also checks actual modified files, so omitting a sensitive path from the report cannot authorize its publication. FF's host-prepared, independently reviewed issue-plan root remains allowed, subject to the same sensitive-path stops.

The independent reviewer receives the admission assessment, candidate assessment, actual changes and executed check evidence. Verify the claims against those inputs. Misleading classification, missing consumer impact or unsubstantiated reversibility requires correction or escalation under the existing review protocol.

## Decisions and recovery

The host retains versioned decisions with repository/issue/route/source/intent/policy bindings, scope digest, separate assessment axes, reasons and next action in `report.json` and the published `implementation-evidence.json` unattended member. These are host observations from that attempt, not owner acceptance decisions.

The existing host callbacks recheck current authority before effects. Changed inputs require fresh admission; failed checks and bounded reviewer corrections consume the existing shared budget. Cancellation and exhausted limits retain their existing stop behavior. A favorable decision permits only the next already authorized action. Required forge CI, owner product/architecture decisions, merge, release and protected environments keep their own gates.

The additive `@juangcarmona/lighthouse-sdlc/risk-delegation` export supplies `validateDelegationPolicy`, `delegationAssessmentContract` and `assessDelegation` for host adapters. Only trusted host code supplies bindings, candidate inventory, executed receipts and independent verdicts. The evaluator does not authenticate external input or enforce a sandbox by itself.

Operational recurrence, false positives, human effort and cost remain measurements for the #99 pilot. This capability supplies no evidence that greater autonomy is justified.
