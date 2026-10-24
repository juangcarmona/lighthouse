---
title: Risks and technical debt
arc42-section: "11"
description: Prioritized architectural risks, implementation gaps and technical debt.
---

# 11. Risks and technical debt

| Risk or debt | Architectural impact | Evidence | Priority | Mitigation or decision |
| --- | --- | --- | --- | --- |
| Product-defined initializer is ahead of the CLI | The model asks for Aspire composition, CodeGraph checks and fuller application shaping | Product model and CLI implementation | Medium | Keep those claims explicitly target-only and add implementation evidence before moving them into the current view |
| Product model status is still `draft` | Architecture can be mistaken for accepted product intent | `docs/product/model/` frontmatter | High | Keep citations, state the status and avoid presenting draft requirements as delivered acceptance |
| Reference profile can drift from generated assets | The .NET profile exists both as source and packaged template | Profile source, creator and tests | Medium | Keep the creator and profile tests green and compare source and packaged assets |
| Profile surface can grow faster than evidence | More profiles increase compatibility and upgrade obligations | Profile catalog and consumer fixtures | Medium | Add a profile only with owned surfaces, prerequisites, checks, exceptions and a consumer fixture |
| Provider ownership can drift | ProductShape, ArcShape, OpenSpec and GitHub each have separate managed paths | Provider commands and CLI adapters | High | Keep integrations thin, run provider validators and stop on conflicts or unavailable evidence |
| Capability adoption has one provider slice | The catalog mechanism is reusable, but broader provider semantics are not proven | GitHub labels fixture | Medium | Preserve the fixture and add another adapter only for a demonstrated adopter need |
| Public snapshots can drift from authorities | Site output is generated and ignored rather than stored as source | Public-site workflow and verifier | Medium | Build and validate both provider snapshots in the same workflow that publishes the landing |
| The workspace has no hosted runtime | Agent execution, durable memory and cross-repository dispatch remain external | SDLC package and deployment topology | Low | Keep the SDLC package provider-neutral and document host ownership |

<!-- pdac:cite id="QR-LOW-COUPLING" digest="sha256:6892a1030f2bbc6d41c16ae1199b557028e3ed98b8bb392af9a38cd7fda413b8" -->

## Execution gaps blocking a factory pilot

The [reconciliation backlog](../../roadmap/factory-reconciliation.md#evidence-at-reconciliation) identifies source-path coupling, incomplete continuation enforcement, missing automatic intake, missing host handoff and missing stage-effect publication. These block an end-to-end factory claim even when the package and repository checks pass. Use the packed consumer and real host proof described there before enabling unattended execution.
