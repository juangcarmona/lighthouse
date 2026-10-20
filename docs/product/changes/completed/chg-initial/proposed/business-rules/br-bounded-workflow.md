---
id: BR-BOUNDED-WORKFLOW
type: business-rule
title: Each workflow stage has a bounded contract
status: draft
applies-to: [BC-FOUNDATION, UC-IMPLEMENT-CHANGE]
uses-terms: [TERM-CHANGE-FLOW, TERM-WORKFLOW-STAGE, TERM-GUARDRAIL]
---

## Rule

Every workflow stage MUST declare its inputs, owned outputs, permitted tools, completion evidence and stop conditions. A stage MUST stop when a required prerequisite or check fails and MUST NOT extend the change scope silently.

## Rationale

Bounded stages let an agent do useful work without turning a short change into an unreviewable autonomous run.

## Examples

A review stage can write a finding report but cannot edit the implementation. An implementation slice can change only its declared paths and must leave its test and verification result visible.

## Exceptions

An adopting project may combine stages for a bounded low-risk route when its policy records the combined inputs, outputs, checks and human decision boundary.
