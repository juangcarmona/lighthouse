---
id: UC-IMPLEMENT-CHANGE
type: use-case
title: Apply an accepted change at the Done gate
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-AGENT-HOST, ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-OWNED-AUTHORITY, BR-AUTHORITY-BOUNDARIES, BR-HUMAN-AUTHORITY, BR-FAIL-CLOSED, BR-BOUNDED-WORKFLOW, BR-STAGE-GATES, BR-PRODUCT-CHANGE-HANDOFF]
uses-terms: [TERM-GUARDRAIL, TERM-INTEGRATION, TERM-AUTHORITY-MAP, TERM-CHANGE-FLOW, TERM-WORKFLOW-STAGE, TERM-GATE, TERM-TRIAGE, TERM-LABEL-STATE]
---

## Goal

Apply a Planned change in bounded slices and produce the evidence required for the Done gate.

## Trigger

The adopter starts `implement` after `propose` has produced a reviewable solution and the applicable human or independent review has passed.

## Preconditions

The change has a triage result or direct engineer entry authorization, valid labels, a bounded scope, a Planned gate result, named Definition of Done items, the relevant project instructions and any required ProductShape, ArcShape, OpenSpec or agent workflow integration is healthy.

## Main Flow

1. `implement` loads the accepted plan, authority citations, path scope and Definition of Done items.
2. The stage applies dependency-ordered slices through the OpenSpec-provided application contract or the manual route.
3. The stage runs deterministic checks, collects named judgement decisions and runs targeted audits when the change surface requires them.
4. The stage reports the Done result, unresolved findings and the next `integrate` decision without invoking it.

## Alternative Flows

An authorized implementation workflow may enter before the internal proposal stage has completed. It must produce the real OpenSpec proposal, design and task artifacts and satisfy their applicable gate before applying code. The implementation stage itself still consumes a Planned result.

A project can use a manual route when no supported agent workflow is installed; the same project guardrails, stage contract and human decisions still apply.

If implementation discovers an in-scope product gap, it checkpoints its parent and preserves existing work, then uses UC-PREPARE-PRODUCT-CHANGE on the issue branch and PR. Dependent implementation pauses for explicit authenticated human product approval, provider-owned apply and resulting-definition validation. Successful apply resumes the same authorized parent once without another implementation request, after affected citations and dependent planning or gate evidence are refreshed as needed. The stage records the applied branch context without claiming canonical baseline acceptance before merge. A broader adjustment stops for an owner scope decision.

## Failure Conditions

The change exceeds its declared scope, an authority is stale, a required product decision is missing or stale, product apply or publication is failed or uncertain, authority is revoked, a Definition of Done dimension is missing or a verification check fails. Dependent work stops with its checkpoint preserved.

## Postconditions

The project has a Done-gate result with evidence, unresolved findings and a named next decision; integration remains a separate stage.
