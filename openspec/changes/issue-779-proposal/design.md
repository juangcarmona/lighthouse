# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-INSTRUCTION-BUDGETS" digest="sha256:94cbc9c2f8242c4f3ac2507ed575529d696d35cff3bbfa4ca1cb32250e1bb913" -->
<!-- pdac:cite id="QR-DETERMINISTIC" digest="sha256:9fa5f7eb1238a6a7da3e3c95306fb6b83e1bb438b157df3667e1ce8261ae612d" -->

## Context

See proposal.md for motivation. The accepted skill-contracts dependency supplies simulation-only behavioral checks; package files and exports already distribute related modules. The existing Node test glob can enforce budgets without a root script change.

## Goals / Non-Goals

**Goals:** deterministic, offline measurement of four explicit fixed SDLC input selections; actionable failures; clean packed-consumer resolution.

**Non-Goals:** automatic traversal of every documentation link, full model-context fit, token/billing estimates, installed-provider qualification, or instruction reduction. Startup, security, repository and authority guidance remain mandatory and outside the fixed packaged-input fit claim.

## Decisions

- Measure whole selected files as raw bytes without newline normalization, deduplicated within a branch. Report package-relative paths, raw UTF-8 byte length and SHA-256. Whole files conservatively include unselected sections but do not imply their links were consumed. This avoids unstable Markdown section slicing.
- Keep four supported selection definitions in the owning module, independent of the inventory observations. Each selected reference has a trigger/reason. Compare exact sets, not totals alone; changed sources always invalidate recorded identity, even when byte length is unchanged. Automatic recursive traversal was rejected because conditional, external and lookup links are not necessarily consumed.
- Cover direct engineering refinement without triage, with a confirmed estimate at most eight and no decomposition, and scoped implementation with embedded proposal planning. Visual branches add the visual skill, not hypothetical adopter design assets. The audience fallback and source register are selected in all branches. Refinement selects its estimate schema, epic threshold guidance and intake scale; implementation selects continuity and proposal guidance. Ordinary noncompact command output is assumed; compact-output recovery remains a separate conditional input.
- Set initial caps only after measuring final sources: entry, reference and combined caps equal the reviewed baseline, with zero silent-growth allowance. Record the rationale and baseline in the inventory. Future changes must review selections, identities and caps together; the tool never refreshes inventory or raises caps automatically. This is implementation review, not an owner approval or merge authorization.
- Use additive exports and retain all assertions in existing package tests. Extend their isolated actual-tarball consumer to execute the packaged check without workspace module resolution.
- Correction for PR #783: bind complete bytes of every selected entry and transitive source to independently reviewed SHA-256 identities. Conditions can occur anywhere, so paragraph or keyword heuristics cannot qualify selection. Refuse every changed source as `budget.selection-binding` independently of refreshable inventory observations; review selections and exclusions before updating bindings. No new target is automatically read or counted. Existing selected sets and exclusions remain unchanged. The explicit synthetic byte-reader seam checks accounting only and labels reports `synthetic-byte-accounting`; only ordinary packaged-source reads qualify `native-source-selection`.

## Risks / Trade-offs

- Whole-file measurement overcounts unused sections → label method and fixed-input coverage precisely; do not recursively count hypothetical links.
- A maintainer could update observations and caps together → require visible review rationale; source checks do not authenticate review authority.
- Inventory and checker could drift together → independent branch expectations, mutation tests and ordinary-suite script invocation.
- Refreshed inventory hashes could conceal changed source selections → separate whole-source bindings and isolated owning-script fixtures for same-size entry/transitive additions, removal, surrounding condition changes and unchanged-source controls. Every source change requires deliberate selection review, including prose without links; this conservative refusal avoids guessing branch semantics.
- Source byte checks cannot prove agent behavior → retain existing evaluator tests and distinguish simulation from real provider execution. No instructions are removed, so reduction-specific evaluation is not applicable.

## Migration Plan

Ship as a patch with existing SDLC packaging. Consumers resolve the additive exports after normal release/adoption. Rollback removes only the additive capability; existing workflow and provider behavior is unchanged. Host independent checks, forge CI, exact-head owner acceptance and release remain later-stage work.
