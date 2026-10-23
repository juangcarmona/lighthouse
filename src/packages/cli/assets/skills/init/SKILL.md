---
name: lighthouse-init
description: Turn a natural-language project request into a reviewable Lighthouse initialization plan.
---

# Lighthouse semantic initialization

Use this skill when an adopter describes a project in product terms and wants Lighthouse to prepare its foundation.

## Inputs

1. Read the installed profile catalog and the repository's current Lighthouse manifest when one exists.
2. Treat a reference project as optional. If the adopter names one, record its location and purpose; do not assume it exists or copy it.
3. Ask only the questions needed to resolve the application shape, stacks, profiles and material profile combinations. Keep unresolved questions in the plan instead of guessing.

## Plan

Write a JSON plan that validates against `assets/schemas/init-plan.schema.json` with `schemaVersion: 1`, `product`, `intent`, `application`, `profiles`, optional `reference` metadata and `openQuestions`.

Select profiles from the installed catalog. Do not invent a profile, make a stack mandatory, or turn a reference into a requirement. An absent reference is represented by an omitted `reference` field or `{"kind":"none"}`.

## Apply

Review the generated plan with the adopter, then run `lighthouse init --plan-file <path>` for a dry run. Use `--format json` for agent consumption. Apply only after the adopter explicitly authorizes `lighthouse init --plan-file <path> --apply`.

The CLI owns deterministic validation, profile compatibility, conflict detection and local writes. It does not inspect or copy the reference and it performs no remote writes. A plan with `openQuestions` is not ready to apply.

Use `lighthouse aliases --format json` to discover the installed `/lh:*` aliases and their canonical `/lighthouse:*` commands. The generated `.lighthouse/commands.json` is the host-readable projection; aliases reference the package-owned command or skill asset and never create a second implementation.

After applying, run `lighthouse verify` and report the created, preserved and conflicting paths. Keep product and architecture work in ProductShape and ArcShape's own routes.
