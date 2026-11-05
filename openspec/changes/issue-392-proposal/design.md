# Design

<!-- pdac-scope: cited -->

## Context

See [proposal.md](proposal.md) for motivation and authority discovery. The executable `lighthouse` binary maps to `src/packages/cli/src/lighthouse.mjs`; its dispatcher accepts both JSON flag spellings. `initialize` delegates `--plan-file` first, then validates the legacy manifest and obtains `planInitialization` operations/conflicts, but always prints text. Its dry-run return precedes manifest, directory, managed-file, ownership-state and Git-hook configuration writes. The semantic route already rejects JSON apply.

## Goals / Non-Goals

**Goals:** expose the same local plan to parsers, preserve existing text callers and make every JSON invocation incapable of applying initialization.

**Non-Goals:** change planning, validation, ownership, provider invocation, profile semantics or semantic initialization; infer product intent; enable JSON apply; add a shared reporting framework or schema file. No UI change or new visual acceptance evidence is needed.

## Decisions

### 1. Project the legacy plan, not a fabricated semantic plan

Within the existing CLI module, branch the legacy renderer on `formatFromArgs`. Emit a single `JSON.stringify` result with `schemaVersion: 1`, `status` (`blocked` iff conflicts exist), the selected `manifest` unchanged, normalized `repository` context, `operations` projected to `{ path, action }`, `conflicts` unchanged and `adoptionGaps`. Represent each current gap with its authority and actionable next step, using the same public-site-enabled/null-integration conditions and repair commands as the existing text messages. Do not include generated file contents or semantic-only intent/reference/question fields. Informational authority gaps do not make an otherwise conflict-free plan blocked.

This retains the current initialization and adoption contract.
<!-- pdac:cite id="FR-INITIALIZE-FOUNDATION" digest="sha256:95dfc4b2b0a94c5747615e734a2302004543bcc8f33e1e494937d471d2bfc1c4" -->

Keep text headings, operation lines, gap messages and stderr conflict diagnostics unchanged; JSON writes no prose prefix, suffix or separate success message. Conflicting JSON previews still print the complete object and exit one; ready previews exit zero. Validation errors and invalid mode combinations remain nonzero diagnostics, not successful JSON plans.

Alternative: reuse the semantic report by constructing a plan. Rejected because legacy input contains no semantic intent, reference or resolved-question evidence. Sharing or changing the planner is unnecessary and risks changing planned actions.

### 2. Guard JSON before any mutation; leave text semantics alone

After the existing semantic-route delegation, read the legacy format and dry-run flags. For JSON, require `--dry-run` and reject any explicit `--apply`, even when paired with `--dry-run`; issue an actionable error explaining JSON preview and text apply. Keep the existing dry-run return and conflict handling ahead of every mutation. Do not change legacy text's implicit apply or reinterpret its existing flags.

Preserve the semantic route's default preview, explicit text apply, unresolved-question blocking and optional-reference behaviour without modifying its report contract.
<!-- pdac:cite id="FR-SEMANTIC-INITIALIZATION" digest="sha256:aae9be2e26f3303a45ed3ddf4fa09866e2e9222518e4ac2072ab1a16326a6e21" -->

Alternative: allow JSON apply or silently convert implicit apply to a preview. Rejected: both exceed the admitted correction or conceal the requested mode. A global flag-policy refactor would also unnecessarily affect text/semantic callers.

### 3. Verify at the real subprocess boundary

Extend the existing `run`-based tests in `src/tests/lighthouse.test.mjs`; parse entire stdout, not substrings or mocked serializers. Test fresh targets with the issue's product name and both JSON flag spellings, plus an existing valid manifest with meaningful application/profile/repository context. Compare projected path/action pairs with a paired text preview; check manifest creation when absent and its absence from operations when present, directories, managed paths and empty-root markers. Cover public-site enabled/disabled and missing/recorded authority context.

For ready, conflicting and rejected-apply cases, compare before/after fixture trees, file bytes/modes and isolated local Git configuration, including provider/user sentinels, `lighthouse.json`, managed paths, ownership state and `core.hooksPath`. Cover a file at `src` and a pre-existing managed file, retaining their bytes and JSON/text exit-one results. Source review must confirm no provider apply/remote call is added and that no preview reaches mutation; snapshots alone cannot prove absence of external effects.

Retain and run existing implicit text initialization, semantic JSON/default preview, semantic text apply, unresolved-question/reference, profile-conflict and committed/cloned-boundary tests. Add guard cases for JSON without dry-run, JSON apply and JSON apply plus dry-run. No existing assertion is weakened.

## Risks / Trade-offs

- Mixed output or omitted context → parse full stdout and assert fields and paired text operation parity.
- Accidental preview writes or changed exit status → tree/config snapshots for ready, conflict and guard cases plus pre-write call-path review.
- Shared-route regression → keep the change legacy-local and run adjacent semantic/text/profile/marker tests and full verification.
- Exposing incidental internal data → project operations to path/action only and use already selected local manifest/context, not generated contents or invented semantic evidence.

## Migration Plan

Deliver one CLI patch changeset through the normal reviewed release path; no data conversion, package-version edit or provider migration is needed. Roll back the isolated correction and changeset through an authorized reviewed revert; this restores prior presentation and requires no adopter-data conversion.

The host first validates/materializes the proposal and obtains distinct read-only independent plan review. Later candidate command receipts, independent host verification and fresh candidate review remain separate from actual eligible current-head forge CI. Integration requires fresh host authority checks and its separate bounded delegation; there is no manual merge fallback. Accepted post-merge verification/review is required before delivery closure; merge is not release or deployment.
<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->
