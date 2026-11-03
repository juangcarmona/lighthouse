<!-- pdac-scope: none reason="Owner-defined docs-only fixture in issue #341; no product-semantic dependency or behavior change." -->

# Design

## Context

See `proposal.md` for motivation. The owner supplied the complete document text and authorized direct implementation in #341. No owner answers or unresolved content decisions are present.

## Goals / Non-Goals

**Goals:** Deliver a plain Markdown fixture with an exact heading, a blank line and the exact paragraph, ending with a newline. Keep its plan alongside it for review.

**Non-Goals:** Implement feedback correction, add instrumentation, modify delivery policy, record later acceptance observations, or alter product and architecture authorities.

## Decisions

- Use the requested repository documentation path, not package documentation, because this is a disposable repository fixture.
- Use `skip_specs: true` and explicit reasoned scope exemptions. Adding a behavioral spec would incorrectly imply a new capability.
- Include provider-required `schema: spec-driven` in change metadata: OpenSpec 1.15.0 rejected a standalone `skip_specs: true` marker as invalid metadata. This is metadata only, not an added specification.
- Verify exact bytes and the five-file change boundary. Run configured installation, repository verification and strict OpenSpec validation once; the host independently repeats its checks before publication. No browser screenshot or visual review is needed for this non-visual document.
- Keep acceptance reports outside the candidate in retained evidence. Do not add tests or workflows for owner-orchestrated observations.

## Risks / Trade-offs

- Accidental extra content → Compare the fixture against the owner's exact text.
- Confusing a fixture with completed feedback acceptance → Make no claims about later observations.
- Accidental integration → Retain the explicit never-merge instruction; publication does not authorize merge.

## Migration Plan

No migration or deployment. The owner will close the disposable PR and issue without merging; removing the fixture and its plan would undo this candidate.
