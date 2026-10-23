---
id: CHG-AUTHORITY-ADOPTION-001
type: product-change
title: Adopt existing product and architecture authorities safely
status: applied
base-revision: '058d8d9'
operations:
  add:
    - FR-AUTHORITY-ADOPTION
  modify:
    - UC-INITIALIZE-AUTHORITIES
    - FR-VERIFY-FOUNDATION
  remove: []
---

## Problem

An existing repository can already contain ProductShape and ArcShape documentation, but Lighthouse only offers an initializer designed for an empty target. Running that route can report provider conflicts, while the adopter has no Lighthouse command that discovers, validates and records the existing authorities without rewriting them.

## Intended Product Outcome

Lighthouse provides an explicit brownfield authority-adoption route. The route discovers the canonical ProductShape and ArcShape surfaces, runs each provider's read-only validator, reports whether each authority is absent, ready, adopted, drifted, invalid or unavailable, and produces a human-readable or JSON plan by default.

An explicit apply records the installed provider versions in `lighthouse.json` and refreshes the Lighthouse projection only when both authorities are valid. It never runs a provider initializer, writes provider-owned files or performs a remote operation. Repeating the route is idempotent, and `lighthouse verify` revalidates recorded authorities and reports the exact adoption command when the record is missing or stale.

## Rationale

Brownfield adoption needs a path that proves an existing authority is usable before Lighthouse records it. Separating discovery and validation from initialization preserves provider ownership and keeps remote writes outside the harness's implicit lifecycle.

## Affected Product Areas

Authority initialization and adoption, integration boundaries, managed projections, foundation verification and consuming-repository evidence.

## Open Questions

None.

## Product Acceptance

The accepted definition distinguishes greenfield authority initialization from brownfield authority adoption and requires the adoption route to use provider validators in read-only mode.

The accepted definition requires a dry-run plan with one result per authority, the provider version, the inspected path, the validator command, the observed status, the next action and the explicit apply command. A missing or invalid authority blocks apply without changing the manifest or provider files.

The accepted definition allows apply only after both authorities validate and the Lighthouse projection is ready. Apply records exact versions in Lighthouse-owned configuration, leaves ProductShape and ArcShape files byte-identical, and is safe to repeat.

The accepted definition requires `lighthouse verify` to revalidate every recorded authority, distinguish an absent, invalid, unavailable or version-drifted authority from a passing one, and report `lighthouse authorities --adopt-existing` as the next action when adoption is incomplete.

## Out of Scope

This change does not change ProductShape or ArcShape validators, move provider-owned files, infer mappings between documentation layouts, add remote writes, redesign the authority map or add new integrations. It does not replace the existing greenfield `lighthouse authorities` route.
