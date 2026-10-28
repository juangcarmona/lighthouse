---
id: CHG-BOUNDED-UNATTENDED-DELIVERY-001
type: product-change
title: Bounded fast-forward delivery and test-first hotfixes
status: applied
base-revision: 'ab08f4bc85a47c1fdd6e73f8b8eb29938077dffe'
operations:
  add: [FR-FAST-FORWARD-DELIVERY]
  modify: [FR-HOTFIX-ROUTE, BR-HOTFIX, UC-RUN-HOTFIX]
  remove: []
---

## Problem

Delivery exposes unattended composition and expedited correction, but the product definition does not specify the agreed eligibility, independent engineering decisions or quantitative test-first hotfix boundaries needed for repeatable delegation.

## Intended Product Outcome

An adopter can delegate eligible low-risk issues through fast-forward and confirmed isolated defects through test-first hotfix, preserving independent verification, current bounded authority and explicit human-only decisions.

## Rationale

The product owner explicitly approved this proposal on 2026-10-28. The three modified artifacts were unchanged by intervening accepted product work; revalidation includes that current baseline.

The owner selected one to three points by default with five points opt-in for fast-forward. For hotfixes, the selected bounds are 100 added plus deleted production-code lines, 10 changed files including tests and two repository-defined modules; test lines are separate from the production-code cap. Separate read-only reviewer executions using a different configured model provide engineering judgement alongside executed checks. Product approval and merge or release delegation remain separate facts.

## Affected Product Areas

Delivery composition, isolated defect correction, independent verification, scope admission and authorized integration.

## Open Questions

None.

## Product Acceptance

An eligible issue reaches verified integration under separate bounded merge delegation. An isolated defect demonstrates a meaningful failing regression followed by a passing repair within the selected scope bounds. Stale evidence, missing proof, changed scope or authority and human-only decisions stop dependent continuation with a durable next action. Product meaning and protected operational decisions retain their owners.

## Out of Scope

Product approval delegation, unattended policy self-modification, new lifecycle stages, a new execution or deployment platform, and a universal numeric conversion for legacy size labels. Delivery implementation and release state remain outside this semantic change.
