# Workflow handoffs

Every handoff names the observed outcome, the person who acts next, the concrete action and the condition for continuation. Execution receipts remain in details. The six delivery stages use the same renderer and result projection in [handoff.mjs](src/handoff.mjs); [issue-actions.mjs](src/issue-actions.mjs) and [completion-actions.mjs](src/completion-actions.mjs) validate the stage envelope and current authority before publishing effects.

The event router selects one authorized route. The agent returns staged output without GitHub write credentials. The trusted publisher validates that output, confirms any review target, changes labels, then posts the explanatory comment. A result digest binds a published issue handoff to its envelope: replaying it adds no effects, and a conflicting envelope for the same attempt stops for reconciliation. Older handoffs without the result digest require explicit reconciliation before replay. Current source, answers and reservation checks remain binding during publication. A newer dispatch prevents an older publisher or cleanup from changing its status or releasing its reservation.

## Outcomes

| Observation | Visible handoff and action |
| --- | --- |
| Request recorded | Requested; wait for admission. Dispatch is not confirmed. |
| Worker admitted | Queued; wait for execution and its result. |
| Agent executing | Working; inspect public progress in the execution. |
| Explicit unanswered question | `needs-info`; include the complete question and ask the owner to reply on the issue. The reply resumes that stage after fresh authorization checks. |
| Confirmed reviewable result | `waiting-review`; link the actual PR and name the required decision. Implementation drafts use `pr-draft` while CI or blockers remain. |
| Passed stage without a review target | Stage completed; explain the configured continuation. Refinement can produce `ready`; triage produces `triaged`. |
| Operational blocker | Blocked; name the missing condition and responsible maintainer. It creates no question or review target. |
| Failed or cancelled agent with publication skipped | Fresh failed or cancelled handoff; inspect the execution and recovery policy. Adopted label capability 3 permits `execution-failed` for failures. |
| Publisher interrupted, or missing step records | Execution status unknown; compare actual labels, comments and PR effects before any retry. Cancelled agent plus cancelled publisher without steps belongs here. |
| Published result with failed cleanup | Blocked; inspect reservation ownership. The existing result stays visible. |

For example, a refinement asks “Which export format should we support?” and receives an owner answer. The continuation retains that question and answer. If its agent then fails before publication, a fresh failure comment appears after the answer acknowledgment; it identifies the maintainer's recovery action and claims no PR. If publication has unconfirmed effects, that final comment reports unknown instead.

## Recovery

[Worker maintenance](src/worker-recovery.mjs) is the shared recovery path. Install maintenance explicitly, enable `LIGHTHOUSE_MAINTENANCE_ENABLED`, and separately enable `LIGHTHOUSE_RECOVERY_ENABLED` to permit retries. Missing or false enablement never authorizes a retry. The existing limit remains two linked retries per original request with a 30-minute delay after the failed execution ends; maintenance records each request before sending it once.

Retry requires a confirmed dispatch, successful preparation, an explicitly skipped publication step, unchanged source and owner intent, and no human decision or reservation. An absent publisher or incomplete job inventory cannot establish retry eligibility. The worker checks the original authority again before admitting the linked attempt.

The deterministic failure classifier distinguishes a short execution below five minutes without retained output, an annotated runner shutdown, and a terminal provider stream interruption from a substantive failure. Short duration is a cost bound, not proof of a provider outage. Duration must be known in every case. Retained output, unavailable result evidence, explicit cancellation, container resource failures, changed authority and uncertain publication prevent automatic retry. Shutdown evidence comes from the job's authenticated check URL; a terminal provider error must carry the host adapter's engine prefix, which model and tool messages cannot impersonate. Missing diagnostics establish no infrastructure cause. The failed attempt retains its cause and exhaustion requires a new owner decision.

Maintenance can restore interrupted read-only triage/refinement label and comment publication from authenticated request/result artifacts. It checks the current source, owner answers, labels and dispatch before applying missing effects. It releases an abandoned read-only reservation only when the retained snapshot and unchanged bot label event identify its owner. It leaves other uncertain effects for the maintainer to reconcile.

## Verification

The deterministic matrix executes production functions and commands with API doubles; it does not create remote Actions runs. Run it with:

```sh
node --test src/tests/handoff*.test.mjs src/tests/worker-recovery.test.mjs src/tests/issue-actions.test.mjs src/tests/implement-dispatch.test.mjs src/tests/completion.test.mjs src/tests/proposal*.test.mjs
```

The cases cover invalid and conflicting output, question/answer history, confirmed PR publication, label/comment ordering, committed writes with lost responses, duplicate and late events, cancelled publisher setup, reservation ownership, retry causes, fake-clock delay and exhaustion. `scripts/verify-issue-workflows.sh` packs the package, installs its workflows in a disposable consumer, compiles them with gh-aw and checks lock drift. `npm run verify` checks the repository and builds its public projections. CI runs those checks independently. A real installed workflow or model/provider execution is separate evidence and must be linked explicitly; passing local tests or CI does not establish that it happened.
