# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation and product grounding. Existing SDLC contracts use additive ES module exports and JSON schemas; package file lists already ship `src` and `schemas`. Preserve existing exports, dependencies, versions and assertions.

## Goals / Non-Goals

Evaluate a caller-supplied bounded contract against an ordered, explicitly simulated trace. Do not execute tools, inspect project files, judge general design quality or assert provider qualification.

## Decisions

- Use a closed versioned document containing a trusted caller contract and ordered typed observations. The caller, not trace text, declares expected skill, requester, required context identities, accepted decision IDs, allowed paths and required checks. Strict validation rejects unsupported fields, event types and unsafe relative paths. A small schema walker uses only the keywords in the shipped schema, avoiding a new runtime dependency.
- Return independent selection, protocol and completion assertions plus aggregate status. Protocol requires context reads before output/effects, no advice writes, scoped modifications, no repeated/accepted-decision interviews and no replacement of accepted decisions. Completion requires a structured scenario-specific result, every declared check passed (implementation must declare checks), and a later delivery of that exact result to the declared requester. References or prose phrases cannot establish completion.
- Scope entries are exact relative paths or directory prefixes ending in `/`, not globs. Reject absolute paths, traversal, backslashes and empty segments rather than guessing their meaning.
- Use inline simulated fixtures and one isolated near miss per assertion. Tests replace each actual evaluator predicate with an always-true predicate in a temporary module and prove the same near-miss oracle fails. Mutation hooks are not a public API.
- Pack the real package into a temporary consumer, extract it without dependency installation, and resolve both public exports from that consumer. This avoids ambient workspace imports and network access; the evaluator has no external dependencies.
- Keep provider measurement `unmeasured` in every report. A live route is unnecessary without a supported real-provider claim; fixture success is not runtime qualification.

<!-- pdac:cite id="FR-SKILL-CONTRACTS" digest="sha256:9cc9969f26d71771ee0de0cd973841ad2f8fe33a5169594f4a8a88a052f48c9b" -->

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:c07c375e4fa1788978ca5d900bc8f0ea9bc009bc71a1fff5d7602ebed6b00894" -->

## Risks / Trade-offs

- [Forged/incomplete observations] → Reports prove only predicates over supplied observations, not authenticity or unseen actions. Trusted capture and provider qualification remain separate.
- [Schema/evaluator drift] → Validate input using the shipped schema, reject unknown syntax, and exercise malformed documents and exported schema in the packed consumer.
- [False success from independent dimensions] → Overall success requires every assertion; tests preserve dimension-specific failures and ordering/link identity near misses.
- [Historical citation repair broadens scope] → Add only provider-emitted metadata to the one admitted file and verify unchanged checklist bytes in the diff.

## Migration Plan

Release additively through a patch changeset. Consumers opt into the new exports. Rollback removes only the additive exports/assets and guidance, with no persisted state migration. Independent host checks, PR review, merge and release remain later responsibilities.
