## What went well

- Both initializer entry paths had real-Git, isolated-configuration assertions before the repair. The retained RED failed twice at the intended activation assertion; the frozen tests then passed twice on the accepted candidate (priorPlanningReview.regression; implementation receipt :2). This demonstrates behavior rather than relying only on a green workflow.
- One shared root-identity/absent-key helper covers both apply paths. Adjacent tests preserve custom and explicitly empty local/inherited settings, owner file bytes/modes, parent configuration and previews (lighthouse.mjs:783-792,839,966; lighthouse.test.mjs:71-155; receipt :3).
- Independent candidate acceptance, explicit prior delegated integration and exact-merge post-merge CI are separately retained (integration:42092952168:1; github-check:127493421089).

## What went wrong

- The original source installed hooks without activating them; absence was conflated with an exceptional Git read in legacy initialization, and semantic initialization omitted activation. F1 is fixed by PR #458. No new source defect or affected-guidance conflict was established.
- The separate release job actually failed (github-check:127498911251). Its cause and publication outcome are unknown; source review and post-merge CI do not establish a released artifact. F2 remains with release maintainer juangcarmona, outside this gate.
- Dependency setup reported three low-severity vulnerabilities but supplied no advisory detail (receipt :1); F3 is a maintenance observation, not a proven regression. No recurrence across work items is established; multiple routing observations for this issue do not establish recurrence.

## Start doing

- Keep the delivered real-Git parity matrix as the minimum regression evidence when changing either initializer. Owner: CLI maintainer juangcarmona. Retain the exact RED assertion, frozen test identity and GREEN receipt rather than merely reporting test counts.
- Release maintainer juangcarmona should inspect the retained failed release job and determine any partial effects before proposing recovery through the existing authorized release path. Do not infer a source fix or retry authorization from the status alone.

## Stop doing

- Do not equate an installed executable hook with an active Git hook path, or an unset configuration key with an explicitly empty setting. These were demonstrated by this issue's RED evidence.
- Do not describe successful integration, a green conclusion job or this passed review as proof of publication/deployment. No additional process violation or repeated pattern is asserted.

## Improvement candidates

- **Retain the behavior-first guard already delivered (owner: CLI maintainer juangcarmona; follow-up: PR #458 / F1).** Observed failure: fresh legacy and semantic repositories had installed hooks but no effective hooksPath. Evidence: two named ERR_ASSERTION failures in the retained RED and both successful GREEN cases in receipt :2. Smallest useful guard: the existing two-entry real-Git activation test plus the explicit-setting/parent/preview preservation matrix; no new checker mechanism is needed. Reproduce before correction in an authorized isolated fixture by running the frozen named regression against unchanged pre-fix production and requiring the actual hooksPath assertion failure, then run those same bytes against the repair and the adjacent suite. This delivery already has that regression proof and independent review; any extension needs its own review and negative/positive evidence.
- **No additional release guard is proposed yet.** The failed-job identity supports investigation, not a root-cause hypothesis. Owner: release maintainer juangcarmona; follow-up: F2's exact job URL. Before proposing a guard, identify the failed step and partial effects, reproduce that specific failure without publication in an authorized regression fixture, then separately review the smallest correction and its negative/positive proof. No policy/provider guidance change, permission expansion, new issue or next stage is created here.