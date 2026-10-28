---
id: BR-HOTFIX
type: business-rule
title: Hotfixes stay expedited and controlled
status: draft
applies-to: [BC-FOUNDATION, UC-RUN-HOTFIX]
uses-terms: [TERM-HOTFIX-ROUTE, TERM-TRIAGE, TERM-GATE, TERM-LABEL-STATE]
---

## Rule

The hotfix route MUST require a confirmed defect, root-cause evidence, bounded scope, impact or containment context, regression proof, rollback context and an explicit integration decision. It MAY omit a full feature proposal when the defect and correction are already understood. Unattended execution requires declared finite execution and correction limits, an independently verified current candidate and separate current merge delegation. A small patch or urgency MUST NOT grant authority or establish low risk.

Regression proof MUST distinguish the reported assertion failure from environment or compilation failure and preserve the same meaningful behavior through the repair. Missing reproduction, product ambiguity, scope overflow, changed authority or exhausted corrections MUST stop dependent advancement with a named next decision.

## Rationale

An expedited path is useful for defects, but speed must not make the result untraceable or unreviewable.

## Examples

A failing production validation rule can move from triage to a focused implementation and verification pull request while the issue records the rollback plan.

## Exceptions

None. A missing defect confirmation or verification result selects the normal route or stops the change.
