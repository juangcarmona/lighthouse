<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-REPOSITORY-HOUSEKEEPING" digest="sha256:8f32f77ca9a3f4b1569fc232f3c47576eba34d5c2a8a7d4a6f20c55d4f237771" -->

# Design

## Context

See proposal.md for motivation. Existing maintenance already serializes issue recovery, preserves uncertain dispatches and publishes a managed report index. Publication recovery currently calls an open-only PR validator after authenticating retained publication evidence, which throws on terminal PRs.

## Goals / Non-Goals

**Goals:** extend existing packaged maintenance and ownership contracts; distinguish complete inspection from effects and from activated native operation.

**Non-Goals:** no new delivery lifecycle, model-driven ordinary sweep, fleet inventory, automatic activation, merge authority or publication from this workspace.

## Decisions

- Keep the open-only validator unchanged for ordinary callers. Add a terminal publication disposition only after retained request and publication authentication; validate terminal identity against the same immutable publication subject without granting an open-candidate effect.
- Add a daily schedule and explicit manual housekeeping dry-run to the existing maintenance workflow rather than a second recovery service. Existing issue-serialized recovery remains the only route for reservation release, completion and continuation.
- Use a separate managed block in the existing owner-authored report index. Serialize it with worker reporting, re-read before writing, reject older observations and preserve owner content and the last complete scan across partial failures.
- Generate the package-mode maintenance projection from SDLC-owned source through the CLI's existing hash-based ownership planner. Do not overwrite customized or unowned workflows, activate repository variables, or claim a published version is available.
- Inspect dependencies and child tracking as eligibility information only. Inaccessible inventories are incomplete, not resolved. Bound discovery explicitly and continue after individual failures.

## Risks / Trade-offs

- Original #633 request artifacts are not supplied → retain unavailable-evidence classification and current public PR/lifecycle evidence, not an inferred historical approval.
- GitHub pagination or evidence access fails → record partial coverage and do not advance freshness.
- Concurrent or uncertain writes → existing report serialization, pre-write re-read and no non-idempotent creation or recovery replay.
- Package-mode workflow references an unreleased source version → publication and native adopter acceptance remain later-stage obligations, not local test claims.

## Migration Plan

Release the CLI and SDLC changes together. Review `lighthouse upgrade --scope sdlc`, apply only owned changes, configure the report index and explicitly enable maintenance and automation. Validate native complete daily coverage separately. Roll back through the adopter's reviewed commit; preserve report history and owner notes.
