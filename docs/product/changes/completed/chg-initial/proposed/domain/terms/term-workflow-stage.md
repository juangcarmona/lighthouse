---
id: TERM-WORKFLOW-STAGE
type: domain-term
title: Workflow stage
status: draft
defined-in: BC-FOUNDATION
synonyms: []
uses-terms: [TERM-CHANGE-FLOW, TERM-GATE, TERM-GUARDRAIL, TERM-MANAGED-PROJECTION]
---

## Definition

A named part of a change flow with declared inputs, owned outputs, completion evidence and a stop condition.

## Distinguish From

A workflow stage is not an approval by itself and does not transfer authority from the project or its integrations.

## Usage

Backlog, `triage`, `refine`, `propose`, `implement`, `integrate` and `review` are lifecycle stages whose required artifacts, label transitions and verification may vary by profile and risk.
