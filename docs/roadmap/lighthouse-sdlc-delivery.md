---
title: Lighthouse SDLC delivery plan
description: Ordered implementation slices for the provider-neutral SDLC package.
---

# Lighthouse SDLC delivery plan

This is an implementation plan for the existing Product Definition; ProductShape remains the source of product intent and this document does not replace it.

## Result

The SDLC package gives an adopter a predictable delivery surface: classify a work item, choose a route, produce bounded change artifacts, implement a slice, integrate it, review the evidence and rebuild the run state after interruption.

The package distributes contracts, validators, skills and projections; an adopter's agent host owns execution, credentials, persistence, queues, budgets and model selection.

## Ordered slices

| Slice | Capability | Status | Exit evidence |
| --- | --- | --- | --- |
| 1 | Stage result and route contracts | Complete | Every stage and route can be inspected as structured JSON with inputs, outputs, evidence, gate and next action. |
| 2 | Rebuildable workflow state | Complete | Valid events replay to one state projection; illegal transitions and cross-run writes fail deterministically. |
| 3 | Scoped memory and agent handoff | Contract complete | Control-plane declarations validate role inputs, tool scope, output schema, limits and run/project memory boundaries without executing an agent. |
| 4 | Issue triage projection | Complete | GitHub issue metadata, labels, links and dependencies produce a deterministic report; reads are default and label writes require an explicit apply. |
| 5 | Decomposition and stacked planning | Complete | A large item produces a dependency-checked child plan; explicit GitHub apply creates validated children and emits an ordered stacked plan. |
| 6 | Route compositions | Complete | Supervised, plan-only, unattended, hotfix and stacked routes expose prerequisites, correction limits and human or forge gates before mutation. |
| 7 | Change evidence and integration | Contract complete | Implement, integrate and review consume the same stage result contract and keep merge, protected branch and human decisions explicit. |
| 8 | Capability reconciliation | First vertical slice complete | A repository declares the label capability, previews a deterministic plan, preserves existing values, applies missing labels explicitly and records drift evidence. |
| 9 | Adopter proof and release | First proof complete | A clean consumer upgraded to Lighthouse 0.4.0 and lighthouse-sdlc 0.5.0, adopted the label capability, passed `lighthouse verify` and kept its repository verification green. |

## Current position

The first capability adoption proof is complete. The release and adopter checks cover discovery during upgrade, dry-run planning, explicit external authorization, idempotent label reconciliation, verification and recorded evidence.

The next implementation slice is driven by a demonstrated adopter need. Until then, keep the existing contracts and fixtures stable and use a second adopter or a second capability to validate that the adoption mechanism remains reusable.

## Boundaries

The core CLI owns installation, reconciliation, upgrades and foundation verification. The SDLC package owns lifecycle procedures, route and gate descriptors, triage, decomposition, state and provider-neutral control-plane contracts.

ProductShape owns product intent, ArcShape owns architecture documentation and OpenSpec owns change artifacts. Lighthouse consumes their declared outputs and reports missing or conflicting authority without copying or replacing them.

GitHub is the first adapter for issues, labels, subissues and pull requests, but it remains a projection of the provider-neutral work-item and change contracts. No GitHub namespace, hosted runner or cross-repository dispatcher is introduced.

## Delivery rules

Every slice has a read-only preview and an explicit mutation boundary.

Every machine result has a schema, deterministic fixture and actionable failure state.

No slice adds a new package until a second adopter proves that independent installation and versioning are useful.

No slice stores agent transcripts, model output or shared budgets in the repository control plane.

## Product Change

The product boundaries for this plan are [CHG-SDLC-DELIVERY-001](../product/changes/active/chg-sdlc-delivery-001/change.md) and [CHG-CAPABILITY-RECONCILIATION-001](../product/changes/active/chg-capability-reconciliation-001/change.md). ProductShape remains the source of record for their lifecycle state; this plan records the implementation evidence without replacing that authority.
