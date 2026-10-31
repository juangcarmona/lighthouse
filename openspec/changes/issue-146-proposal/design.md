# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation. #145's numeric estimate validator is available. Existing `decompose` is a pure plan helper; its GitHub apply creates issues without native links or reconciliation. Existing `stacked` silently chains all children. The native completion path assumes PRs target main and can close the issue after review. It must not be used unchanged for internal child delivery.

<!-- pdac:cite id="BR-DECOMPOSITION" digest="sha256:35124f644d4b43927a3045d1fbfc63858a5d63347dd3c24c5053630e1cb768b1" -->

## Goals / Non-Goals

**Goals:** deterministic, fail-closed eligibility and independently testable reconciliation; preserve existing callers unless an explicit epic mode is selected; make remaining integration work visible.

**Non-Goals:** nested branch machinery, automatic approval, cross-repository scheduling, live remote writes by the implementation agent or treating fixture tests as production run evidence.

## Decisions

1. **Shared epic branch.** Explicit `mode: epic` targets all children at the dedicated integration branch; legacy stacked mode remains compatible. Dependencies determine eligibility, never incidental array order. A genuinely nested branch is deferred until a concrete dependency justifies it.
2. **Estimate boundary.** Reuse #145's full estimate shape. Confirmed 13 requires a valid decomposition or an explicit no-safe-split reason with an owner question. Eight is not oversized. No useful split is not a successful readiness assessment.
3. **Host-authenticated observations.** A pure eligibility evaluator consumes fresh host observations, never issue prose as authority. Child states distinguish intake, questions, waiting dependencies/capacity, running, stale evidence, owner decision, accepted, cancelled and uncertain. Acceptance requires a merged child PR into the epic branch plus retained owner/check evidence; a closed issue alone satisfies nothing.
4. **Versioned correlations and write uncertainty.** Stable resource identity includes repository, parent and slice; each journal key additionally binds an immutable plan digest. Candidate observation spans plan revisions so a changed plan cannot silently duplicate an existing child. HTML comments carry correlation only. The host must compare exact metadata with retained receipts, author/source identity and current native relationships. An uncertain create is not retried until its result is reconciled. Duplicate matches block. The GitHub adapter requires host-supplied durable journal and parent lease callbacks and establishes native parent and blocked-by links; it is not wired to the router yet.
5. **Separate adapters from orchestration.** Tests establish local contracts, not dispatch or merge authority. Wiring router admission, serialized publication, child completion, current checks and aggregate finalization is a separate dependency-ordered task in this same change. Do not enable incomplete orchestration.

## Risks / Trade-offs

- [Shared base advances] → Require evidence bound to both head and current base; revalidate siblings after each accepted merge.
- [Concurrent publishers] → Native execution must serialize per parent and persist intent before irreversible writes; library helpers alone cannot provide a distributed lease.
- [Copied comments] → Exact host-receipt and current-state verification; never use marker presence as permission.
- [Partial implementation] → Leave native integration tasks unchecked and return blocked with missing integration evidence rather than claim end-to-end delivery.

## Migration Plan

Ship explicit opt-in contracts without changing installed workflows. Keep legacy planner output compatible. Enable native epic routing only after publisher/dispatch/completion integration and fixture coverage pass. Rollback disables epic routing; preserve correlated resources and report cancelled or uncertain work rather than deleting it.
