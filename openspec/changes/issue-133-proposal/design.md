<!-- pdac-scope: none reason="Owner-authored issue 133 requests only a temporary documentation fixture, not a product behavior change." -->

# Design

## Context

See `proposal.md` for motivation. The owner supplies the complete fixture text and prohibits unrelated product changes.

## Goals / Non-Goals

**Goals:** Preserve the exact Markdown bytes, including a final newline, and keep planning artifacts with the fixture.

**Non-Goals:** Change or independently certify the router, modify product contracts, publish directly, merge, close the issue or start another stage.

## Decisions

- Use a static Markdown file, not generated output or a new test module. An exact-byte assertion recorded in external evidence verifies this documentation-only change without adding code.
- Omit specification deltas using `skip_specs: true`; a new capability would incorrectly turn a temporary acceptance fixture into a product contract.
- Run the configured install, repository verification and strict OpenSpec validation; retain receipts outside the candidate under `/output/evidence/`.

## Risks / Trade-offs

- The sentence alone does not prove dispatch identity → the host must authenticate the supplied provenance and validate the candidate before publication.
- A temporary fixture could be mistaken for permanent documentation → the owner explicitly intends to close the PR without merging; no automated merge or cleanup is requested.
