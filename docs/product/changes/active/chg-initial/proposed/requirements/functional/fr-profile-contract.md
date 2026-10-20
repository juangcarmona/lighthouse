---
id: FR-PROFILE-CONTRACT
type: functional-requirement
title: Expose bounded technical profiles
status: draft
derived-from: [UC-ADOPT-PROFILE]
verification:
  - scenario: An adopter can inspect a profile's prerequisites, owned surfaces, checks, failure consequence and exception path before enabling it.
uses-terms: [TERM-PROFILE, TERM-GUARDRAIL]
---

## Requirement

Each Lighthouse technical profile MUST declare its purpose, prerequisites, owned content, verification commands, failure consequence and exception route. The initial profile set MAY include the independent UI package and a .NET backend profile. The UI package MUST provide tokens, native recipes, `DESIGN.md`, the initialization-created soft skill and any deterministic hard verifier supported by the selected stack. Framework composition MUST NOT add a runtime component library or be inferred from the repository layout.

## Rationale

Profiles keep the foundation useful across stacks without turning every recommendation into a
universal project requirement.
