# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

## Context

See `proposal.md` for motivation. The implementation delivery section already explains draft PRs, readiness and correction of the same PR under FR-AUTHORIZED-WORKFLOW-ENTRY.

## Goals / Non-Goals

**Goals:** Make the maintainer's ready-to-draft action explicit beside the existing PR state guidance, preserving surrounding prose.

**Non-Goals:** Change routing, readiness checks, labels or merge authority; perform live PR transitions; expand the fixture beyond one README sentence.

## Decisions

Add a standalone sentence after the paragraph describing publication and correction. Prefer this over rewriting that paragraph or adding a new section, so the acceptance fixture remains easy to review. Use `skip_specs: true` rather than inventing a behavior contract for an existing capability.

Check the exact one-sentence diff, run all configured checks and verify product citations. Existing tests cover runtime behavior; no runtime tests or screenshots are needed for a Markdown-only clarification.

## Risks / Trade-offs

- Wording could imply approval or merge authority → describe only returning a ready implementation PR to draft while making a correction.
- Fixture purpose could be mistaken for a shipping change → retain the close-without-merge intent in the proposal and leave PR-state tracing to the owner.
