---
id: UC-INITIALIZE-PROJECT
type: use-case
title: Initialize a project from the Lighthouse foundation
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-AGENT-HOST]
bounded-context: BC-FOUNDATION
governed-by: [BR-OWNED-AUTHORITY, BR-HUMAN-AUTHORITY, BR-CODEGRAPH-EXTERNAL, BR-FAIL-CLOSED]
uses-terms: [TERM-FOUNDATION, TERM-PROFILE, TERM-ADOPTION, TERM-AUTHORITY-MAP, TERM-CODEGRAPH-SERVICE, TERM-GUARDRAIL, TERM-MANAGED-PROJECTION, TERM-INITIALIZATION-PLAN]
---

## Goal

Start a project with a coherent Lighthouse baseline, explicit profiles and a reviewable adoption plan.

## Trigger

An adopter creates a new project or asks Lighthouse to prepare an existing target.

## Preconditions

The target is new or can be assessed without overwriting project-owned content, and the adopter has either selected the project shape and required profiles or supplied a plan with those choices resolved.

## Main Flow

1. The adopter identifies the application shape, selected stacks and whether Lighthouse owns a backend, a service or only the frontend, either directly or through the initialization skill.
2. When the request is semantic, the agent optionally records a reference project, asks the unanswered questions needed to resolve the selection and writes a versioned initialization plan. A missing reference is valid and does not block the route.
3. Lighthouse validates the plan, profiles and resolved questions, then plans the baseline, profiles, repository conventions and public-site route. Greenfield initialization enables the public site by default; brownfield initialization reports the route and any conflicts before writing.
4. Lighthouse installs the selected harness, SDLC and UI package assets and records their versions and managed paths.
5. Lighthouse writes the starter structure, manifest, profile guidance, agent-readable examples, visual design guidance and supported hard verifiers.
6. Lighthouse initializes or reconciles the ProductShape and ArcShape authority integrations through their owned routes.
7. Lighthouse installs or verifies the selected local guardrails and their CI equivalents, including Conventional Commits and the configured branch convention when GitHub delivery is selected.
8. Lighthouse checks the configured external CodeGraph MCP service, its current git-root binding and the canonical repository and active worktrees.
9. Lighthouse reports the files and commands it created, preserved or could not apply, including authority and CodeGraph adoption gaps.
10. The adopter runs verification and reviews the resulting project boundary before continuing with product, architecture or delivery work.

## Alternative Flows

An existing project may use the adoption route, which assesses the target first and leaves incompatible or project-owned content for explicit review. A project with the public site enabled cannot publish a new site until both ProductShape and ArcShape provide valid inputs.

## Failure Conditions

An unsupported stack, conflicting file, failed prerequisite, invalid authority, failed guardrail or failed verification stops the route with an actionable report and the next command or owner decision needed to continue.

## Postconditions

The project has a recorded foundation selection, predictable repository boundaries, visible ownership for generated content and enough evidence to continue with its own product and architecture decisions.
