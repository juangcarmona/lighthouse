---
id: FR-CHANGE-OVERVIEW
type: functional-requirement
title: Produce a human-readable change overview
status: draft
derived-from: [UC-RUN-SDLC, BR-AUTHORITY-BOUNDARIES]
verification:
  - scenario: A proposed change contains a concise overview that explains the problem, outcome, scope, approach, authorities, risks, evidence and next decision, and a human can review it without reading the entire artifact set first.
uses-terms: [TERM-CHANGE-OVERVIEW, TERM-AUTHORITY-MAP, TERM-GATE]
---

## Requirement

The `propose` stage MUST produce a `change-overview` artifact for human review. Its prose MUST use the Humanizer skill and repository human-facing writing policy, and its facts, links, commands, frontmatter and code MUST remain exact.

## Rationale

A short explanation gives a person the shape of the change before they inspect the detailed proposal, design, tasks and specifications.
