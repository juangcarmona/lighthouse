<!-- pdac-scope: cited -->

# Daily repository housekeeping for Lighthouse adopters

## Why

Issue #652 requests a daily repository-housekeeping capability delivered through `lighthouse upgrade`, with each adopter running its own workflow. Its reported audit distinguishes maintenance failures, disabled maintenance and missing workflows; those observations motivate the change but do not establish their causes or current runtime state.

The accepted model provides safe upgrades, rebuildable runs and bounded lifecycle handoffs. Those contracts do not require a daily repository-wide sweep, evidence of complete coverage, or upgrade delivery of housekeeping to every eligible adopter. This is a product delta, not merely a repair or refactor.

## Requested Product Intent

Every eligible adopter can obtain repository-local daily housekeeping through its normal reviewed upgrade route and consistent new-project installation. The adopter explicitly activates execution. A deterministic sweep reconciles eligible stale state, reviews dependencies and parent/child completion, and reports actionable human blockers without changing the owning lifecycle or granting new authority. Installation, configuration, activation, scan completion and verified effects are independently observable.

A complete scan retains actual completion time, covered scope, item dispositions and evidence. Missing, skipped, failed and incomplete scans cannot imply healthy daily coverage. One stable repository summary or existing report index retains current blockers and the last complete sweep without duplicating effects or overwriting owner notes.

## Impacted Product Areas

- FR-FOUNDATION-UPGRADE: preserve the existing safe-upgrade obligation unchanged. The new housekeeping requirement defines its own upgrade-delivery and adoption/runtime evidence obligations under that contract. This avoids modifying the same artifact as the active CHG-CAPABILITY-RECONCILIATION-001 proposal.
<!-- pdac:cite id="FR-FOUNDATION-UPGRADE" digest="sha256:a0bb73ab253c0bc2bac7aa20292b1fce8cabaf8fcfa09beaad49218eae912972" -->

- UC-RUN-SDLC: accepted lifecycle grounding for the new housekeeping interaction; its gates and completion responsibilities remain unchanged.
<!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:a3b45e255f698172bd04b27c7bce6c12146a60772d42b779bcb76cf902b162a9" -->

- FR-WORKFLOW-STATE: accepted execution-evidence grounding; housekeeping must reconcile against durable state, not invent another state machine. No edit is needed.
<!-- pdac:cite id="FR-WORKFLOW-STATE" digest="sha256:3ed598d061437216b0cbfee80437d9917eb61c3b1d028d3fc440cdd4dc3a986f" -->

- FR-WORKFLOW-HANDOFFS: accepted reporting and bounded-reconciliation grounding. Its prohibition on introducing a scheduler for handoff repair is preserved: the new daily repository capability reuses existing scheduling and dispatch paths rather than changing handoff rules or granting retry authority.
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

- Add UC-REPOSITORY-HOUSEKEEPING for the adopter's daily or manually requested repository review.
- Add FR-REPOSITORY-HOUSEKEEPING for complete-scan evidence, conservative reconciliation, stable reporting, freshness and consistent installation.

## Neighbours Checked and Left Out

- UC-UPDATE-FOUNDATION, BR-OWNED-AUTHORITY and CON-PROJECT-OWNERSHIP: existing preview, review and ownership boundaries remain sufficient; the specific new housekeeping obligation belongs in FR-REPOSITORY-HOUSEKEEPING, derived from UC-UPDATE-FOUNDATION.
- UC-INITIALIZE-PROJECT and FR-INITIALIZE-FOUNDATION: selected delivery assets already install through initialization; the new housekeeping requirement adds consistency with upgrades without changing application selection or authority setup.
- UC-CONTINUE-AGENT-RUN, BR-ENTRY-AUTHORITY and FR-AUTHORIZED-WORKFLOW-ENTRY: continuation still requires current authority and evidence. A resolved dependency is eligibility information, not permission.
- BR-WORKFLOW-STATE, FR-WORKFLOW-STATE, FR-LABEL-STATE and FR-LABEL-ROLES: durable execution, independent reservations and legal label transitions remain authoritative. No label vocabulary or lease semantics are replaced.
- BR-DECOMPOSITION and UC-IMPLEMENT-CHANGE: child closure, merge and workflow success cannot replace the owning lifecycle's acceptance or completion evidence. No gate changes are proposed.
- FR-WORKFLOW-HANDOFFS and FR-VERIFY-FOUNDATION: existing honest status and actionable recovery remain controlling; housekeeping adds specific coverage and freshness obligations rather than redefining verification or handoffs.
- FR-SDLC-LIFECYCLE and BR-SDLC-PACKAGE-BOUNDARY: the selected delivery package supplies the capability, not cross-repository orchestration, provider infrastructure or a second lifecycle.
- BR-HUMAN-AUTHORITY and BR-FAIL-CLOSED: explicit decisions and honest uncertainty are retained, not exceptions to be relaxed.
- ACT-ADOPTER, BC-FOUNDATION, TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-GATE and TERM-UPGRADE-PLAN: existing actors, context and vocabulary already describe the proposed interaction. No new actor, context or term is necessary.
- CON-PERSONAL-FIRST: qualification in Lighthouse and a representative adopter supports repeated repository-local adoption; no hosted fleet, organization identity or named-pilot prerequisite is introduced.

The full artifact index was compared for scope. Application profiles, UI, public-site projection, telemetry, memory and unrelated product/architecture integration capabilities have no requested semantic change. No journey rewrite or extra structured behaviour is needed: the new use case and explicit verification scenarios describe this bounded outcome without duplicating the existing delivery journey.

## Clarification Report

Provider evidence comes from the host's pinned ProductShape core reports against baseline digest `5a5b0630d8c97d8283b67cf248fe861e00f25fed4ae8fe40e73c10bd14bdb5de`. The table records the neighbour checks retained from preparation and the delta adjusted during recovery. New-node relationships are proposed traceability, not claims that new nodes already exist in the baseline graph. Polarity describes the reason for review, not authorization to change a neighbour.

| Priority | Changed or proposed node | Neighbour and relationship | Polarity and mechanical reason | Classification |
| --- | --- | --- | --- | --- |
| 1 | UC-REPOSITORY-HOUSEKEEPING | BR-ENTRY-AUTHORITY; proposed governed-by | Dependency: a sweep might otherwise turn eligibility into execution permission | Checked and unaffected; retain current admission and authority |
| 1 | UC-REPOSITORY-HOUSEKEEPING | BR-DECOMPOSITION; proposed governed-by | Dependency: child closure might otherwise close a parent before aggregate acceptance | Checked and unaffected; preserve owning completion rules |
| 1 | FR-REPOSITORY-HOUSEKEEPING | UC-REPOSITORY-HOUSEKEEPING; proposed derived-from | Positive extension: the new interaction needs observable coverage, effects and freshness obligations | Affected; add both complete artifacts |
| 1 | FR-REPOSITORY-HOUSEKEEPING | BR-WORKFLOW-STATE; proposed derived-from; FR-WORKFLOW-STATE shares this source | Dependency: clearing an old reservation could disrupt live execution | Checked and unaffected; require run, attempt and current reservation evidence |
| 2 | FR-REPOSITORY-HOUSEKEEPING | UC-UPDATE-FOUNDATION; proposed derived-from; FR-FOUNDATION-UPGRADE shares this source | Dependency: universal availability must still respect selective scopes and reviewed ownership | New housekeeping requirement affected; existing upgrade requirement and use case remain unchanged |
| 2 | FR-REPOSITORY-HOUSEKEEPING | BR-OWNED-AUTHORITY and CON-PROJECT-OWNERSHIP; proposed derived-from | Dependency: generated support surfaces could overwrite adopter or provider work | Existing authority and ownership rules remain unchanged; preserve conflicts and ownership stops |
| 2 | FR-REPOSITORY-HOUSEKEEPING | UC-INITIALIZE-PROJECT; proposed derived-from; FR-INITIALIZE-FOUNDATION shares this source | Positive extension: new and existing adopters need the same packaged capability | New requirement affected; initialization neighbours checked and unaffected |
| 2 | UC-REPOSITORY-HOUSEKEEPING | BR-SDLC-PACKAGE-BOUNDARY; proposed governed-by; UC-RUN-SDLC already governed-by | Dependency: distribution must not become fleet orchestration | Checked and unaffected; each adopter operates locally |
| 2 | FR-REPOSITORY-HOUSEKEEPING | FR-WORKFLOW-HANDOFFS via shared BR-WORKFLOW-STATE and BR-ENTRY-AUTHORITY sources | Dependency: summary updates and recovery could duplicate or misorder effects | Checked and unaffected; reuse stable reporting and bounded recovery |
| 3 | FR-REPOSITORY-HOUSEKEEPING | FR-VERIFY-FOUNDATION via shared BR-FAIL-CLOSED source | Dependency: installed or empty-by-error could be mistaken for healthy coverage | Checked and unaffected; add scan-specific evidence obligations |

Recovery review reduced the delta to two additions. Upgrade-specific housekeeping obligations and scenarios were moved intact into FR-REPOSITORY-HOUSEKEEPING; FR-FOUNDATION-UPGRADE remains unchanged to avoid overlap with CHG-CAPABILITY-RECONCILIATION-001. The existing upgrade contract continues to govern these additions. No uncertain product-semantic candidate remains. The observed reconciliation incident remains an unclassified delivery investigation, not an inferred change to authority or completion policy.

## Refinement pass

Current queue: the trusted publisher validates these exact files against the current accepted model, calculates the proposal digest and publishes an explicit product decision request. No existing change was present at the assigned change root. The candidate retains the supplied change name, baseline digest and enclosing propose stage.

Ambiguity review compared the following observable alternatives with the issue and accepted model:

- Installation alone versus operational daily coverage: the issue explicitly selects separate installation, activation, completion and verified-effect evidence.
- Automatic activation versus explicit activation: explicit activation is required; an upgrade cannot silently enable automation.
- Per-adopter operation versus a central fleet service: per-adopter execution is selected; inventory and named-pilot selection are not prerequisites.
- Age-based cleanup versus evidence-based reconciliation: active and uncertain work must remain protected.
- Merge-based closure versus lifecycle-based completion: the owning lifecycle's evidence controls closure, including aggregate acceptance where applicable.
- Automatic dependency continuation versus authorized eligibility review: existing admission, pause, reservation and bounded recovery rules control any continuation.
- A fixed new latency promise versus detecting overdue scans under the existing freshness policy: the request selects a daily expectation with actual completed-scan evidence and explicitly rejects cron as a latency guarantee; no new exact dispatch SLA is invented.
- A new report surface versus an existing index: either is permitted, provided one stable repository summary preserves notes, current blockers and last complete coverage. Selecting storage is technical design, not an unresolved product outcome.

Source decisions retained verbatim from the owner-authored issue:

> Each adopter owns its own scheduled execution.
>
> A central fleet inventory, an agreed list of repositories and selection of a named pilot are not prerequisites for this capability.
>
> This request authorizes refinement only.

There are no separate owner answers, parked product questions or parked in-scope semantic gaps. Recommendation: consider this one coherent draft product change; do not approve or apply it as part of preparation. Readiness: no material product decisions remain unresolved for authoring the candidate; explicit human product approval remains a separate later effect.

The issue's reported error, `Not an open repository-owned implementation PR`, is not enough to classify the incident. An authorized delivery investigation must compare the original admitted request with current PR and lifecycle evidence before calling it an expected terminal transition, invalid authority or unavailable evidence. Preparation neither repairs it nor claims a live scan, adoption, published package or successful runtime operation.

Audience review used the packaged manual Plain English and Humanizer fallbacks followed by comparison with the issue and accepted model. No helper execution, provider validation or human approval is implied.

## Open Questions for the Product Owner

None. The ambiguity pass found no missing choice that would change product behaviour, scope, policy or acceptance.
