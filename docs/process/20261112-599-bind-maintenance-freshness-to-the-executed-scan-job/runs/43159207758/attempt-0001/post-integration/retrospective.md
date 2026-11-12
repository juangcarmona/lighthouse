## What went well
The two-file correction ties freshness and intent reconciliation to a unique successful scan in the selected attempt. Strict timestamp and no-effect regressions address the actual failure, not just a green workflow (script:10–68; tests:65–205). Host-bound independent commands, planning/candidate reviews, the retained authorized merge and post-merge repository check provide distinct evidence. No new source defect or product/architecture decision was established.

## What went wrong
The earlier final review needed manual recovery of focused-test and final-Markdown observations and ordering (PR #624 comment 6814680959). This was an evidence-handoff gap, not a failed test; recovery now supplies those observations. Operations guidance still uses successful-run shorthand where scan proof matters (autonomous-delivery.md:11). Installation and scheduling improvement remain unknown. Retries of #599 do not establish recurrence across work items.

## Start doing
Preserve additional required agent-command receipts and edit/check ordering beside independent evidence, explicitly retaining their different provenance. Keep installation and observation-period claims separate from source acceptance.

## Stop doing
Treating workflow success as scan execution, or generic CI success as proof of every acceptance requirement. Do not repeat integration to repair historical evidence or infer reliability, cost or attention savings from a successful merge.

## Improvement candidates
- **P1 — SDLC evidence-handoff maintainer:** Owner recovery demonstrates that two additional command observations were absent from the compact handoff. Smallest proposed guard: a bounded index of explicitly required agent receipts and edit/check ordering, without promoting them to independent checks. Before correction, reproduce using a retained #599-shaped fixture with passing independent commands but omitted focused/final-Markdown receipts; the handoff should expose missing evidence. Then prove retained original receipts satisfy it while missing, mismatched and out-of-order receipts remain explicit blockers. This guard requires its own scope review and regression proof; none was implemented here.
- **G1 — Operations-documentation maintainer:** Line 11's successful-run wording omits the decisive scan proof. Smallest proposed correction: name the selected attempt's confirmed successful scan completion and preserve no-blind-resend guidance. Before correction, compare that sentence with the skipped-scan fixture and script:53; after correction, review the wording against skipped/missing and valid-scan cases and run Markdown/link checks. This is a separately reviewed documentation proposal, not a new dispatch policy.

Owners and references are recorded in this review only; no follow-up issue, permission change or new stage was created.