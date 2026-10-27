# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation. The README's Implementation delivery section already describes draft creation and PR-state projection, making it the appropriate location for the clarification.

## Goals / Non-Goals

**Goal:** Distinguish candidate completeness from the maintainer's ready decision without changing the existing explanation.

**Non-goals:** Change projection logic, automate draft/ready transitions, modify tests or dependencies, or merge this disposable fixture.

## Decisions

Append one sentence to the existing draft-policy paragraph rather than adding a section or repeating the projection algorithm. Use the maintainer as the actor, consistent with the existing human-decision boundary.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

Use the documentation-only spec opt-out instead of inventing a behavioral requirement. Verify the exact README diff and run the configured checks; a new runtime test would not exercise any changed behavior.

## Risks / Trade-offs

- Wording could imply that completeness automatically means ready → explicitly leave the ready decision with the maintainer.
- Local checks cannot prove live GitHub event tracing → leave that follow-up to the owner after publication; do not claim it passed.

## Migration Plan

No deployment or migration is required. The fixture is intended to be closed without merging; removing the added sentence would reverse the documentation change.
