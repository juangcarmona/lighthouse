---
id: CHG-WEB-MOBILE-PROFILES-001
type: product-change
title: Define web and mobile application profiles
status: applied
base-revision: '770cbf5'
operations:
  add:
    - FR-APPLICATION-PROFILES-001
  modify:
    - FR-PROFILE-CONTRACT
    - FR-INITIALIZE-FOUNDATION
  remove: []
---

## Problem

The current profile contract covers the existing Node, .NET and visual profiles but cannot describe complete application profiles for web and mobile delivery, their combinations, platform boundaries or consumer proof.

## Intended Product Outcome

Lighthouse defines selectable `react-web-platform`, `web-bff`, `pwa-capability`, `mobile-expo` and `mobile-maui` profiles with explicit prerequisites, composition rules, guardrails, verification and upgrade paths. Blazor hybrid is outside this product change.

## Rationale

A profile should give an adopter a coherent starting point for one application capability while keeping platform-specific decisions visible and avoiding a universal runtime or an accidental full-stack architecture.

## Affected Product Areas

This change extends technical profile selection, application initialization, stack guardrails, consumer fixtures and the relationship between the visual, browser, .NET and application profiles.

## Open Questions

None.

## Product Acceptance

A maintainer can inspect every new profile before selecting it, see its valid combinations and incompatibilities, identify its owned guidance and checks, and run a deterministic consumer fixture for each supported composition. A web fixture proves the first authenticated vertical slice through the BFF and browser evidence. Mobile fixtures prove the selected native authentication and API interaction on the supported platform evidence route.

## Out of Scope

This change does not create a universal component library, add a new runtime package, modify the existing .NET, visual or browser contracts beyond composition metadata, implement a software factory, introduce Blazor hybrid, or select a mobile profile automatically when its platform requirement is absent.
