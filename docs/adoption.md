# Adoption guide

For a new backend, use the [.NET profile creator](profiles/dotnet/adoption.md#new-backend). For an existing backend, follow [the assessment route](profiles/dotnet/adoption.md#existing-backend). For a web interface, use [design adoption](design/adoption.md).

## New repository

1. Choose the stack and only the evidenced profiles it needs.
2. Add the pinned Lighthouse CLI and a `lighthouse.json` manifest.
3. Run `lighthouse init`, inspect the generated `LIGHTHOUSE.md`, then run `lighthouse verify`.
4. Add ProductShape and ArcShape through their own supported adoption routes when the project needs those authorities.
5. Add the selected profile checks to the project's verification command and CI workflow.
6. Record project-specific exceptions in the project documentation.

## Existing repository

1. Inventory current conventions, tools, managed files and CI before changing anything.
2. Map current files to Lighthouse rules and identify collisions. Do not overwrite existing guidance or generated outputs.
3. Adopt the manifest and verifier first. Use a reviewed migration to reconcile a collision; keep product-owned rules in product-owned files.
4. Turn on one profile at a time. Run its local checks and compare CI duration, flakiness and failures before making a gate required.
5. Add ProductShape and ArcShape through their supported adoption routes when the project does not yet have those authorities.
6. Record exceptions with owner and review date, then remove them when the product is ready.

## Current CLI slice

The local verifier supports the current baseline manifest identifiers. `lighthouse init` creates `LIGHTHOUSE.md` if absent and refuses to overwrite it. `lighthouse verify` checks manifest structure, exact version pins and generated content. The baseline CLI does not execute lifecycle stages, tracker operations, agent runs or CodeGraph checks. It records selected capabilities, not successful execution of their checks.

To update the projection, review the manifest change, preserve any accidental local edits in product-owned guidance, remove only the known generated `LIGHTHOUSE.md`, run the pinned `init` command and inspect the result. Source upgrades and package updates are manual and reviewed. The creator seeds a snapshot whose source/tests/tooling become product-owned; the theme is a pinned local package. No remote fetch or automatic product overwrite occurs.
