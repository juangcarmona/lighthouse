---
id: TERM-AGENT-RUN
type: domain-term
title: Agent run
status: draft
defined-in: BC-FOUNDATION
synonyms: [run]
uses-terms: [TERM-HARNESS, TERM-WORKFLOW-STATE, TERM-AGENT-ROLE]
---

## Definition

An agent run is one bounded execution identified by a run ID, work item, route, role, scope, parent run and evidence outputs.

## Distinguish From

A run is not a chat session, a tracker label or a model provider identity.

## Usage

The orchestrator records run ownership and completion independently from the work item's human-visible tracker state.
