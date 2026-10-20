---
id: TERM-GATE
type: domain-term
title: Lifecycle gate
status: draft
defined-in: BC-FOUNDATION
synonyms: []
uses-terms: [TERM-WORKFLOW-STAGE, TERM-CHANGE-FLOW, TERM-GUARDRAIL]
---

## Definition

A declared decision boundary at the end of a lifecycle stage where evidence is checked and the next stage may be named without being invoked automatically.

## Distinguish From

A lifecycle gate is not a model response, a green command exit or an approval that belongs to another authority.

## Usage

SDLC package names Ready at the end of `refine`, Planned at the end of `propose` and Done at the end of `implement`; `integrate` enforces Done and `review` records learning.
