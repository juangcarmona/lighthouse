---
id: FR-VISUAL-PROFILE-ADOPTION
type: functional-requirement
title: Adopt the framework-neutral visual theme profile
status: draft
derived-from: [UC-ADOPT-PROFILE, UC-INITIALIZE-PROJECT]
verification:
  - scenario: A selected visual-theme profile exposes its UI package version, owned surfaces, projected guide, agent skill and deterministic verifier before adoption.
  - scenario: A greenfield or brownfield adoption preserves existing project-owned visual files, reports conflicts and verifies the selected visual contract after an explicit application.
uses-terms: [TERM-PROFILE, TERM-ADOPTION, TERM-GUARDRAIL, TERM-MANAGED-PROJECTION]
---

## Requirement

The `visual-theme` profile MUST use the Lighthouse UI package as the source of its semantic tokens, native recipes and `DESIGN.md`.

The profile MUST declare its exact package version, projected adopter surfaces, agent skill, deterministic verifier, prerequisites and failure hints before adoption.

Initialization MUST project the profile's `DESIGN.md` and agent skill only into free or profile-owned paths, and MUST report existing or foreign-owned files as conflicts without overwriting them.

The deterministic verifier MUST distinguish a valid profile, missing profile surfaces, drifted managed content and unavailable or unconfigured checks, and MUST report the next repair action.

The profile MUST remain framework-neutral and MUST NOT install a runtime component library or infer framework composition from repository layout.

## Rationale

This contract connects the existing UI package to the profile adoption and verification routes while keeping visual behavior and application components owned by the adopter.
