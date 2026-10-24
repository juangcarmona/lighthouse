---
title: Architecture decisions
arc42-section: "09"
description: Index of accepted architecture decisions and the architecture areas they affect.
---

# 9. Architecture decisions

The decisions live beside this index in this section directory. This section is a navigation index; each decision file owns its rationale, alternatives and consequences.

| Decision | ADR | Affected architecture |
| --- | --- | --- |
| Lighthouse and adopters have separate ownership | [ADR-0001](0001-lighthouse-and-factory-ownership.md) | Context and scope; adoption boundary |
| Start with a private local tool and defer publication | [ADR-0002](0002-distribution.md) | Historical bootstrap phase; superseded by ADR-0006 for publication |
| Deliver one Lighthouse UI package | [ADR-0004](0004-lighthouse-ui-package.md) | UI package and initialization projections |
| Separate source packages from adopter projections | [ADR-0005](0005-source-packages-and-adopter-projections.md) | Source layout; package boundaries; adopter root contracts |
| Publish validated Lighthouse packages through protected release automation | [ADR-0006](0006-public-package-release.md) | Public package distribution and release control |

The product model and completed Product Changes define product intent for application profiles, semantic initialization, authority adoption and SDLC behavior. Those artifacts are not ADRs. The arc42 sections describe the current realized structure and name remaining target behavior without treating it as implemented.

## Proposals

[ADR-0007: Separate delivery decisions, execution and publication](0007-host-execution-boundary.md) is Proposed (2026-10-24). It is not an accepted decision or implemented runtime.
