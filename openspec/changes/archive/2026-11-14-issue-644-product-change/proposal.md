<!-- pdac-scope: cited -->

# Require PDaC v1alpha2 and behaviour-derived verification

## Why

Issue #644 asks that every Lighthouse adopter use PDaC v1alpha2 and that applicable domain lifecycles and structured behaviours guide planning and verification. The accepted model requires authority context and honest verification but neither selects this serialization contract nor makes model coverage, test existence, execution and acceptance separately observable.

## Requested Product Intent

Every adopter, including Lighthouse itself, has an explicitly selected, provider-validated PDaC v1alpha2 product authority and separately recorded compatible provider version. Older, missing, conflicting or unsupported authority configuration is an actionable adoption gap, never compliant adoption. Existing adopters have a reviewed, meaning-preserving migration route covering models, active Product Changes, consumers and citations.

Delivery consumes relevant domain lifecycle states, transitions, invariants, rules and structured behaviours at refinement, proposal, implementation and review. Verification scenarios cover valid and forbidden transitions, terminal-state behaviour and invariants where applicable, using behaviour context, stimulus and observable outcomes. Tests are chosen at the level required by the behaviour, including end-to-end checks when needed. Evidence identifies what is modelled, implemented as a test, actually executed and accepted; stale citations require revalidation without erasing historical results.

## Impacted Product Areas

- BR-AUTHORITY-BOUNDARIES: retains ownership but prevents a change-level context exception from waiving universal adopter compliance.
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
- UC-INITIALIZE-AUTHORITIES: removes the interpretation that missing ProductShape can finish compliant adoption.
<!-- pdac:cite id="UC-INITIALIZE-AUTHORITIES" digest="sha256:7243c8af149a2199dd2e9e9f9984a6b7a72de8d98b24917af07fa40861058a51" -->
- JRN-ADOPT-AND-DELIVER: incremental adoption remains possible, but its missing-product-authority branch remains incomplete.
<!-- pdac:cite id="JRN-ADOPT-AND-DELIVER" digest="sha256:1622011910e5f7e48d5e3f314c483c187a68260fc0ac8a7f85e656abbc77c6f0" -->
- FR-AUTHORITY-INITIALIZATION: explicitly selects v1alpha2 through the provider and distinguishes provider compatibility.
<!-- pdac:cite id="FR-AUTHORITY-INITIALIZATION" digest="sha256:7c5a19c8c532b9725eeef1c037e7b604a799ed51f7ee5f2ef470f3770815ff4d" -->
- FR-AUTHORITY-ADOPTION: rejects legacy or missing product configuration as compliant adoption without reinitializing existing authorities.
<!-- pdac:cite id="FR-AUTHORITY-ADOPTION" digest="sha256:8aa2be1a48a43b960df92b56dd56054b7736233a133b84e0c8bb4f145f01636e" -->
- FR-FOUNDATION-UPGRADE: checked and left unchanged; its update, ownership and recovery contract remains applicable. Product-specific migration and cross-entry validation are defined in FR-AUTHORITY-ADOPTION.
<!-- pdac:cite id="FR-FOUNDATION-UPGRADE" digest="sha256:a0bb73ab253c0bc2bac7aa20292b1fce8cabaf8fcfa09beaad49218eae912972" -->
- FR-VERIFY-FOUNDATION: makes universal product-contract compliance visible in human-readable and JSON verification.
<!-- pdac:cite id="FR-VERIFY-FOUNDATION" digest="sha256:26ba68fdc3287d5dfa6d9ae00378eea5d1b79eb9a4134bdf3328c021ed3d680a" -->
- FR-AUTHORITY-CONTEXT: carries relevant lifecycle and behaviour context through the requested delivery activities.
<!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:39d5fabc1afdaec4f779b28efcd21b86ec5c86635b13c1d6283c359ae67823a3" -->
- FR-CHANGE-EVIDENCE: derives scenarios, traces executable results, and verifies external evidence without confusing coverage with execution.
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
- FR-CONSUMER-ADOPTION: checked and left unchanged; its published-consumer contract remains applicable. The new proof obligations belong to FR-AUTHORITY-INITIALIZATION, FR-AUTHORITY-ADOPTION and FR-CHANGE-EVIDENCE.
<!-- pdac:cite id="FR-CONSUMER-ADOPTION" digest="sha256:d87ea30206bee08bca32ece7b1cfe86c74f9fcdddb8b1ed07e94c08c6ae48943" -->

Two new examples clarify observable results without duplicating an existing obligation: SB-LEGACY-PRODUCT-ADOPTION shows rejection of v1alpha1 despite successful provider validation; SB-STALE-BEHAVIOUR-EVIDENCE shows preservation of historical execution when its model citation becomes stale.

## Neighbours Checked and Left Out

BR-OWNED-AUTHORITY, BR-FAIL-CLOSED, BR-HUMAN-AUTHORITY and BR-PRODUCT-CHANGE-HANDOFF already preserve ownership, honest failure reporting and separate product decisions. CON-PROJECT-OWNERSHIP remains unchanged: adopters still own their product and operational decisions. BC-FOUNDATION's responsibility stays delivery integration, not product modelling; its description of the external provider relationship does not waive adopter compliance.

UC-RUN-SDLC, UC-IMPLEMENT-CHANGE and FR-PRODUCT-CHANGE-WORKFLOW already provide the product-gap stop and approval/apply handoff. FR-SDLC-LIFECYCLE keeps existing stages and package ownership; domain lifecycles do not add delivery stages. FR-INITIALIZE-FOUNDATION and JRN's unchanged steps still call the same authority use case. UC-UPDATE-FOUNDATION may defer an update, but deferral does not satisfy the strengthened compliance requirement. UC-VERIFY-FOUNDATION and UC-ADOPT-CONSUMER retain their existing interactions while their derived obligations become more specific.

FR-HARNESS-CONTRACT and FR-CHANGE-OVERVIEW already expose ownership and reviewable context. FR-RUNNER-TELEMETRY records execution metadata, not product verification acceptance, and needs no new telemetry obligation here. QR-AUTHORITY-TRACEABILITY already requires revision and citation traceability. TERM-AUTHORITY-MAP, TERM-INTEGRATION and TERM-MANAGED-PROJECTION retain their meanings. SB-INITIALIZE and SB-VERIFY remain valid general examples; the two new examples distinguish the new negative cases. No actor role, profile, visual contract, CodeGraph service, factory operation or deployment responsibility changes. Large-model handling remains separate under #633.

## Clarification Report

The host's pinned ProductShape core 0.25.0 reports supply inspect, impact and citation evidence for this baseline. The inventory was screened across artifact categories; relevant accepted texts and graph neighbours were inspected. Graph reachability proposes review candidates, not scope authority.

| Priority | Changed or proposed node | Neighbour and relationship | Impact polarity | Classification and mechanical reason |
| --- | --- | --- | --- | --- |
| 1 | BR-AUTHORITY-BOUNDARIES | FR-AUTHORITY-ADOPTION, FR-AUTHORITY-INITIALIZATION, FR-AUTHORITY-CONTEXT, FR-VERIFY-FOUNDATION derive from rule | dependency | Affected: each must express the universal product contract without changing provider ownership. |
| 1 | UC-INITIALIZE-AUTHORITIES | BR-AUTHORITY-BOUNDARIES via governed-by; FR-AUTHORITY-ADOPTION and FR-AUTHORITY-INITIALIZATION via incoming derived-from | dependency | Affected: existing omission branch would otherwise permit materially different compliant-adoption outcomes. |
| 1 | JRN-ADOPT-AND-DELIVER | UC-INITIALIZE-AUTHORITIES via steps[].use-case | dependency | Affected: incremental journey must not label absent product authority complete. |
| 1 | FR-AUTHORITY-INITIALIZATION | UC-INITIALIZE-AUTHORITIES via derived-from | upstream basis | Affected: explicit version selection changes the initialized product contract. |
| 1 | FR-AUTHORITY-ADOPTION | UC-INITIALIZE-AUTHORITIES via derived-from; BR-OWNED-AUTHORITY via derived-from | upstream basis | Use case affected; ownership rule checked and unaffected: validation and migration remain provider-owned. |
| 1 | FR-AUTHORITY-ADOPTION | FR-FOUNDATION-UPGRADE through shared adoption and update operations | neighbouring obligation | Checked and unaffected: retain its existing general update contract and the concurrent capability proposal; the product-specific migration and version checks are added to the authority-adoption obligation. |
| 1 | FR-VERIFY-FOUNDATION | UC-VERIFY-FOUNDATION and BR-FAIL-CLOSED via derived-from | upstream basis | Checked and unaffected: existing statuses already represent actionable noncompliance. |
| 2 | FR-AUTHORITY-CONTEXT | UC-RUN-SDLC via derived-from | upstream basis | Checked and unaffected: same stages and handoff consume richer product context, with no new delivery authority. |
| 2 | FR-CHANGE-EVIDENCE | UC-IMPLEMENT-CHANGE and BR-HUMAN-AUTHORITY via derived-from | upstream basis | Checked and unaffected: execution evidence refines verification, not acceptance authority. |
| 2 | FR-AUTHORITY-INITIALIZATION, FR-AUTHORITY-ADOPTION, FR-CHANGE-EVIDENCE | FR-CONSUMER-ADOPTION through published-consumer evidence | verification dependency | Checked and unaffected: retain its general release-consumer boundary and the concurrent capability proposal; the changed authority and evidence requirements define their own published-consumer demonstrations. |
| 2 | SB-LEGACY-PRODUCT-ADOPTION | UC-INITIALIZE-AUTHORITIES and BR-AUTHORITY-BOUNDARIES via proposed illustrates | illustration | Affected example: provider-valid v1alpha1 still fails Lighthouse's contract. No baseline graph node exists for this new example. |
| 2 | SB-STALE-BEHAVIOUR-EVIDENCE | UC-IMPLEMENT-CHANGE and BR-FAIL-CLOSED via proposed illustrates | illustration | Affected example: historical passing execution must not be silently reclassified or treated as current acceptance. No baseline graph node exists for this new example. |
| 3 | BR-AUTHORITY-BOUNDARIES | FR-HARNESS-CONTRACT, FR-CHANGE-OVERVIEW, FR-PRODUCT-CHANGE-WORKFLOW and FR-RUNNER-TELEMETRY via incoming derived-from | dependency | Checked and unaffected: discoverability, prose review, product workflow and telemetry do not gain new meanings. |
| 3 | JRN-ADOPT-AND-DELIVER | CON-PROJECT-OWNERSHIP and QR-ADOPTABILITY via incoming applies-to | governance | Ownership checked and unaffected; reviewed migration and repair reporting preserve adoptability rather than adding a second product authority. |

The pass was reconsidered before the first delta, including the journey and both new behaviour nodes. No uncertain candidate requires a product decision. Domain lifecycle nodes are not fabricated for Lighthouse delivery stages; this change requires consumers to use applicable provider-owned lifecycles, not to invent adopter domain models. Existing requirement IDs are modified rather than replaced with near duplicates.

## Refinement pass

Current queue: local provider overlay validation, publication and explicit owner review of this exact draft. Recommendations: keep all eight modified stable artifacts together with the two focused examples; verify migration and test evidence during separately authorized delivery. Checked and excluded candidates are recorded above. Parked items and parked questions: none. Owner answers supplied separately: none.

The issue supplies this outcome verbatim: “Every Lighthouse adopter uses PDaC `v1alpha2` as its product-definition contract.” It also states: “A coverage association alone does not prove execution.” The owner update states: “Prepare the Product Change for review and retain explicit approval of the concrete proposal before provider apply; source merge, release and adopter deployment keep their own evidence.” These define requested intent, not approval of this candidate.

Ambiguity pass: opt-in v1alpha2 versus universal compliance is selected by “Every”; all-E2E versus behaviour-appropriate test layers is selected by the acceptance criteria; lifecycle creation everywhere versus justified non-applicability is explicitly selected; migration by version-field edit versus reviewed semantic migration is explicitly rejected. Per-change authority-context exceptions remain distinct from universal adopter compliance. Exact compatible provider releases and migration mechanics require provider compatibility evidence, not a new product policy invented here.

Readiness: no material product decisions remain unresolved for authoring this draft. This is a candidate, not an approved or applied change. Record the provider validation outcome against the unchanged baseline before requesting approval. Repeat the integrity pass against the current baseline before provider apply.

## Open Questions for the Product Owner

None. Explicit approval or requested changes to the validated concrete proposal is still required before provider apply.

## Recovery and concurrent proposals

The native preparation run 43580007914 produced the initial candidate, but publication rejected two verification entries that combined mutually exclusive `scenario` and `scenario-ref` forms, and two mutations overlapping CHG-CAPABILITY-RECONCILIATION-001. The recovered draft uses provider-supported reference-only verification entries. It preserves that existing proposed change, its files, status and product decisions.

FR-FOUNDATION-UPGRADE and FR-CONSUMER-ADOPTION remain unchanged. Their general update and consumer obligations already apply. The product-specific migration and reconciliation/upgrade checks are expressed in the existing FR-AUTHORITY-ADOPTION; fresh consumer proof belongs to FR-AUTHORITY-INITIALIZATION, and lifecycle/evidence consumer proof belongs to FR-CHANGE-EVIDENCE. This retains every requested outcome without applying, rejecting, superseding or parking the concurrent capability proposal, and without creating replacement IDs. That proposal must independently account for the accepted product contract if it is later approved.

The integrity pass above was repeated for this correction. No accepted model, provider configuration or unrelated active change is modified. Source and migration work remain pending behind explicit approval of this concrete draft.

## Proposal validation

The recovered draft passes strict OpenSpec validation with 1.15.0 and provider overlay validation through `@prodshape/integration-openspec@0.6.6` with `@prodshape/core@0.25.0`, with no blocking diagnostics. The accepted baseline still validates through `@prodshape/cli@0.26.0`. All ten citations in this proposal are current, with no stale, unresolved or tampered citations. Repository Markdown checks pass. These checks validate a proposed delta; they do not approve or apply it, migrate Lighthouse or prove implementation.

## Owner approval

The owner approved PR #651 at revision `4d37df8a31e4408204e4442fa7c5c28b1b942939` in the orchestration conversation on 2026-11-14. Asked whether to apply this concrete proposal and continue implementation, the owner answered verbatim: “Si”. This authorizes provider apply of the reviewed delta and continued implementation; no approval event from GitHub or automatic release authority is claimed.
