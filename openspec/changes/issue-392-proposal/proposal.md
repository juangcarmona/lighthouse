# Proposal

<!-- pdac-scope: cited -->

## Why

[Issue #392](https://github.com/juangcarmona/lighthouse/issues/392) reports that the accepted legacy `init --name "Published delivery consumer" --dry-run --format json` command succeeds but emits prose. Restore machine-readable access to its existing plan without changing initialization choices, ownership or text-mode application.

## What Changes

- Emit one JSON projection of the legacy plan's operations, conflicts, selected manifest, repository/public-site context and existing authority adoption gaps for either JSON flag spelling.
- Keep JSON preview-only: reject implicit JSON apply and explicit JSON `--apply`, including combined apply/dry-run flags, before writes; direct callers to JSON preview or text apply.
- Preserve text output, implicit text apply, conflict exit status, manifest validation, profile selection and semantic initialization.
- Add real CLI regressions in the existing test file and one CLI patch changeset. Do not initialize providers, perform remote writes or introduce dependencies.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This corrects an implementation omission in an accepted format contract, not a product requirement or semantic-plan contract. The inspected `openspec/specs/` inventory contains only `.gitkeep`. Return `.openspec.yaml` containing only `skip_specs: true`; the host retains provider-owned metadata in the final file. No requirement is invented to fill an empty inventory.

## Impact

Implementation is limited to `src/packages/cli/src/lighthouse.mjs`, `src/tests/lighthouse.test.mjs` and `.changeset/legacy-init-json-preview.md`. The changeset targets `@juangcarmona/lighthouse` with release type `patch` and an H1 after frontmatter. No direct version bump, lockfile edit, provider source edit, migration, policy change or new JSON apply support is authorized. These host-managed planning artifacts are separate from that three-file implementation scope.

### Product context

Discovery compared the issue with the 137-artifact product inventory, read the relevant canonical text and widened the dependency set through the host-prepared direct/transitive impact reports before drafting. The artifacts used by this plan are preservation dependencies, not canonical files to change:

- `FR-INITIALIZE-FOUNDATION`: retain reviewable operations, conflict preservation and actionable public-site authority gaps.
<!-- pdac:cite id="FR-INITIALIZE-FOUNDATION" digest="sha256:95dfc4b2b0a94c5747615e734a2302004543bcc8f33e1e494937d471d2bfc1c4" -->
- `FR-SEMANTIC-INITIALIZATION`: preserve plan-driven initialization, name/profile compatibility and project/provider ownership; do not manufacture semantic intent, reference metadata or resolved questions for the legacy route.
<!-- pdac:cite id="FR-SEMANTIC-INITIALIZATION" digest="sha256:aae9be2e26f3303a45ed3ddf4fa09866e2e9222518e4ac2072ab1a16326a6e21" -->
- `FR-FAST-FORWARD-DELIVERY`: retain independent engineering review, current evidence and separately delegated integration; this proposal grants no continuation or merge authority.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

Checked neighbours not targeted are `UC-INITIALIZE-PROJECT`, `SB-INITIALIZE`, `SB-SEMANTIC-INITIALIZATION`, `BR-OWNED-AUTHORITY`, `BR-HUMAN-AUTHORITY`, `BR-FAIL-CLOSED`, `BR-ENTRY-AUTHORITY` and `BR-STAGE-GATES`: their selection, ownership, evidence and decision rules do not change. `FR-AUTHORITY-INITIALIZATION`, `FR-AUTHORITY-ADOPTION`, `FR-CODEGRAPH-INIT-CHECK` and `FR-PUBLIC-SITE-PROJECTION` are excluded from implementation: reporting current local context does not initialize authorities, add a graph check or change site publication. The impact reports' other actors, terms and delivery neighbours introduce no additional implementation surface.

Product definition drift: none identified for this bounded correction; no altered product intent or Product Change is proposed. The supplied product baseline is `e5558efeb5188e821e7e7f5b96315b0d6cd0ab5f819a0ef63e3968c60475e5a0`; its draft artifacts and read-only reports do not establish approval or implementation of their broader target behaviour. Current architecture context is `docs/architecture/02-constraints/README.md`, `docs/architecture/05-building-block-view/README.md` and `docs/architecture/06-runtime-view/README.md`; no architecture decision or authority changes.

## Verification and next decision

[Design](design.md) defines the projection, guards and compatibility matrix; [tasks](tasks.md) maps every refined acceptance criterion and preserves the admitted checks. Commands are planned, not execution receipts. The host validates/materializes this candidate before distinct independent plan review; candidate checks, current-head forge CI, separately bounded integration and accepted post-merge review remain later work. The owner answer assigns the hotfix proof to #395, not this FF correction; historical pilot sequencing and current grant validity remain host checks.
