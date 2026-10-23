---
title: Quality requirements
arc42-section: "10"
description: Architectural realization and evidence for Lighthouse quality requirements.
---

# 10. Quality requirements

## Quality requirements overview

| ProductShape requirement | Architectural realization | Evidence or gap |
| --- | --- | --- |
| Adoptability | Init plans, semantic plans, managed paths and actionable verification | `src/tests/lighthouse.test.mjs` covers greenfield, brownfield, semantic and profile routes |
| Independent authority boundaries | Provider-owned validators, exact recorded versions and conflict-stopping writes | Authority adoption tests preserve provider files; product model status remains `draft` |
| Deterministic verification | Catalog-driven checks with explicit status, evidence and next action | 63 Node tests pass; `lighthouse verify --format json` is the machine-readable route |
| Low coupling | Package `files`, `exports`, manifest scopes and upgrade hashes | Consumer fixture checks package boundaries and customized projections |
| Reproducible distribution | Locked dependencies, package manifests and static-site verification | `npm run verify:public-site` builds ProductShape and ArcShape snapshots |
| Traceable guardrails | Catalog entries name owner, level, kind, method and repair hint | Guardrail and profile catalog validators fail closed on malformed entries |
| Capability adoption safety | Dry-run plans, plan-hash authorization, reread, idempotency and evidence | Packaged consumer test covers conflict, stale state, partial failure, resume and drift |
| Full application topology | .NET profile and Aspire example provide reference source | CLI does not yet generate Aspire topology or run CodeGraph; treat this as a target gap |

<!-- pdac:cite id="QR-ADOPTABILITY" digest="sha256:97827599b046672b59f27be39008c158d043d8c11a8f54cf9dd9b1478b1d6e55" -->
<!-- pdac:cite id="QR-LOW-COUPLING" digest="sha256:6892a1030f2bbc6d41c16ae1199b557028e3ed98b8bb392af9a38cd7fda413b8" -->
<!-- pdac:cite id="QR-TRACEABILITY" digest="sha256:a9f6e6ff0b72345022504a0bff1f037e52232f78a90311d28c35eb3568f95500" -->
<!-- pdac:cite id="QR-REPRODUCIBLE-DISTRIBUTION" digest="sha256:ac9c5b33405da493ab5cb1e65477b9be6c76b05ab59a71dd0fa384f30c7a13db" -->
