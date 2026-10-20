---
id: CHG-INITIAL
type: product-change
title: 'Define Lighthouse foundation product'
status: applied
base-revision: '0000000'
operations:
  add:
    - ACT-MAINTAINER
    - ACT-ADOPTER
    - ACT-AGENT-HOST
    - ACT-INTEGRATED-SYSTEM
    - BC-FOUNDATION
    - TERM-FOUNDATION
    - TERM-PROFILE
    - TERM-ADOPTION
    - TERM-GUARDRAIL
    - TERM-MANAGED-PROJECTION
    - TERM-INTEGRATION
    - TERM-CHANGE-FLOW
    - TERM-WORKFLOW-STAGE
    - TERM-HARNESS
    - TERM-AUTHORITY-MAP
    - TERM-GATE
    - TERM-TOOL-CONTRACT
    - TERM-CHANGE-OVERVIEW
    - TERM-DELIVERY-ROUTE
    - TERM-TRIAGE
    - TERM-COMPLEXITY-ESTIMATE
    - TERM-BLAST-RADIUS
    - TERM-LABEL-STATE
    - TERM-CODEGRAPH-SERVICE
    - TERM-AGENT-MEMORY
    - TERM-AGENT-RUN
    - TERM-AGENT-ROLE
    - TERM-WORKFLOW-STATE
    - TERM-PACKAGE-ARTIFACT
    - TERM-PUBLIC-SITE-PROJECTION
    - TERM-ADOPTION-RELEASE
    - TERM-WORK-ITEM-SLICE
    - TERM-STACKED-CHANGE
    - TERM-HOTFIX-ROUTE
    - BR-OWNED-AUTHORITY
    - BR-FAIL-CLOSED
    - BR-HUMAN-AUTHORITY
    - BR-BOUNDED-WORKFLOW
    - BR-AUTHORITY-BOUNDARIES
    - BR-STAGE-GATES
    - BR-ROUTE-CONTRACT
    - BR-TRIAGE-CONTRACT
    - BR-LABEL-STATE
    - BR-CODEGRAPH-EXTERNAL
    - BR-MEMORY-BOUNDARY
    - BR-WORKFLOW-STATE
    - BR-AGENT-LAUNCH
    - BR-LABEL-ROLES
    - BR-DISTRIBUTION-BOUNDARY
    - BR-ADOPTER-CONSUMER
    - BR-PUBLIC-SITE-PROJECTION
    - BR-DECOMPOSITION
    - BR-HOTFIX
    - BR-GITHUB-INTEGRATION
    - UC-INITIALIZE-PROJECT
    - UC-INITIALIZE-AUTHORITIES
    - UC-ADOPT-PROFILE
    - UC-VERIFY-FOUNDATION
    - UC-IMPLEMENT-CHANGE
    - UC-RUN-SDLC
    - UC-TRIAGE-WORK-ITEM
    - UC-CHECK-CODEGRAPH
    - UC-RUN-AGENT
    - UC-CONTINUE-AGENT-RUN
    - UC-CONFIGURE-AGENT-CONTROL-PLANE
    - UC-ADOPT-CONSUMER
    - UC-BUILD-PUBLIC-STORY
    - UC-DECOMPOSE-WORK-ITEM
    - UC-RUN-HOTFIX
    - UC-MANAGE-STACKED-CHANGE
    - UC-UPDATE-FOUNDATION
    - JRN-ADOPT-AND-DELIVER
    - FR-INITIALIZE-FOUNDATION
    - FR-AUTHORITY-INITIALIZATION
    - FR-PROFILE-CONTRACT
    - FR-VERIFY-FOUNDATION
    - FR-INTEGRATION-BOUNDARIES
    - FR-CHANGE-EVIDENCE
    - FR-CHANGE-FLOW
    - FR-HARNESS-CONTRACT
    - FR-AUTHORITY-CONTEXT
    - FR-SDLC-LIFECYCLE
    - FR-CHANGE-OVERVIEW
    - FR-DELIVERY-ROUTES
    - FR-TRIAGE-WORK-ITEM
    - FR-LABEL-STATE
    - FR-CODEGRAPH-INIT-CHECK
    - FR-AGENT-MEMORY
    - FR-WORKFLOW-STATE
    - FR-AGENT-LAUNCH
    - FR-AGENT-CONTROL-PLANE
    - FR-LABEL-ROLES
    - FR-PACKAGE-DELIVERY
    - FR-CONSUMER-ADOPTION
    - FR-PUBLIC-SITE-PROJECTION
    - FR-DECOMPOSE-WORK-ITEM
    - FR-HOTFIX-ROUTE
    - FR-STACKED-CHANGES
    - QR-DETERMINISTIC
    - QR-ADOPTABILITY
    - QR-TRACEABILITY
    - QR-LOW-COUPLING
    - QR-BOUNDED-AUTOMATION
    - QR-AUTHORITY-TRACEABILITY
    - QR-GATE-CONTROLLABILITY
    - QR-LABEL-DETERMINISM
    - QR-AGENT-ISOLATION
    - QR-REPRODUCIBLE-DISTRIBUTION
    - CON-PROJECT-OWNERSHIP
    - CON-PERSONAL-FIRST
    - CON-EXISTING-AUTHORITIES
    - SB-INITIALIZE
    - SB-VERIFY
    - SB-CHANGE-FLOW-VERIFIED
    - SB-SDLC-GATES
  modify: []
  remove: []
---

## Problem

Lighthouse has an engineering baseline, visual assets and adoption guidance, but its product definition has not yet stated the reusable delivery harness it is meant to provide. Without that definition, templates, tools, profiles and integrations can grow as unrelated features.

## Intended Product Outcome

Lighthouse is a project-owned software delivery harness for Juan's projects first and other adopters when the interface proves useful. ProductShape remains the source of product intent, ArcShape remains the source of architecture evidence, and Lighthouse installs the core harness, the SDLC package and the independent UI package while preserving OpenSpec as the change-artifact authority. The harness exposes tools, guardrails, package contracts and evidence without becoming a second product authority, architecture system or factory.

## Rationale

The initial product definition keeps the repository small while giving later templates, guardrails and integrations one product boundary. It proves a normal change, a hotfix and a small stacked change on one real adopter before adding broad automation. Its public lifecycle uses `triage`, `refine`, `propose`, `implement`, `integrate` and `review`, with `decompose`, `hotfix`, `status` and `ff` as explicit capabilities. The 0.1.0 adoption release is a private, reproducible package set consumed by an adopter, and the public site is a generated projection of ProductShape, ArcShape and the workflow contract. The independent UI package provides tokens, native recipes, a `DESIGN.md` template, an agent skill and a hard verifier created during initialization; the backend remains a selectable technical profile.

## Affected Product Areas

The harness boundary; initialization and adoption; technical profiles; the visual contract and its initialization projections; deterministic verification; managed projections; visual conventions; the OpenSpec-compatible change flow; the selected SDLC package and its skills, commands and meta-commands; triage with complexity and blast-radius assessment; simple tracker labels; hotfix delivery; issue decomposition; stacked changes; human-readable change overviews; supervised and unattended delivery routes; bounded agent runs; scoped agent memory; rebuildable workflow state; reproducible package artifacts; adopter verification; the generated public story; external CodeGraph access; and integrations with product, architecture, factory, tracker and forge tooling.

## Open Questions

- Which OpenSpec change artifacts should Lighthouse require for every project, and which should remain optional by profile or risk level?
- Which run state and memory records must survive a chat or host restart, and which can remain ephemeral?
- Which harness tool contracts are mandatory for every adopter, and which belong to optional profiles or integrations?
- Which existing tracker labels and GitHub permissions should the first adapter map, and which should remain project configuration?
- Which complexity scale and confidence rules give useful estimates without turning them into delivery promises?
- Which blast-radius scale and confidence rules make impact visible without turning it into a false precision score?
- Which CodeGraph MCP health and repository/worktree resolution checks belong in `init`, and what should remain an explicit adoption gap?
- Which decomposition and stacked-change operations are needed for the first two-level fixture?
- Which provider-neutral role contracts are needed for the first adopter, and which agent-host adapters can remain optional?
- Which `.lighthouse/` files are the smallest useful control plane for one real route?
- Is the first 0.1.0 adoption release consumed from CI tarballs, a pinned Git revision or both during the pilot?
- Which frontend framework adapter should be added when a real adopter needs more than the framework-neutral visual contract?

## Product Acceptance

The accepted model describes one Lighthouse harness with a maintainer, adopters and agent hosts; an authority map for ProductShape, ArcShape and delivery evidence; explicit initialization, first-use orientation, adoption, verification and upgrade outcomes; installation of the core harness, the SDLC package and one independent UI package; a visual contract with tokens, native recipes, a `DESIGN.md` template, a soft agent skill, a hard verifier and an optional palette override created through initialization; selectable backend profiles; triage with complexity, blast radius and simple project-declared label state; SDLC package stages with Ready, Planned and Done gates; supervised, plan-only, unattended, hotfix and stacked routes that preserve those gates; bounded parent and child agent runs; typed run, project and optional shared memory; a rebuildable workflow state machine; a private 0.1.0 adoption release with a small package set; a clean consuming fixture; a generated public site that projects ProductShape and ArcShape without becoming another authority; OpenSpec-owned change artifacts; GitHub issue, label, subissue and pull-request integration without a Lighthouse namespace; an external CodeGraph MCP check for repository and worktree context; a human-readable change overview; discoverable tool contracts; guardrails for ownership and human decisions; and measurable quality obligations for determinism, adoptability, traceability, low coupling and controllability. The public-site projection builds both snapshots into one static output and publishes it through the GitHub Pages workflow.

## Out of Scope

This change does not define a hosted Lighthouse service, runner fleet, product-management system, architecture authoring system, agent model router, memory provider, durable multi-tenant store or package registry operation. It does not replace ProductShape, ArcShape, OpenSpec or an agent host. It does not choose a frontend framework or a name and package boundary for a combined full-stack template. It does define a private 0.1.0 adoption artifact and a verified static public-site projection published through GitHub Pages; public registry publication and hosted Lighthouse execution remain later decisions. The `.lighthouse/` control plane is a small repository-owned contract, not a general-purpose agent runtime.
