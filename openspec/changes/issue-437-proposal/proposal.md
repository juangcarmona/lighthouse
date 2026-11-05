# Proposal

<!-- pdac-scope: cited -->

## Why

[Issue #437](https://github.com/juangcarmona/lighthouse/issues/437) identifies skipped and neutral GitHub check runs being projected as passed and therefore accepted as successful verification citations. Correct the observed-evidence projection without changing which checks GitHub requires or accepts for merge.

## What Changes

- In `observeChecks`, reserve passed check-run evidence for a matching-revision, completed `success`; project completed `skipped` and `neutral` as unavailable while preserving the exact native conclusion in `state`.
- Exercise `observeChecks` followed by `assertCitedChecks` using independent native-ID and URL-only citation selectors; retain successful, pending, failed, wrong-revision, missing and refreshed-evidence behavior.
- Add controls preserving `checkCommit` hosting semantics and optional-job non-gating behavior, plus the named SDLC patch changeset.
- Leave required-check policy, signatures, callers, workflows, permissions, retry behavior and CI triggers unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This repairs implementation of existing truthful-evidence requirements, not their meaning or a spec-level contract. The inspected `openspec/specs/` inventory contains only `.gitkeep`; no capability is introduced or replaced. Return `.openspec.yaml` containing only `skip_specs: true`; the host combines it with provider-owned metadata.

## Impact

Implementation is bounded to `src/packages/sdlc/src/completion.mjs`, `src/tests/completion.test.mjs` and `.changeset/skipped-check-evidence.md`, plus this host-owned plan. Consumers see corrected observation statuses through existing APIs; no schema, dependency, persisted-data migration, package-version edit or remote setting changes are needed. The production edit stays within the observation projection; `assertCitedChecks`, `checkCommit` and `requiredPolicy` remain unchanged.

### Product context

Before drafting, discovery compared the issue with the host-prepared whole-model index of 137 artifacts and widened the evidence roots through their direct/transitive impact reports. Relevant canonical texts and provider-emitted citation payloads supply these dependencies to preserve, not artifacts to edit:

- `BR-FAIL-CLOSED`: unavailable verification is explicit, never presented as compliance.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
- `FR-CHANGE-EVIDENCE`: reports distinguish inspected evidence and unresolved findings from successful implementation.
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
- `BR-HUMAN-AUTHORITY`: product, architecture acceptance, merge and release retain their human or explicitly delegated owners.
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
- `UC-IMPLEMENT-CHANGE`: implementation consumes the reviewed plan and produces actual Done evidence; integration remains separate.
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->
- `FR-FAST-FORWARD-DELIVERY`: keep separate independent plan/candidate review, current evidence and separately authorized integration; planning grants no delivery authority.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

Checked impact neighbours not targeted include `FR-FOUNDATION-UPGRADE`, `FR-MODEL-PROFILES`, `FR-REPOSITORY-CONVENTIONS`, `FR-SEMANTIC-INITIALIZATION`, `FR-VERIFY-FOUNDATION`, `SB-VERIFY`, `UC-VERIFY-FOUNDATION`, `UC-UPDATE-FOUNDATION`, `BR-ENTRY-AUTHORITY`, `BR-STAGE-GATES`, `BR-PRODUCT-CHANGE-HANDOFF`, `BR-MEMORY-BOUNDARY` and `UC-BUILD-PUBLIC-STORY`: no upgrade, initialization, catalogue, lifecycle, memory or site behavior changes. `TERM-GUARDRAIL`, `TERM-INTEGRATION`, `TERM-MANAGED-PROJECTION` and `BC-FOUNDATION` retain their existing meanings. Graph adjacency alone does not expand this correction.

Product definition drift: none identified; no altered product intent or Product Change is proposed. Relevant supplied artifacts are draft, and read-only discovery is not product approval. Architecture evidence-state and execution-authority boundaries in `docs/architecture/08-crosscutting-concepts/README.md` remain unchanged.

## Verification and next decision

[Design](design.md) defines precedence and behavioral controls; [tasks](tasks.md) retains all admitted commands and the Definition of Done. These are planned checks, not receipts. The trusted host validates and materializes this plan before separate independent plan review. This proposal neither dispatches the pilot nor certifies #394/#392 completion, changes supervised comparison #391, or authorizes implementation, merge, release or deployment.
