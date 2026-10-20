# ADR 0002: Start with a private local tool, defer publication

- Status: accepted for initial implementation
- Date: 2026-10-20

## Context

Candidate consumers use different mechanisms: npm packages and CLIs for ProductShape and ArcShape, plus the configured tracker, forge and agent host. A broad package suite would commit to APIs before a cross-repository adoption has proved them.

## Decision

Use a private npm workspace and checked-in manifest/schema/scripts as the initial development interface. Keep the first command local and dependency-free. Do not publish public or private packages yet. After one existing product uses the interface, decide whether CLI distribution should be public, private-registry, or source-controlled local tooling. ADR-0005 later refines the source layout without changing this local/private distribution decision.

## Alternatives and consequences

- **Public npm:** easy installation across repositories, but public support/versioning obligations and visible implementation. Defer until API stability and intended visibility are confirmed.
- **Private registry/package:** access control, but credential and registry availability become adoption prerequisites. No evidence yet supports that cost.
- **Copy templates/scripts into each repo:** no runtime dependency, but fixes and rules drift. Reject as the long-term source; limited generated projections are still committed and drift-checked.
- **Git dependency or direct `npx` from GitHub:** simple early access, but requires pinning and may complicate repeatable installation. Revisit alongside first consumer trial.
