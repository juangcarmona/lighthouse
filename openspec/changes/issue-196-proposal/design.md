# Design

<!-- pdac-scope: none reason="The owner-defined documentation-only correction in issue #196 requires no product-semantic or architecture decision." -->

## Context

See proposal.md for motivation. The typo is on README line 3. `eligibility.mjs` already uses `>= 2`; existing regression tests import it directly and do not consume README text.

## Goals / Non-Goals

**Goal:** Keep the implementation diff limited to the exact requested word replacement.

**Non-goals:** Reconcile the historical boundary-defect wording, change code or tests, modify delivery policy, or alter product and architecture authorities. Interfaces and stored data are unaffected.

## Decisions

Use a literal word replacement, not paragraph rewriting or Markdown reformatting, to preserve all other bytes. Keep existing tests unchanged rather than adding a test for prose; exact text/byte comparison verifies the correction, while configured checks verify repository compatibility. Use the no-spec marker rather than manufacturing a behavioral requirement.

## Risks / Trade-offs

- Accidental cleanup beyond scope → compare the fixture against the authorized source, allowing only the requested replacement.
- Historical wording remains imperfect → leave it intact as explicitly required.

## Verification and Definition of Done

The corrected phrase is present; the README equals its original bytes with only `acceptence` replaced by `acceptance`; every other fixture file is unchanged. All configured commands in tasks.md must pass later, and independent planning review precedes implementation while independent candidate review follows verification. No new tests or visual evidence are needed because runtime and UI are unchanged. The trusted host materializes and validates these provider artifacts.

## Migration Plan

No migration or deployment is needed. Integration targets `main` only through the existing authorized route. Roll back the fixture correction by reverting its isolated word replacement; release and deployment remain separate.
