---
id: FR-PROFILE-CONTRACT
type: functional-requirement
title: Expose bounded technical profiles
status: draft
derived-from: [UC-ADOPT-PROFILE]
verification:
  - scenario: An adopter can inspect a profile's purpose, prerequisites, dependencies, owned surfaces, stacks, libraries, structure, commands, guardrails, checks, failure consequence, repair hints, exceptions, incompatibilities, valid combinations, consumer fixture and upgrade strategy before enabling it.
uses-terms: [TERM-PROFILE, TERM-GUARDRAIL]
---

## Requirement

Each Lighthouse technical profile MUST declare its purpose, prerequisites, dependencies, owned content, stacks, libraries, generated structure, commands, guardrails, verification commands, failure consequence, repair hints, exception route, incompatibilities, valid combinations, consumer fixture and upgrade strategy.

Each declared guardrail MUST expose an independent `level` of `required`, `recommended` or `optional`, and a `kind` of `hard` or `soft`. The level determines whether the result can satisfy the profile; the kind describes the nature of the engineering expectation and MUST NOT determine the verification method.

Each guardrail MUST declare whether its evidence is deterministic, semantic or human, and the profile MUST expose the next action when the evidence is failed, unavailable, unconfigured or pending review.

The profile contract MUST allow a profile to depend on another profile and MUST reject a declared incompatible combination before initialization writes files. A profile MAY contribute guidance, generated files, tools, fixtures or checks, but it MUST declare which surfaces it owns and MUST preserve project-owned and provider-owned content.

The initialization baseline MUST provide a predictable repository structure with `src/`, `docs/` and the conventional automation and integration surfaces. Aspire MUST be present as the application composition and execution boundary, including when the selected application has only a frontend. Lighthouse MUST NOT create a Lighthouse-owned backend when the adopter has not selected one.

When an adopter selects a Lighthouse-owned backend, the default full-stack profile MUST provide a feature-aligned modular monolith with an explicitly architected frontend, bounded contexts and a traceable feature-to-backend mapping. The profile MUST provide the established test progression of red-green unit development followed by integration and other applicable test layers, and end-to-end evidence catalogued by bounded context. NSubstitute MUST be the default .NET test double library where the .NET profile applies.

A microservice request MUST select a service profile rather than silently receiving the modular-monolith backend. Other stacks MUST select profiles that declare their own conventions and checks. Existing repositories MAY provide implementation evidence and agent-readable examples, but the product MUST describe the practices without embedding private repository identities or source provenance.

The initial profile set MAY include the independent UI package, the full-stack modular application profile, a microservice profile, stack-specific profiles and the bounded web and mobile application profiles. The UI package MUST provide tokens, native recipes, `DESIGN.md`, the initialization-created soft skill and any deterministic hard verifier supported by the selected stack. Framework composition MUST NOT add a runtime component library or be inferred from the repository layout.

## Rationale

Profiles keep the foundation useful across stacks while making the existing guardrails inspectable and extensible without turning every recommendation into a universal project requirement.
