<!-- pdac-scope: cited -->

# Bounded context, observable skills and current visual evidence

## Why

Issue #773 requests four independently verifiable improvements to Lighthouse's existing agent and visual contracts. Existing authority context, compact command output, process-guard review and evidence records are useful foundations, but do not yet express the requested instruction-budget, skill-measurement, consumer-source checking and capture-freshness obligations.

## Requested Product Intent

Maintainers can measure and bound the instructions selected by explicitly supported workflow branches without losing authoritative decisions or access to retained evidence. They can distinguish selecting a skill, following its required protocol and delivering its result, while keeping deterministic simulation separate from installed-provider measurement. Adopters can independently opt into bounded semantic-token usage checking without making that choice a prerequisite for the visual profile. Required visual evidence describes the actual running candidate, its required views and states, viewport and relevant appearance; stale or missing evidence cannot count as complete.

## Impacted Product Areas

- BR-BOUNDED-WORKFLOW supplies the existing bounded input/output and stop contract. Add a separate instruction-budget requirement rather than changing every stage's policy.
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:c07c375e4fa1788978ca5d900bc8f0ea9bc009bc71a1fff5d7602ebed6b00894" -->
- FR-AGENT-OUTPUT already preserves full diagnostics, exit status and on-demand guidance. Leave it unchanged; instruction-input budgets are not the optional command-output adapter or proof of token savings.
<!-- pdac:cite id="FR-AGENT-OUTPUT" digest="sha256:f512f3195e379fea2cd27c993b52b08e19cd472c0d4ba2628c6dc40f4b9ea65f" -->
- FR-AUTHORITY-CONTEXT already retains product and architecture meaning and revisions. Leave it unchanged and require budget and behavior work to preserve that authority.
<!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:5ad51bbe6a7b8ed785cac7bc5ed1ab8d105c1541d873d3afcc65f82712cadab1" -->
- FR-PROCESS-GUARDS governs evidence-backed review findings, not a general skill evaluator. Leave it unchanged; add FR-SKILL-CONTRACTS for the distinct observable evaluation capability.
<!-- pdac:cite id="FR-PROCESS-GUARDS" digest="sha256:831d8222405352869835c741bb54dc71c2198bdc7a78a22266783458af142c2a" -->
- FR-PROFILE-CONTRACT requires inspectable guardrails and supported hard verification. Modify its existing ID to specify opt-in consumer token checking and rendered qualification, retaining all existing profile obligations.
<!-- pdac:cite id="FR-PROFILE-CONTRACT" digest="sha256:5b0b64306c7de491b5938a321eb36104a8f295459676662335a342ae5ffb71e4" -->
- FR-EVIDENCE-CONTRACT already supports producer-owned provenance, payloads and artifacts. Leave it unchanged; no new evidence store or ownership transfer is needed.
<!-- pdac:cite id="FR-EVIDENCE-CONTRACT" digest="sha256:33e7bbb6e62e888064915ca8f0c2665199cfb2d40138b38ceb90b4e24587a2ef" -->
- FR-EVIDENCE-COVERAGE supplies declared-subject coverage and honest unknown measurements. Modify its existing ID for current visual acceptance, preserving the general nonblocking default for coverage that is not explicitly required by the selected stage.
<!-- pdac:cite id="FR-EVIDENCE-COVERAGE" digest="sha256:15e4d317d3d5ce93d42de5b35c783e2d694343fccfc80a6dfd51b7be6349f327" -->

<!-- pdac-drift ids="FR-PROFILE-CONTRACT,FR-EVIDENCE-COVERAGE" summary="Specify separately opt-in consumer token checks and current required visual evidence; add bounded instruction and skill measurement obligations." -->

## Neighbours Checked and Left Out

UC-ADOPT-PROFILE and UC-VERIFY-FOUNDATION already expose selection, ownership, exceptions and distinct verification outcomes. UC-RUN-AGENT already binds scope, tools, results and parent state. UC-RUN-SDLC, UC-IMPLEMENT-CHANGE and UC-PREPARE-PRODUCT-CHANGE already separate authorized stages, product preparation, apply and continuation. FR-CHANGE-FLOW, FR-PRODUCT-CHANGE-WORKFLOW and FR-PROFILE-DELEGATION already preserve bounded stages, exact product decisions and dependencies. None needs a lifecycle change.

BC-FOUNDATION includes visual conventions, agent contracts and delivery evidence, so no new context is needed. BR-AUTHORITY-BOUNDARIES and CON-EXISTING-AUTHORITIES preserve independent providers and reuse. SB-CHANGE-FLOW-VERIFIED and SB-STALE-BEHAVIOUR-EVIDENCE already distinguish historical execution from current acceptance. FR-APPLICATION-PROFILES-001 already defines application-specific browser/native boundaries; this change does not claim arbitrary framework support. FR-PRACTICE-EVIDENCE already preserves exact-revision observations and separate certification; no levels or quality scores change. FR-DECOMPOSE-WORK-ITEM and QR-BOUNDED-AUTOMATION already support bounded slices and limits.

TERM-AGENT-RUN, TERM-GUARDRAIL, TERM-PROFILE, TERM-AUTHORITY-MAP, TERM-CHANGE-FLOW, TERM-INTEGRATION, TERM-WORKFLOW-STAGE, TERM-EVIDENCE-RECORD and TERM-EVIDENCE-COVERAGE retain their meanings. Actors, journeys, general constraints and unrelated stack requirements need no new roles, steps or policies. The whole provider inventory was used for discovery; detailed reading focused on relevant accepted artifacts, not a claim that every model body was reviewed.

## Clarification Report

The provider index identifies all seven requested Lighthouse artifacts and available detail for their direct neighbours. COMP-GATE-INTEGRITY is unresolved as a Lighthouse artifact: it is an upstream research-document name in the issue, not missing Lighthouse intent. No selected report is unavailable.

| Proposed or changed node | Neighbour and relationship | Polarity | Classification and mechanical reason |
| --- | --- | --- | --- |
| FR-INSTRUCTION-BUDGETS (new) | BR-BOUNDED-WORKFLOW via proposed derived-from; UC-RUN-AGENT via proposed derived-from | Governance/dependency | Affected capability; existing stage and run contracts supply the boundary, but contain no reproducible branch byte caps. Both neighbours remain unchanged. |
| FR-SKILL-CONTRACTS (new) | UC-RUN-AGENT via proposed derived-from; BR-BOUNDED-WORKFLOW via proposed derived-from | Dependency/governance | Affected capability; the run requires results, but does not measure skill selection, behavior and delivered completion separately. No new run state. |
| FR-PROFILE-CONTRACT | UC-ADOPT-PROFILE via derived-from; TERM-PROFILE and TERM-GUARDRAIL via uses-terms | Dependency/terminology | Checked and unaffected neighbours; selectable checks and owned surfaces already exist. Add the explicit opt-in boundary to the requirement rather than redefining profile adoption. |
| FR-EVIDENCE-COVERAGE | UC-RUN-SDLC, UC-VERIFY-FOUNDATION and UC-IMPLEMENT-CHANGE via derived-from | Dependency | Checked and unaffected neighbours; their required-evidence stops already apply. Extend visual subject completeness without turning all incomplete coverage into a new universal gate. |
| FR-EVIDENCE-COVERAGE | TERM-EVIDENCE-RECORD, TERM-EVIDENCE-COVERAGE and TERM-AUTHORITY-MAP via uses-terms | Terminology | Checked and unaffected; capture freshness is a scoped applicability rule, not a new evidence authority. |
| New measurement requirements | FR-AGENT-OUTPUT, FR-AUTHORITY-CONTEXT and FR-PROCESS-GUARDS (request-related comparison, not claimed graph edges) | Preservation | Checked and unaffected; preserve original diagnostics, upstream decisions and the existing verified-guard review process. |

The pass was repeated against the same nodes before drafting the delta: no widening or unresolved neighbour is needed. Approval-time review must repeat the pass against the then-current baseline. Graph assistance grants no authority to modify a neighbour.

## Refinement pass

Source: host-admitted revision 4b1fb0530b501d7ade25feef19d7cf34777c9a3f, equal to the issue's reviewed revision. No relevant source advance is asserted. Baseline digest: 79f88142e9e54650197aa7157b2facd9d2f6f66bf32d2f73401f437fc6e0e322. No retained draft was supplied; catalog inspection reported no supported retained inputs, so this is an ordinary literal candidate, not a composition or native composition qualification.

Current source findings:

- The ui-design branch in src/packages/cli/src/guardrails.mjs compares two managed guide/skill paths and six token names in the installed token source. It does not scan consumer declarations or resolve their semantic roles. Preserve that existing guard and add an independently selected consumer capability.
- src/packages/ui/DESIGN.md already owns semantic roles, palette overrides, native semantics, appearance, contrast, focus and reduced motion. Keep src/packages/ui/tokens.css canonical. No palette replacement or runtime UI library is proposed.
- src/packages/sdlc/skills/refine/SKILL.md and propose/SKILL.md load authority, audience and conditional visual guidance. Start budget coverage with these two entry skills, each with nonvisual and visual branches; enumerate their selected transitive references during implementation. Product-change/history transport, implementation, integration, review, backend and arbitrary project-context branches remain explicitly outside the initial budget set. Numeric caps require measured, reviewed branch inventories, not invented measurements in this proposal.
- src/tests/audience-guidance.test.mjs explicitly calls its checks structural review fixtures. Preserve them; they do not qualify actual agent behavior. src/packages/sdlc/src/process-guards.mjs already validates source-bound red/green guard records and ownership. Reuse its disposition rather than create another learning lifecycle.
- src/packages/sdlc/src/product-context.mjs already projects retained identities and bounded history while preserving original authority. Do not replace it with an unreviewed summary or claim unread history was inspected.
- src/packages/sdlc/src/visual-evidence.mjs already distinguishes proposal/before/candidate items, matches existing before/candidate view-state-viewport pairs and retains image digests and request identity. src/packages/sdlc/src/visual-publication.mjs verifies receipt metadata, bytes, request and final candidate tree, preserves immutable history and returns commit-pinned images through the adopted evidence branch. These are source-observed guarantees, not executed qualification in this run.
- That visual item contract has no theme identity or independently declared required-view/state matrix. Retention binds the supplied final tree after the agent has produced images; it labels captures agent-declared. This is not independent proof of capture-time source, browser execution or refusal after an intervening style edit. Extend these specific boundaries, keeping host-owned inert metadata from causing false staleness.
- src/gallery/tests/gallery.spec.mjs already checks axe results, selected contrast pairs, overflow, native dialog focus, literal input and appearance persistence. Its screenshots are captures, not baseline comparisons. The Playwright configuration runs desktop 1440 by 1000 and mobile 390 by 844. Add only missing rendered-state and capture-integrity coverage; no universal screenshot-diff policy is selected.

Owner answer, preserved verbatim:

> Owner decision in answer to the pending adoption question: opt-in.
>
> The new consumer-source semantic-token checker must remain separately opt-in. Leaving it unselected must not block compliance with the visual profile, including for existing adopters after a reviewed upgrade. Continue preparing the Product Change on that basis.
>
> Recorded by Codex on the owner's explicit instruction in this conversation. This answers the adoption question; it does not approve an unseen Product Change or a candidate merge.

Ambiguity review compared mandatory versus optional consumer checks, simulation versus provider qualification, absent evidence versus a pass, and artifact integrity versus visual approval. The issue and verified owner answer select the latter boundaries explicitly: optional adoption, separate qualification, honest absence and separate approval. Supported source grammar, reference inventory, numeric byte caps and exact capture fingerprint are bounded engineering choices to expose and test, not permission to change product behavior silently. If implementation requires a materially different boundary, stop for its owner.

Queue: trusted provider overlay validation, exact-candidate publication and explicit product decision. Recommendations: retain the four slices and serial native experiment. Parked items: broader workflow budgets, arbitrary source/framework support, screenshot baseline policy and provider-backed evaluation unless needed for a separately supported claim. No parked product-semantic question remains. Readiness: no material product decisions remain unresolved for this draft; provider validation and exact-delta human approval have not happened.

## Open Questions for the Product Owner

None. The opt-in question is resolved above; general acceptance of the idea does not approve this delta.
