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
| Separate delivery decisions, execution and publication | [ADR-0007](0007-host-execution-boundary.md) | Stage execution, host contracts and publication authority |
| Publish validated Lighthouse packages through protected release automation | [ADR-0006](0006-public-package-release.md) | Public package distribution and release control |
| Separate workflow entry, autonomy and integration authority | [ADR-0008](0008-separate-entry-and-autonomy.md) | Routing, authorization and host continuation |

| Run repository workers through gh-aw | [ADR-0009](0009-gh-aw-repository-execution.md) | Opt-in workflows, OpenCode execution and host isolation |

The product model and completed Product Changes define product intent for application profiles, semantic initialization, authority adoption and SDLC behavior. Those artifacts are not ADRs. The arc42 sections describe the current realized structure and name remaining target behavior without treating it as implemented.
