---
id: UC-RUN-SDLC
type: use-case
title: Run the SDLC package delivery flow
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-AGENT-HOST, ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-AUTHORITY-BOUNDARIES, BR-STAGE-GATES, BR-ROUTE-CONTRACT, BR-TRIAGE-CONTRACT, BR-LABEL-STATE, BR-FAIL-CLOSED, BR-HUMAN-AUTHORITY]
uses-terms: [TERM-HARNESS, TERM-AUTHORITY-MAP, TERM-GATE, TERM-CHANGE-OVERVIEW, TERM-DELIVERY-ROUTE, TERM-CHANGE-FLOW, TERM-WORKFLOW-STAGE, TERM-TRIAGE, TERM-LABEL-STATE]
---

## Goal

Move one bounded work item from backlog through the SDLC gates with ProductShape and ArcShape context, OpenSpec artifacts and reviewable evidence.

## Trigger

The adopter selects a backlog item or product change for delivery through the Lighthouse harness.

## Preconditions

The project has a declared authority map, an adopted Lighthouse profile, a configured label vocabulary and a supported OpenSpec or manual route for the change.

## Main Flow

1. `triage` classifies the item, records complexity, blast radius and confidence, applies valid configured labels and selects a route.
2. The adopter selects that route and reviews its stage composition, tools, limits and decision owners.
3. `refine` turns the item into a sufficiently defined problem, evaluates the Definition of Ready and stops at the Ready gate.
4. `propose` prepares the solution and test impact through the OpenSpec-provided change contract, writes the human-readable change overview, names the Definition of Done items and stops at the Planned gate.
5. `implement` applies the accepted plan in bounded slices, runs deterministic checks and named judgement roles against the Definition of Done, and stops at the Done gate.
6. `integrate` rechecks Done, synchronizes completion artifacts, updates the tracker and performs the project's merge or stacked-PR closure steps.
7. `review` records the cycle's evidence and process learning without reopening a delivery gate.
8. The harness reports the next stage after every gate and invokes it only when the selected route explicitly composes stages through `ff`.

## Alternative Flows

An adopter can run the supervised route one stage at a time, stop after `propose` for a plan-only review, use bounded `ff` for unattended work, select `hotfix` for a confirmed defect or select `decompose` for a large item; all routes preserve the same authority context, label state, gate semantics and evidence contract.

## Failure Conditions

The item lacks a required authority revision, a gate dimension, a deterministic check, a named judgement owner or a permitted tool, or the change exceeds its declared scope.

## Postconditions

The project has a stage result, gate evidence, named next decision and a durable record of any unresolved finding or human exception.
