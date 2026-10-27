# Worker catalogue

A worker is one bounded execution with inputs, steps and a result. Lifecycle stages describe delivery decisions; a worker can perform a correction within an existing stage. GitHub Actions runs the work. Issue receipts link requests, executions and results.

## Route map

```mermaid
flowchart TD
    accTitle: Worker routes
    accDescr: Authorized events select one worker; results or human answers return through the router.
    Event[Owner event or verified completion] --> Router[Authorize and select]
    Router --> Refine[refine]
    Router --> Propose[propose]
    Router --> Implement[implement]
    Router --> Integrate[integrate]
    Router --> Review[review]
    Router --> Apply[apply-review]
    Apply -->|Updated PR and fresh CI| Router
    Refine -->|Ready and continuation authorized| Router
    Propose -->|PR feedback| Router
    Implement -->|PR feedback or accepted head| Router
    Integrate -->|Merged and checks observed| Router
    Router -->|No authorized route| Idle[No worker]
```

The [router source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-router.yml) declares triggers; [routing and admission](../../../src/packages/sdlc/src/issue-actions.mjs) verifies their current meaning. Installation selects workers explicitly. Triage remains a lifecycle skill; it is not an installed Actions worker here. Release remains the repository's separate release automation.

## Common execution boundary

The router records intent before sending. A worker authenticates the request and acquires the issue concurrency group before the agent starts. The agent produces a candidate; a separate trusted publisher rechecks source, intent, reservation and evidence before writing. A completed Actions run can contain a blocked assessment. An interrupted publication is uncertain until its actual effects are inspected.

| Receipt | Meaning | Operator action |
| --- | --- | --- |
| 📥 Requested | Dispatch recorded, worker unconfirmed | Inspect dispatch before resending |
| ▶️ Execution admitted | Worker claimed the request | Open Actions for current progress |
| ⏸️ Waiting for your response | Validated assessment needs a decision | Answer the identified question |
| ✅ Completed | Stage publication completed | Follow the declared next decision |
| ❌ Failed or cancelled | Execution did not publish a completed assessment | Inspect failure and effects before retrying |

## refine

**Entry:** Owner refine request or answer to its pending question. **Effects:** Issue comments and workflow labels; no product changes. **Stop:** Ready can continue to implementation under installed policy; future pauses it.

[Workflow source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-refine.md) · [Lifecycle skill](../../../src/packages/sdlc/skills/refine/SKILL.md)

```mermaid
flowchart TD
    accTitle: refine worker
    accDescr: Authentication precedes assessment; publication distinguishes success, a human blocker and a technical failure.
    Input[Authenticate current request] --> Work[Read issue and authority context]
    Work --> Result{Validated result}
    Result -->|Passed| Publish[Publish readiness or a bounded question]
    Result -->|Decision needed| Wait[Publish question and wait]
    Work -->|Technical failure| Inspect[Record failure and inspect effects]
    Publish --> Cleanup[Release reservation]
    Wait --> Cleanup
    Inspect --> Cleanup
```

## propose

**Entry:** Owner planning request after authenticated refinement. **Effects:** Proposal artifacts and their bot-owned PR only. **Stop:** Planning stays separate from implementation and merge approval.

[Workflow source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-propose.md) · [Lifecycle skill](../../../src/packages/sdlc/skills/propose/SKILL.md)

```mermaid
flowchart TD
    accTitle: propose worker
    accDescr: Authentication precedes assessment; publication distinguishes success, a human blocker and a technical failure.
    Input[Authenticate current request] --> Work[Load refinement and prepare OpenSpec artifacts]
    Work --> Result{Validated result}
    Result -->|Passed| Publish[Publish or update a planning PR]
    Result -->|Decision needed| Wait[Publish question and wait]
    Work -->|Technical failure| Inspect[Record failure and inspect effects]
    Publish --> Cleanup[Release reservation]
    Wait --> Cleanup
    Inspect --> Cleanup
```

## implement

**Entry:** Owner implementation request, authorized refinement continuation. **Effects:** Configured product paths on a bot-owned branch; no merge. **Stop:** Passed candidate waits for acceptance; ambiguous scope asks the owner.

[Workflow source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-implement.md) · [Lifecycle skill](../../../src/packages/sdlc/skills/implement/SKILL.md)

```mermaid
flowchart TD
    accTitle: implement worker
    accDescr: Authentication precedes assessment; publication distinguishes success, a human blocker and a technical failure.
    Input[Authenticate current request] --> Work[Plan, edit candidate and run independent checks]
    Work --> Result{Validated result}
    Result -->|Passed| Publish[Publish or update the implementation PR]
    Result -->|Decision needed| Wait[Publish question and wait]
    Work -->|Technical failure| Inspect[Record failure and inspect effects]
    Publish --> Cleanup[Release reservation]
    Wait --> Cleanup
    Inspect --> Cleanup
```

## integrate

**Entry:** Owner authorization for a PR head or verified delivery event. **Effects:** Protected process evidence; merge only with current explicit authority. **Stop:** Prepared does not mean merged; failed checks or owner decisions block.

[Workflow source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-integrate.md) · [Lifecycle skill](../../../src/packages/sdlc/skills/integrate/SKILL.md)

```mermaid
flowchart TD
    accTitle: integrate worker
    accDescr: Authentication precedes assessment; publication distinguishes success, a human blocker and a technical failure.
    Input[Authenticate current request] --> Work[Check accepted head, CI, policy and evidence]
    Work --> Result{Validated result}
    Result -->|Passed| Publish[Retain assessment and perform only authorized merge]
    Result -->|Decision needed| Wait[Publish question and wait]
    Work -->|Technical failure| Inspect[Record failure and inspect effects]
    Publish --> Cleanup[Release reservation]
    Wait --> Cleanup
    Inspect --> Cleanup
```

## review

**Entry:** Authorized completion request for a merged PR. **Effects:** Process evidence and configured issue labels. **Stop:** Missing historical or post-merge evidence remains a blocker.

[Workflow source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-review.md) · [Lifecycle skill](../../../src/packages/sdlc/skills/review/SKILL.md)

```mermaid
flowchart TD
    accTitle: review worker
    accDescr: Authentication precedes assessment; publication distinguishes success, a human blocker and a technical failure.
    Input[Authenticate current request] --> Work[Verify retained integration and post-merge checks]
    Work --> Result{Validated result}
    Result -->|Passed| Publish[Publish retrospective and configured final state]
    Result -->|Decision needed| Wait[Publish question and wait]
    Work -->|Technical failure| Inspect[Record failure and inspect effects]
    Publish --> Cleanup[Release reservation]
    Wait --> Cleanup
    Inspect --> Cleanup
```

## apply-review

**Entry:** Authorized non-approval feedback on an existing bot proposal or implementation PR. **Effects:** Update that same branch within its existing scope after checking the current head and complete bounded discussion. **Stop:** Ambiguous requests need an answer; duplicate feedback starts no second correction. Approval goes through the integration policy.

[Workflow source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-apply-review.md) · [Feedback authentication](../../../src/packages/sdlc/src/proposal-review.mjs)

```mermaid
flowchart TD
    accTitle: apply-review worker
    accDescr: Verified feedback corrects the existing PR; ambiguity waits and stale publication stops.
    Input[Authenticate feedback and current PR] --> Read[Read bounded conversation]
    Read --> Decision{Actionable within scope}
    Decision -->|Yes| Edit[Correct existing candidate]
    Decision -->|Ambiguous| Wait[Ask owner and wait]
    Edit --> Check[Run required checks]
    Check -->|Passed and inputs unchanged| Publish[Update same PR branch]
    Check -->|Failed or stale| Stop[Retain blocker and stop]
```

## Deterministic maintenance

[Maintenance workflow](../../../src/packages/sdlc/workflows/lighthouse-worker-maintenance.yml) · [Recovery decisions](../../../src/packages/sdlc/src/worker-recovery.mjs)

Installed with `--with-maintenance`, enabled separately by repository variables. No model runs here. The issue receipt, original request artifact and current Actions jobs identify the outcome. At most two linked retries are allowed, 30 minutes apart, only after confirmed failure before publication. A newer request supersedes earlier recovery candidates. Human decisions, changed authority and uncertain effects require intervention. See [enablement and scan bounds](../../../src/packages/sdlc/README.md#worker-maintenance).

```mermaid
flowchart TD
    accTitle: Deterministic worker recovery
    accDescr: Current evidence distinguishes success, human decisions, uncertain effects and bounded technical retry.
    Observe[Authenticate receipt and observe Actions] --> State{Outcome}
    State -->|Succeeded or active| Leave[Keep current execution]
    State -->|Human decision| Human[Wait for owner]
    State -->|Uncertain or stale| Inspect[Report required inspection]
    State -->|Confirmed safe technical failure| Budget{Opt-in, delay and budget}
    Budget -->|Allowed| Record[Record linked retry]
    Record --> Dispatch[Send once and recheck at admission]
    Budget -->|Exhausted| Inspect
    Budget -->|Disabled or delayed| Leave
```

## Error reports

[Report publisher](../../../src/packages/sdlc/src/worker-reports.mjs) · [Operator setup](../../../src/packages/sdlc/README.md#worker-error-reports)

One issue groups each worker/cause pair, with affected issues, execution links, observed counts and a next action. A serialized job uses an owner-selected index issue to record creation intent before sending. It never copies logs or agent prose. Same-request recovery closes resolved reports; a new failure reopens the same report. Missing evidence stays unresolved.

```mermaid
flowchart TD
    accTitle: Worker error reports
    accDescr: Authenticated observations update one report per cause; recorded intent prevents duplicate creation after a lost response.
    Observe[Authenticated maintenance observations] --> Cause[Group worker and cause]
    Cause --> Exists{Report exists}
    Exists -->|Yes| Update[Update distinct occurrences and links]
    Exists -->|No| Intent[Record creation intent in index]
    Intent --> Create[Create once and record report link]
    Intent -->|Response uncertain| Reconcile[Find matching report or require inspection]
    Update --> Outcome{Current evidence}
    Outcome -->|All recovered| Close[Close report]
    Outcome -->|New failure| Reopen[Open same report]
```
