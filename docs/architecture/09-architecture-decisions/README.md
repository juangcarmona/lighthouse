---
title: Architecture decisions
arc42-section: "09"
description: Index of accepted architecture decisions and the draft product change that currently shapes the target.
---

# 9. Architecture decisions

The decisions live beside this index in this section directory. This section identifies accepted decisions that shape the current repository.

| Decision | ADR | Affected architecture |
| --- | --- | --- |
| Lighthouse and adopters have separate ownership | [ADR-0001](0001-lighthouse-and-factory-ownership.md) | Context and scope; adoption boundary |
| Start with a private local tool and defer publication | [ADR-0002](0002-distribution.md) | Distribution and adoption boundary |
| Deliver one Lighthouse UI package | [ADR-0004](0004-lighthouse-ui-package.md) | UI package and initialization projections |
| Separate source packages from adopter projections | [ADR-0005](0005-source-packages-and-adopter-projections.md) | Source layout; package boundaries; adopter root contracts |

The profile-aware initialization architecture is currently described by the applied [CHG-INITIAL product change](../../product/changes/completed/chg-initial/change.md); it is not an ADR or an implemented runtime contract yet.

These arc42 sections describe resulting structure and evidence. ADRs retain rationale, rejected alternatives and consequences.
