# Proposal

<!-- pdac-scope: cited -->

## Why

[Issue #394](https://github.com/juangcarmona/lighthouse/issues/394) reports that preparation stopped on an immutable Actions artifact download returning HTTP 503 before the worker started. A bounded retry of that read can tolerate a transient service failure without replaying delivery effects.

## What Changes

- Retry only positively identified HTTP 502/503/504 failures of the selected artifact ZIP GET, with at most three attempts, each retaining the 30000 ms timeout and 2 MiB maxBuffer; add no delay or backoff.
- Keep the same selected artifact ID, repository, member, credential path, inventory rules, ZIP validation and downstream identity checks; propagate the original terminal command error.
- Add focused production-reader tests for transient success, exhaustion and all no-retry boundaries, and one patch changeset for `@juangcarmona/lighthouse-sdlc`.
- Do not retry inventory reads, mutations, dispatch, workers, publication or uncertain effects; add no scheduler, fallback credential, dependency or policy change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a local reliability correction under existing delivery and evidence contracts, not a new capability or changed product requirement. The current `openspec/specs/` inventory contains only `.gitkeep`; no existing capability is being renamed or replaced. Return `.openspec.yaml` containing only `skip_specs: true`; the host merges it into provider-owned metadata.

## Impact

Implementation changes only `src/packages/sdlc/src/actions-artifact.mjs`, `src/tests/actions-artifact.test.mjs` and `.changeset/bounded-artifact-read-retry.md`. The shared reader's signature and JSON/null/error contracts stay unchanged; consumers retain authentication and recovery decisions. No data migration, package-version edit or lockfile change is required. These host-managed planning artifacts are additional to that three-file implementation scope.

### Product context

Discovery compared the whole `docs/product/model/` definition with this issue before drafting and widened the affected set using the host-prepared impact reports. The following artifacts are dependencies to preserve, not canonical artifacts to edit.

- `FR-FAST-FORWARD-DELIVERY`: keep bounded execution, independent engineering review and separately authorized integration; this proposal grants none of those later effects.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->
- `FR-WORKFLOW-HANDOFFS`: keep unknown execution and uncertain publication explicit; this correction does not authorize recovery replay.
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->
- `BR-FAIL-CLOSED`: terminal failures and invalid evidence must remain visible, never fabricated success.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
- `QR-BOUNDED-AUTOMATION`: retain explicit scope, limits, evidence and stop conditions. The concrete three-attempt/30000 ms limits come from this issue's admitted refinement, not a new product parameter.
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->

Direct and transitive neighbours checked but not targeted include `BR-ENTRY-AUTHORITY`, `BR-HUMAN-AUTHORITY`, `BR-STAGE-GATES`, `BR-AUTHORITY-BOUNDARIES`, `UC-RUN-SDLC`, `UC-CONTINUE-AGENT-RUN` and `UC-IMPLEMENT-CHANGE`: their entry, gate and decision contracts remain untouched. `BR-PRODUCT-CHANGE-HANDOFF`/`FR-PRODUCT-CHANGE-WORKFLOW`, `BR-MEMORY-BOUNDARY`/`FR-AGENT-MEMORY`, `FR-DECOMPOSE-WORK-ITEM` and `FR-PUBLIC-SITE-PROJECTION` were excluded because this change neither prepares product intent, retains memory, decomposes work nor changes site behaviour.

Product definition drift: none identified for this correction; no Product Change is needed. The supplied baseline digest is `e5558efeb5188e821e7e7f5b96315b0d6cd0ab5f819a0ef63e3968c60475e5a0`; its artifacts remain draft, and these read-only reports are not product approval. Architecture context is `docs/architecture/05-building-block-view/README.md`, `docs/architecture/06-runtime-view/README.md` and `docs/architecture/08-crosscutting-concepts/README.md` at supplied source revision `104d6939219f18cacb1a9a33d5f48dd10050c645`. No architecture source or acceptance decision changes.

## Verification and next decision

[Design](design.md) defines the retry boundary and test matrix; [tasks](tasks.md) preserves every admitted implementation check and the Definition of Done. Those commands are planned, not execution receipts. The trusted host validates and materializes this proposal before separate independent plan review; implementation, current-head forge CI and any integration decision remain later work.
