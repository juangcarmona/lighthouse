---
id: TERM-WORKFLOW-STATE
type: domain-term
title: Workflow execution state
status: draft
defined-in: BC-FOUNDATION
synonyms: [run state]
uses-terms: [TERM-AGENT-RUN, TERM-GATE, TERM-LABEL-STATE]
---

## Definition

Workflow execution state is the finite state-machine record for a Lighthouse run, including its current state, legal transition, evidence and next decision.

## Distinguish From

Execution state is not the same as a GitHub label, a free-form issue status or the mutable context held by an agent process.

## Usage

The state machine accepts explicit events, rejects illegal transitions and derives a report that can be rebuilt from its event history.
