---
title: Risks and technical debt
arc42-section: "11"
description: Current implementation gaps and risks in the target profile-aware Lighthouse architecture.
---

# 11. Risks and technical debt

| Risk | Evidence | Response |
| --- | --- | --- |
| Product target is ahead of the CLI | The current CLI supports manifest projection and verification only | Keep target behavior in the active Product Change until implementation and adoption evidence exist |
| Reference profile can drift from generated profiles | The .NET profile is source and test material inside Lighthouse | Extract profile contracts from verified examples and check generated output |
| Profile explosion | The product may support many stacks and application shapes | Keep one baseline and add profiles only when a stack has owned guidance and deterministic checks |
| Aspire scope can be misunderstood | Aspire is mandatory as composition even when no Lighthouse-owned backend exists | Document Aspire as the host boundary and keep backend selection explicit |
| Feature mapping can become ceremony | Full-stack alignment is useful only when it helps tests and maintenance | Keep the mapping at bounded-context and feature boundaries and link to source evidence |
| Hard checks can overclaim | Some conventions cannot be verified deterministically across stacks | Report unsupported checks as adoption gaps and preserve soft guidance |
| Provider ownership can drift | ProductShape, ArcShape and OpenSpec have separate managed paths | Run each provider validator and keep Lighthouse integrations thin |
| Distribution remains local | Package manifests are private and workflows do not publish them | Prove one consumer before choosing registry or release automation |
| Public snapshots can drift from their authorities | The site output is generated and ignored rather than stored as source | Build ProductShape and ArcShape snapshots in the same verified workflow that publishes the landing |

The repository has no hosted Lighthouse runtime, tracker adapter, durable agent memory store or integrated CodeGraph client today.
