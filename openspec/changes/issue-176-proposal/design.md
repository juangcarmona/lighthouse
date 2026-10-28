# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation. The implementation delivery section already describes draft publication, required CI and the `pr-ready` projection. BR-HUMAN-AUTHORITY keeps merge decisions separate from implementation evidence.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

## Goals / Non-Goals

**Goals:** Put the clarification beside the PR-state description while preserving existing prose.

**Non-Goals:** Change automation, add tests for unchanged runtime behavior, perform GitHub writes or merge the acceptance fixture.

## Decisions

- Add a standalone sentence immediately after the paragraph describing PR readiness. This keeps the boundary visible at the relevant point; changing existing policy prose or workflow code would exceed the fixture's scope.
- Skip spec deltas because this is a documentation clarification, not a new requirement. A synthetic spec would misrepresent the change.
- Verify the exact one-sentence diff, Markdown, repository suite and strict OpenSpec validation. Screenshots and visual acceptance are not applicable to this Markdown-only change.

## Risks / Trade-offs

- Local checks cannot prove the live callback trace → leave draft PR → required CI success → automatic ready PR and `pr-ready` label observation to the host/owner after publication.
- This fixture must not be merged → retain an explicit close-without-merging follow-up.

## Migration Plan

No migration is required. Removing the added sentence rolls back the documentation clarification without runtime impact.
