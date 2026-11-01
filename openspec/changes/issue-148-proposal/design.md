# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation. The adapter forwards `config.model` to `ENGINE_MODEL`. OpenCode 2.1.0's installed `run --help` documents `provider/model#variant`; reasoning can therefore select an explicit variant without modifying credentials or provider configuration. Existing architecture sources at `docs/architecture/05-building-block-view/README.md` and ADR-0007 retain execution and publication ownership with the host.

## Goals / Non-Goals

**Goals:** one pure resolver shared by workers and delegation; configuration provenance separate from provider evidence; no expensive fallback; deterministic host-callable waves.

**Non-Goals:** preset activation, live credential inspection, new transports, a persistent task service, a model price catalog, automatic delegation by a worker, or new permissions.

## Decisions

1. Project configuration is optional `.lighthouse/models.json`; operator `modelProfiles` supplies field-level overrides and a host-owned capability inventory. Selection order is an explicit task profile, operator worker mapping, project worker mapping, operator default, project default. Definitions merge by field with operator values last. An explicit operator legacy `model` remains the worker override unless the operator explicitly enables profiles. Without profile opt-in, forward the legacy model byte-for-byte. Reject unknown keys rather than silently interpreting tier or authentication settings.
2. Profile models use OpenAI provider-qualified identifiers without embedded variants. Reasoning is a separate enum and becomes `#effort` only at the adapter boundary. The operator inventory must permit the exact model, effort and tools. Inventory is configuration-derived, never a proof of account access. Provider startup errors remain fatal. No availability discovery or authentication migration is added.
3. Runtime receipts retain the compatible `model` field and add requested/resolved settings plus provider-reported settings only when exposed by structured events. Missing provider model, effort, billing and usage are explicitly unknown; no configured value masquerades as provider confirmation.
4. Delegation is an exported executor invoked by a trusted host with launch and wave-verification callbacks, not an implicit model tool. Validate the existing launch contract and the parent's tools and paths. Require finite limits and a fresh child context/identity. Canonical relative file paths or directory prefixes only; unknown globs are rejected. Directory containment counts as conflict. Preflight the whole graph and every profile before launching. Greedy stable waves respect a host limit. Failed tasks or failed wave verification block dependants; independent work can continue. No model field can enlarge permissions.
5. Live evaluation is a documented operator procedure rather than sandbox model calls. Sol Medium versus Terra and Luna lightweight acceptance remain unverified until identical-revision results, usage and account terms exist. GPT-5.6 is a comparator only when relevant to the account.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:76493c2d6d9cca77ad0d549c24a4c3ccdb55d62da1a348d84c1b0c22b85ada71" -->
<!-- pdac:cite id="FR-PROFILE-DELEGATION" digest="sha256:dfe2874654b6e78de96b24d146fb944d966c6773a69d5a1d93a3f5eaadc8eb1b" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

## Risks / Trade-offs

- [Operator inventory can be stale] → reject undeclared selections, propagate provider failures and label receipts honestly; verify on the runner before adopting candidates.
- [Declared files cannot predict every agent write] → host launch/scope validation remains mandatory, and the existing candidate validation is not weakened. Hosts must enforce child write scopes and verify waves.
- [No account credentials or task benchmarks in this sandbox] → block completion on explicit missing acceptance evidence, while returning code for review.

## Migration Plan

Install the updated package; the current OpenCode 2.1.0 entrypoint already forwards the resolved model variant through `--model`. Keep existing operator `model` unchanged until deliberately opting into profiles with a capability inventory. Roll back by removing profile opt-in; the legacy path remains unchanged. No workflow stage or stored data migration is required.
