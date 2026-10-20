---
id: TERM-AGENT-MEMORY
type: domain-term
title: Agent memory
status: draft
defined-in: BC-FOUNDATION
synonyms: [memory record]
uses-terms: [TERM-HARNESS, TERM-AGENT-RUN, TERM-WORKFLOW-STATE]
---

## Definition

Agent memory is a typed, scoped record that carries verified context, decisions, assumptions, handoffs or lessons between bounded agent runs.

## Distinguish From

Memory is not an unbounded transcript, a replacement for ProductShape or ArcShape, or a permission to extend a run beyond its declared scope.

## Usage

Lighthouse separates run memory, project memory and optional shared memory so each record has an owner, retention rule and review path.
