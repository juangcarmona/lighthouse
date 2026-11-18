---
id: FR-AGENT-LAUNCH
type: functional-requirement
title: Launch bounded parent and child agent runs
status: draft
derived-from: [UC-RUN-AGENT, BR-AGENT-LAUNCH]
verification:
  - scenario: A parent run launches a declared child role with a fresh context, unique IDs, explicit paths and limits, then receives a schema-validated result and evidence without a silent parent-state change.
  - scenario: Original work-item identity, revision, intent, criteria, unresolved questions and decisions remain traceable before planning and changed intent stops continuation for the named owner.
  - scenario: Completion reports stale, conflicting or missing affected instructions with evidence while an explained legitimate host-specific difference passes without unrelated rewrites.
uses-terms: [TERM-AGENT-ROLE, TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-GUARDRAIL]
---

## Requirement

Lighthouse MUST define a provider-neutral launch contract for role, inputs, allowed tools, write scope, output schema, parent run, attempt or time limit and stop conditions. An adapter MAY map that contract to a supported agent host, but host-managed agent files remain owned by that host.

Delivery contexts MUST retain references to the originating work item and its revision, admitted intent and acceptance criteria, unresolved questions and decision records before planning. ProductShape and ArcShape MUST remain the authorities for product and architecture meaning; imported observations MUST remain distinguishable from approved decisions. Changed intent or conflicting authority MUST stop dependent continuation and identify the responsible decision owner.

Newly admitted implementation work MUST record an assessment of instructions affected by its delivered behavior, including source evidence, ownership and stale, conflicting or missing guidance. Unresolved findings MUST block completion. Explained legitimate host-specific differences MUST remain permitted. Shared rules MUST have a canonical source with thin host projections; provider-owned repairs MUST use the owning provider and project-owned repairs MUST remain reviewable. Unrelated guidance MUST NOT require a rewrite. These checks MUST reuse existing stages and attach approval to material decisions.

## Rationale

Separating role contracts from host configuration keeps the harness portable and makes delegation auditable.
