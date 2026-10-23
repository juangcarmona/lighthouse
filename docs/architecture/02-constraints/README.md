---
title: Architecture constraints
arc42-section: "02"
description: Repository, distribution, ownership and runtime constraints that shape Lighthouse.
---

# 2. Architecture constraints

## Constraints

| Constraint | Source | Architectural consequence | Negotiable |
| --- | --- | --- | --- |
| Node.js 22 or newer runs the workspace tooling | Root `package.json` | CLI and repository checks use the Node runtime and npm workspace contract | No for the current workspace |
| Implementation stays under `src/`, repository docs under `docs/` and automation under `scripts/` | `AGENTS.md`, ADR-0005 | Package source and adopter projections remain separate from repository integration points | No without a new decision |
| The root workspace is private and packages expose their own `files` and `exports` boundaries | Root and package manifests; ADR-0006 | Published artifacts exclude the gallery, reference source, tests and provider-owned integrations unless a package owns them | No |
| ProductShape and ArcShape own their provider files and validators | Product model; CLI authority commands | Lighthouse records integration versions and uses provider routes instead of replacing provider content | No |
| Verification runs locally and in CI without a hosted Lighthouse runtime | Root scripts and workflows | The system is a local/package contract, not a server deployment | No |
| Generated site output, browser reports and provider snapshots are disposable | Build and verification scripts | Source-controlled Markdown, package assets and manifests remain authoritative | No |
| A consuming project must resolve ownership before Lighthouse writes a managed path | CLI planning and upgrade logic | Init, reconcile and upgrade are dry-run or conflict-stopping operations before mutation | No |

## Product-defined target constraints

The product model requires an application-aware initializer to include Aspire as the composition boundary, avoid generating an unselected backend, select compatible profiles and report an external CodeGraph gap. The current CLI records application shape and stack in `lighthouse.json` and composes profile metadata, but it does not yet implement the Aspire or CodeGraph steps.

<!-- pdac:cite id="FR-INITIALIZE-FOUNDATION" digest="sha256:95dfc4b2b0a94c5747615e734a2302004543bcc8f33e1e494937d471d2bfc1c4" -->

## Ownership constraints

- Product intent belongs to ProductShape when a project adopts it.
- Architecture documentation belongs to ArcShape when a project adopts it.
- OpenSpec owns change-artifact schemas and managed change files.
- Lighthouse owns its source packages, initializer, checks and adoption guidance.
- An adopting project owns its application code, infrastructure and explicit exceptions.
- Provider-owned generated files are changed through their provider.

## Current implementation constraint

The CLI implements manifest validation, semantic and direct initialization, managed projections, profile composition, authority validation and adoption, package upgrade planning, capability discovery and explicit provider reconciliation. The SDLC package validates lifecycle contracts but does not run agents, persist transcripts or dispatch across repositories.

<!-- pdac:cite id="BR-SDLC-PACKAGE-BOUNDARY" digest="sha256:4ba55af58f445e06672a1a7cc82a2f35fad20051acb9f172ba297998e6af5a71" -->
