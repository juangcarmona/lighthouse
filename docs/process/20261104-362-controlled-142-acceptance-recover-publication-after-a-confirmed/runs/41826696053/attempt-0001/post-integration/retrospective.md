## What went well
- Exact PR #364/head and merge revision are bound to the original explicit owner merge grant; the host-verified receipt, not a green assessment, proves integration. Required repository checks and adopted post-merge CI have authenticated revision-specific evidence.
- The original failed run 41824240623 remains visible alongside recovery 41825283912 and commit-pinned publication 7c3f72d7d99e22c31279502c42d562af456da280. The fixture clearly disclaims product behavior.

## What went wrong
- The review packet lacks an ordered fault/recovery trace sufficient to verify #362's receipt-save-before-fault and same-grant/no-repeat requirements (R1). The supplied original failure is real; its precise cause and ordering are unknown here, not inferred from that failure.
- Cleanup is not established: docs/process/20261104-recovery-acceptance.md remains in the supplied current source, and temporary-configuration removal has no supplied receipt (R2). These are evidence/completion gaps, not demonstrated implementation defects or failed required checks.
- PR #363's retirement is owner-reported fixture preparation history, not evidence of recurring product failure. All listed recovery attempts concern one work item; cross-work-item recurrence, attention time and cost are unmeasured.

## Start doing
- Delivery maintainer: attach the existing ordered step/artifact trace to #362, binding the original grant, assessment, saved merge receipt, injected fault, recovery publication, reused CI and review handoff.
- Repository maintainer: retain authorized fixture and temporary-configuration cleanup evidence after preserving the acceptance artifacts. Keep host reservation cleanup distinct.

## Stop doing
- Do not treat repository CI success, a retained merge receipt or a recovery run identifier alone as proof of every recovery acceptance condition. Do not rerun merge/CI to replace missing historical proof or call the deterministic fixture agent implementation.
- Do not broaden this result into #185 unattended product delivery or #219 runtime absence acceptance. No source defect or affected-guidance drift was established.

## Improvement candidates
- **Acceptance trace completeness (owner: SDLC recovery maintainer; evidence: R1, #362, priorIntegration and completionRecovery).** Observed failure: this packet cannot demonstrate ordered fault placement and no-repeat continuation. Smallest useful guard: a bounded acceptance manifest referencing existing authenticated steps/artifacts and original grant, effect and CI identities. Reproduce first with the current packet: retain receipt/report/CI but omit ordering and continuation records and confirm review blocks; then supply a complete trace and prove the guard accepts it while still blocking a changed grant or repeated effect. Any guard is a proposal requiring its own review and regression proof, not an installed policy.
- **Cleanup closeout evidence (owner: repository acceptance maintainer; evidence: R2 and docs/process/20261104-recovery-acceptance.md:1-3).** Observed failure: cleanup completion cannot be established after evidence retention. Smallest useful guard: a cleanup checklist/receipt naming only the fixture and temporary acceptance configuration. Reproduce first with the retained fixture and absent cleanup receipt and confirm closeout blocks; then verify an authorized cleanup receipt and scoped resulting diff, while a missing configuration-removal record still blocks. Review this proposed guard separately before adoption; it must not authorize source changes or erase original failed/recovered evidence.
