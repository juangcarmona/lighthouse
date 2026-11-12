## What went well
- The two-file correction stayed within the host-authenticated changed-path boundary, with an issue-bound plan. Latest-attempt job proof, strict scan timestamps and no-effect uncertainty match the accepted intent (script:10–69; tests:65–222). Owner: maintenance checker maintainer.
- Independent planning and candidate review accepted the work; four authenticated implementation commands, accepted-head forge CI and actual-merge post-merge CI passed. Integration is established by a retained merge receipt, not inferred from an assessment. Owner: trusted delivery host.

## What went wrong
- Original defect: workflow success/updated_at could masquerade as scan execution and freshness (issue #599; F1). The source correction addresses it; no new source defect was established.
- Evidence handoff: the separately required focused invocation and post-checkbox Markdown rerun have no supplied terminal receipts despite PR/task claims (F2). This is missing proof, not a failed check, and blocks closing review.
- Operations wording still omits the explicit scan-proof requirement (docs/operations/autonomous-delivery.md:11; F3). Architecture guidance remains consistent.
- A prior provider error is reported for this same work item; recurrence across work items and any time/cost impact are unknown.

## Start doing
- Delivery evidence owner: carry explicit work-item verification receipts and their ordering into closing review, alongside admitted host checks; recover original logs before considering any new authorized execution.
- Operations documentation owner: describe latest-attempt scan proof and distinguish source acceptance from installed operation. Installation and reliability observation remain separately owned and unverified.

## Stop doing
- Do not substitute a green workflow for scan proof, or checked tasks/PR prose for terminal receipts. Do not equate successful merge with deployment or measured scheduling reliability.
- Do not count retries of issue #599 as independent recurrence or invent attention/cost metrics.

## Improvement candidates
1. **Evidence completeness (F2).** Observed failure: review lacks two explicitly requested execution receipts. Evidence: accepted design:54,66–70; tasks:19–21; supplied four-command receipt list. Owner: trusted delivery evidence maintainer with juangcarmona. Smallest useful guard: retain and surface a requirement-to-receipt checklist for explicit extra commands and required sequencing, without rerunning integration or adding forge gates. Reproduce in a separate regression fixture by supplying this four-command handoff plus prose claims but omitting focused/post-checkbox receipts; it must remain incomplete. Then add correctly bound original receipts and prove completeness, while missing, wrong-tree or wrong-sequence receipts still block. Any host/policy change requires its own review and regression proof; none is implemented here.
2. **Operations wording (F3).** Observed gap: successful-run language can obscure the now-required scan evidence. Evidence: operations:11 versus script:17–31,53 and skipped-scan regression:87–114. Owner: operations documentation maintainer, juangcarmona. Smallest useful correction: clarify that only the unique successful latest-attempt scan's valid completion establishes freshness; unknown evidence preserves intent and suppresses dispatch. Before correction, use the existing successful-workflow/skipped-scan fixture to demonstrate why the sentence is insufficient, then review revised wording against that negative control and the actual-success controls:145–186. Validate links/Markdown in the separately reviewed documentation change; do not expand authority or modify provider-owned guidance here.

No additional product or architecture defect, cross-work-item recurrence, or need for a new permission was established. Follow-up references remain issue #599 and this review's F2/F3; no issue or next stage was opened.