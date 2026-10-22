---
id: CHG-UI-PROFILE-001
type: product-change
title: Make the visual theme profile adoptable
status: proposed
base-revision: '43fffabbb322a8d9d446af8d64ebc543d52f59ad'
operations:
  add:
    - FR-VISUAL-PROFILE-ADOPTION
  modify: []
  remove: []
---

## Problem

The product defines a UI package and a visual profile, but it does not state the minimum adoptable surface that connects the package to initialization and verification.

## Intended Product Outcome

The `visual-theme` profile is an inspectable, framework-neutral adoption capability. It uses the Lighthouse UI package as the source of its tokens, recipes and `DESIGN.md`, projects the guide and agent skill into the adopter, and provides a deterministic verifier for the selected visual contract.

## Rationale

The profile needs one small contract before implementation can connect package ownership, adopter files and verification without introducing a runtime component library or framework-specific templates.

## Affected Product Areas

The visual profile, UI package distribution, profile initialization, adopter guidance and foundation verification.

## Open Questions

None.

## Product Acceptance

The accepted definition lets an adopter select `visual-theme`, inspect its package, projected files and checks before adoption, preserve existing or foreign-owned files during brownfield adoption, use the package's `DESIGN.md` and agent skill, run the deterministic verifier, and receive an actionable result when the profile is missing, drifted, unavailable or valid.

The profile remains framework-neutral and does not install a runtime component library, infer framework composition from repository layout or replace product-owned visual code.

## Out of Scope

This change does not add framework-specific templates, runtime components, new visual tokens, product branding, a browser test runner or a new package. It does not change the general profile contract, the public-site route, ProductShape or ArcShape ownership, or the existing Lighthouse repository baseline.
