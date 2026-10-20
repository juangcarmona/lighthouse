---
id: UC-INITIALIZE-PROJECT
type: use-case
title: Initialize a project from the Lighthouse foundation
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-AGENT-HOST]
bounded-context: BC-FOUNDATION
governed-by: [BR-OWNED-AUTHORITY, BR-HUMAN-AUTHORITY, BR-CODEGRAPH-EXTERNAL]
uses-terms: [TERM-FOUNDATION, TERM-PROFILE, TERM-ADOPTION, TERM-AUTHORITY-MAP, TERM-CODEGRAPH-SERVICE]
---

## Goal

Start a project with a coherent Lighthouse baseline and an explicit profile selection.

## Trigger

An adopter creates a new project or asks Lighthouse to prepare an empty target.

## Preconditions

The target is new or empty enough for the selected initializer, and the adopter has selected the project stack and required profiles.

## Main Flow

1. The adopter selects the foundation and profiles.
2. Lighthouse installs the selected harness, SDLC and UI package assets, recording their versions and managed paths.
3. Lighthouse writes the starter structure, manifest, guidance, the visual design skill and the supported hard token verifier.
4. Lighthouse initializes or reconciles the ProductShape and ArcShape authority integrations through their owned routes.
5. Lighthouse checks the configured external CodeGraph MCP service, its current git-root binding and the canonical repository and active worktrees.
6. Lighthouse reports the files and commands it created, preserved or could not apply, including any CodeGraph adoption gap.
7. The adopter runs verification and reviews the resulting project boundary.

## Alternative Flows

An existing project may use the adoption route, which assesses the target before changing it and leaves incompatible or project-owned content for explicit review.

## Failure Conditions

An unsupported stack, conflicting file, failed prerequisite or failed verification stops the route with an actionable report.

## Postconditions

The project has a recorded foundation selection and enough evidence to continue with its own product and architecture decisions.
