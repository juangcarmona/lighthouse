---
id: CON-PROJECT-OWNERSHIP
type: constraint
title: Adopting projects retain ownership of product code
status: draft
applies-to: [BC-FOUNDATION, JRN-ADOPT-AND-DELIVER]
uses-terms: [TERM-FOUNDATION, TERM-MANAGED-PROJECTION]
---

## Constraint

An adopting project MUST own its application code, product decisions, project-specific architecture
and local exceptions. Lighthouse may manage only the files declared by its installation contract.

## Rationale

The foundation must improve several projects without turning their codebases into generated output.

## Consequences

Initialization and upgrades require explicit ownership metadata, drift checks and a safe path for
project-specific changes.
