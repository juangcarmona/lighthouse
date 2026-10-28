---
id: FR-HOTFIX-ROUTE
type: functional-requirement
title: Provide a controlled hotfix route
status: draft
derived-from: [UC-RUN-HOTFIX, BR-HOTFIX]
verification:
  - scenario: A confirmed defect can move through triage, bounded implementation, focused verification, integration and review without producing a full feature proposal, while every required label and evidence check remains visible.
uses-terms: [TERM-HOTFIX-ROUTE, TERM-TRIAGE, TERM-GATE, TERM-LABEL-STATE]
---

## Requirement

Lighthouse MUST provide a hotfix route for confirmed isolated defects that preserves impact, root-cause evidence, scope, rollback context and separate integration authority. It MUST demonstrate a regression assertion failing for the reported behavioral reason before the production correction and passing afterward, run relevant neighboring and required checks, and obtain independent read-only verification through a separate execution using a different configured model.

Unattended hotfix admission MUST limit the complete candidate to at most 100 added plus deleted production-code lines, 10 changed files including tests and two repository-defined modules. Regression-test lines are excluded only from the production-code line limit. Uncertain classification, unassessed generated or binary changes, scope growth or unavailable proof MUST stop unattended delivery rather than hide affected work. The host MUST evaluate planned and actual scope against the authorized starting revision.

A compact correction plan MAY replace a full feature proposal when the defect and correction are understood. Bounded repairs MUST preserve meaningful regression assertions and require fresh verification after relevant changes. Successful independent verification MAY continue to integration only under current explicit bounded merge delegation and current hosting requirements. Release, deployment and rollback retain their separate authorization and observed evidence. New product meaning or unresolved architecture decisions MUST leave the unattended hotfix path.

## Rationale

Defect correction often needs speed, but an expedited route still needs traceable ownership, evidence and rollback context.
