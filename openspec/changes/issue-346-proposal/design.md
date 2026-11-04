# Design

<!-- pdac-scope: none reason="Owner-authorized disposable documentation fixture for issue 346; no product behavior or authority model changes." -->

## Context

See proposal.md for motivation. The supplied implementation request is the initial candidate, not a CI correction request. The only permitted repository writes are the fixture and this planning directory.

## Goals / Non-Goals

**Goals:** Preserve the exact initial fixture content, verify normal repository checks and retain a reviewable plan with evidence.

**Non-Goals:** Implementing correction machinery, simulating GitHub events, changing CI or validators, replacing the paragraph before a CI failure, merging or deploying.

## Decisions

- Use a Markdown file containing one heading, a blank line and the initial paragraph, with a trailing newline. Adding metadata or explanatory prose to the fixture would change the controlled input; put context here instead.
- Use the existing repository checks plus an exact-content assertion retained as evidence. Do not add or alter tests outside the allowed scope.
- Opt out of specification deltas because fixture content is not a new product capability. A fabricated requirement would misrepresent this documentation-only change.
- Defer the final paragraph replacement until the trusted correction stage reports the intentional mismatch. Writing the final value now would bypass the experiment rather than complete it.

## Risks / Trade-offs

- [Trusted CI is expected to reject the initial paragraph] → Report local checks separately from later CI acceptance; never weaken the mismatch check.
- [Local checks cannot prove routing or duplicate suppression] → Preserve those observations as later workflow follow-up, not completed tasks.

## Migration Plan

Deliver the fixture and plan together for the host-managed disposable draft PR. After trusted CI reports the mismatch, the authorized correction replaces only the paragraph with `The current candidate passed its bounded CI correction.` The owner or host retires the unmerged candidate after evidence collection; this stage performs no publication or cleanup.
