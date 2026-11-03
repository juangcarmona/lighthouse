# Design

<!-- pdac-scope: cited -->

## Context

See `proposal.md` for purpose and write scope. The owner supplied the complete fixture content and requested docs-only provider metadata. Existing repository checks already cover Markdown and document links.

## Goals / Non-Goals

**Goals:** Produce a minimal reviewable candidate with accurate implementation evidence and no unrelated changes.

**Non-Goals:** Change runtime behavior, add a verification mechanism, alter canonical models, or perform the later same-PR revalidation. No interfaces, data effects, dependencies or migrations are introduced.

## Decisions

- Write the fixture as a plain Markdown heading, blank line and exact paragraph, ending with a newline. Do not add metadata or explanatory prose to that document because its literal contents are the acceptance fixture.
- Use `.openspec.yaml` with `skip_specs: true` instead of inventing requirements for a documentation-only change. Include the provider-required `schema: spec-driven` metadata so strict validation recognizes the marker. Keep a design document because the issue explicitly requires one.
- Bind each planning document to FR-CHANGE-EVIDENCE using the provider-generated citation. Store receipts, an exact-content/scope report and a retrospective outside the candidate under `/output/evidence/`. Existing repository checks plus a focused content assertion are sufficient; a permanent test file would exceed the requested deliverables.

<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

## Risks / Trade-offs

- [A disposable fixture could be mistaken for product functionality] → Keep its purpose and no-merge boundary explicit in the plan and report.
- [Later revalidation could accidentally mutate the candidate] → Leave that acceptance step to the subsequent owner request and trusted host; do not claim its PR/head identity checks here.

## Verification and Rollback

Run the configured dependency install, repository verification and strict OpenSpec validation, then verify ProductShape citations and exact fixture content/write scope. Screenshots and visual acceptance are not applicable because no rendered interface changes. Removal of only these new files reverses the change; no deployment or data migration is involved.
