---
title: Crosscutting concepts
arc42-section: "08"
description: Ownership, projection, catalog, verification and adoption mechanisms shared by Lighthouse blocks.
---

# 8. Crosscutting concepts

## Authority ownership

ProductShape owns product intent, ArcShape owns architecture documentation and OpenSpec owns change artifacts.

Lighthouse owns its initializer, package contracts, repository checks and adopter projections.

The SDLC package owns lifecycle skills, commands, meta-commands, routes and gates. The CLI records its selected version and host adapters in `.lighthouse/sdlc.json`; the file is configuration and evidence, not agent runtime state.

<!-- pdac:cite id="BR-OWNED-AUTHORITY" digest="sha256:927ca94ef20deb83a84734978c82c5647cd1cd41eeaed9935eda7f4a6c61f611" -->

## Profile and guardrail catalogs

Initialization resolves the baseline plus compatible profiles from the declared application shape and stacks. The CLI publishes profile and guardrail catalogs as data and exposes the same composition through `lighthouse profiles` and machine-readable verification output.

Profiles declare prerequisites, owned content, examples, verification commands, failure consequences and exception routes.

Profile verification layers are applicability metadata and do not make every test layer mandatory. Each layer carries its own level, kind and evidence method so a project can distinguish required deterministic checks from recommended semantic or human review.

## Soft and hard guardrails

Soft guardrails are skills, guides, `DESIGN.md` templates and examples that explain the expected practice.

Hard guardrails are deterministic linters, analyzers, hooks, tests or CI checks that can verify the practice.

An unsupported or non-deterministic check remains visible as an adoption gap instead of being reported as compliant.

The CLI package records these existing guardrails as data in its packaged catalog, including profile applicability, independent level and kind, verification method, evidence status and repair hint. The verifier reads catalog entries and preserves the default human-readable result while exposing the same result as JSON; adding a catalog entry does not require changing the CLI core.

## Capability adoption

The SDLC package publishes a versioned capability catalog. Every catalog entry names a registered adapter; package verification fails closed when a new entry has no adapter, so a future capability cannot become discoverable without an executable adoption route and its consumer fixture.

Capability adoption is dry-run first. The CLI reads provider state to build a deterministic plan, requires an explicit plan hash for external writes, applies only allowed operations, re-reads before writing, verifies the final state and records desired, observed, target and operation evidence under `.lighthouse/reconciliation/`.

The current adapter supports GitHub labels. It creates missing labels and preserves existing values; ambiguous equivalents, destructive operations, provider drift and partial failures stop or remain resumable. The provider remains the source of truth and no provider write occurs during package installation or ordinary upgrade discovery.

## Managed projections and safe mutation

`LIGHTHOUSE.md`, `.lighthouse/sdlc.json` and selected profile files are generated from the manifest and installed package assets. `.lighthouse/upgrade.json` records hashes and scope ownership for upgrade planning.

Init, reconcile and upgrade refuse to overwrite an occupied path. Capability apply rereads provider state, requires the authorized plan hash and records partial or completed operations for verification and recovery.

## Evidence states

The verifier uses explicit statuses for deterministic, semantic and human checks. A pending review or unavailable checker is visible and does not satisfy a required guardrail.

The SDLC package also exposes a neutral evidence record contract. A record carries a run, producer, scope, status, payload, optional subject, authority references and artifact hashes. Stage results and browser journeys are adapted without replacing their source contracts.

An evidence index is a deterministic projection over records. It can relate ProductShape requirements and ArcShape decisions to observed, verified, incomplete, conflicting or missing evidence, but it does not mutate either authority or assign a quality score. Lighthouse reports an incomplete index as a recommended finding by default; a future profile may choose a stricter policy.

Evidence records and indexes are adopter-owned files under `.lighthouse/evidence/`. Large reports remain owned by their producer and are referenced by relative path and hash. This keeps the contract portable and leaves future quality evaluation outside Lighthouse.

<!-- pdac:cite id="UC-VERIFY-FOUNDATION" digest="sha256:353ac93b2889f277883d867ae98be244fbf8a00e8bc0bba5a6b2d594eaa21d11" -->

## Visual contract

The UI package provides semantic tokens, native recipes and `DESIGN.md`; initialization can project a soft visual skill and a deterministic token verifier when the selected stack supports them.

## Current repository and target application

| Concern | Current Lighthouse repository | Target initialized application |
| --- | --- | --- |
| Source boundary | `src/packages/`, `src/dotnet/`, `src/gallery/` and `src/public-site/` | Product-owned `src/` with selected profiles and application code |
| Documentation authority | ProductShape and ArcShape sources in `docs/` | The adopter's initialized ProductShape and ArcShape routes |
| Composition | No hosted Lighthouse runtime; .NET profile contains a reference AppHost | Aspire AppHost is a product-defined adopter boundary that the current CLI does not generate |
| Verification | npm, .NET, link, visual and site checks | Profile checks plus project-owned unit, integration and end-to-end evidence |
| SDLC contract | `src/packages/sdlc/` and `.lighthouse/sdlc.json` projection | Selected package contract and host-specific adapters |
| Public explanation | Generated landing, ProductShape snapshot and ArcShape snapshot | Optional adopter documentation and package-owned guidance |

## Execution, evidence and authority

Three independent checks govern proposed host execution: the host validates operational authority, Lighthouse validates stage completion, and the publisher validates each external effect. A lease is not gate approval. A valid JSON result is not completion. A CI pass is not merge authorization. The publisher binds every write to the current source revision, policy and lease, then records an idempotent receipt.

The initial adapter should grant the engine local workspace capabilities and model access only. Branch publication, issue edits and integration use narrowly scoped publisher credentials. Enforcement loads validators and policy from a pinned trusted installation outside the agent-writable checkout; edits to repository dependencies or workflow files cannot replace the validator for the active run. The adapter must demonstrate its own isolation, cancellation and egress controls; naming gh-aw in a workflow does not preserve gh-aw's controls after replacing its engine path.

<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->
