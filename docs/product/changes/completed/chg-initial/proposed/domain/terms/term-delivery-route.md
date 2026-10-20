---
id: TERM-DELIVERY-ROUTE
type: domain-term
title: Delivery route
status: draft
defined-in: BC-FOUNDATION
synonyms: [workflow mode]
uses-terms: [TERM-HARNESS, TERM-CHANGE-FLOW, TERM-WORKFLOW-STAGE, TERM-GATE, TERM-TRIAGE, TERM-LABEL-STATE]
---

## Definition

A named composition of SDLC stages, tool contracts, gate policy and decision ownership for a particular way of delivering a change.

## Distinguish From

A delivery route is not a new lifecycle stage and cannot weaken a stage gate or change an authority boundary.

## Usage

Lighthouse supports supervised, plan-only, bounded unattended, hotfix and stacked delivery routes; projects may add a route only when its composition, labels and limits are explicit.
