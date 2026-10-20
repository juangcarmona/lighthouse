---
id: BR-HOTFIX
type: business-rule
title: Hotfixes stay expedited and controlled
status: draft
applies-to: [BC-FOUNDATION, UC-RUN-HOTFIX]
uses-terms: [TERM-HOTFIX-ROUTE, TERM-TRIAGE, TERM-GATE, TERM-LABEL-STATE]
---

## Rule

The hotfix route MUST require a confirmed defect, bounded scope, impact or containment context, verification evidence and an explicit integration decision. It MAY omit a full feature proposal when the defect and correction are already understood.

## Rationale

An expedited path is useful for defects, but speed must not make the result untraceable or unreviewable.

## Examples

A failing production validation rule can move from triage to a focused implementation and verification pull request while the issue records the rollback plan.

## Exceptions

None. A missing defect confirmation or verification result selects the normal route or stops the change.
