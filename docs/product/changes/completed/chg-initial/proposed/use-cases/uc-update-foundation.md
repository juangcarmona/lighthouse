---
id: UC-UPDATE-FOUNDATION
type: use-case
title: Update an adopted foundation
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-OWNED-AUTHORITY, BR-FAIL-CLOSED, BR-HUMAN-AUTHORITY]
uses-terms: [TERM-ADOPTION, TERM-MANAGED-PROJECTION, TERM-INTEGRATION]
---

## Goal

Bring an adopted project to a newer Lighthouse or integration contract without losing project-owned
work or hiding drift.

## Trigger

The adopter selects an available foundation or integration update.

## Preconditions

The current manifest and ownership metadata are readable, and the updater can prove which files it
may change.

## Main Flow

1. Lighthouse compares the current contract and managed projections with the selected update.
2. It reports planned additions, changes, removals, conflicts and preserved files.
3. The adopter reviews the diff and confirms the update through the project's normal change route.
4. Lighthouse applies only owned content and runs verification.

## Alternative Flows

An update may be dry-run only, or the adopter may defer an integration while keeping its current
version and recording the reason.

## Failure Conditions

Ownership is no longer provable, a project-owned file was edited inside a managed boundary or the
updated checks fail.

## Postconditions

The project records the resulting version, projection state and verification evidence, or remains
unchanged with the conflict reported.
