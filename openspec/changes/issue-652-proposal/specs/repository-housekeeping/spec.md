<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-REPOSITORY-HOUSEKEEPING" digest="sha256:8f32f77ca9a3f4b1569fc232f3c47576eba34d5c2a8a7d4a6f20c55d4f237771" -->

# Repository housekeeping

## Purpose

Provide each adopter with honest daily repository coverage and safe reconciliation without replacing its lifecycle authority.

## ADDED Requirements

### Requirement: Conservative published-work reconciliation

Housekeeping SHALL compare retained admitted publication evidence with current PR identity and lifecycle state. Terminal publication SHALL produce an actionable disposition without repeating CI, implementation or merge. Missing evidence and invalid authority MUST remain visible. Merge alone MUST NOT close an issue.

#### Scenario: Published PR became terminal

- **WHEN** the authenticated published candidate has merged or closed
- **THEN** maintenance records its terminal disposition and preserves the owning lifecycle's completion decision

#### Scenario: Publication authority cannot be established

- **WHEN** the original request is unavailable or current PR identity differs
- **THEN** maintenance reports uncertainty or invalid authority and performs no candidate effect

### Requirement: Complete daily coverage and read-only preview

Housekeeping SHALL provide a deterministic daily inspection and manual dry-run with declared scope, per-item dispositions and evidence links. Failed discovery or items MUST remain incomplete without suppressing other items. Only a complete inspection SHALL advance its actual completion timestamp; dry-run MUST NOT mutate tracker state or request continuation.

#### Scenario: Partial inspection

- **WHEN** one issue or dependency cannot be inspected
- **THEN** other items are inspected and the last complete sweep remains unchanged

#### Scenario: Active or uncertain execution

- **WHEN** a run is old but active or its effects are uncertain
- **THEN** its reservation remains protected and any continuation uses existing admission and recovery rules

### Requirement: Stable evidence and freshness

Housekeeping SHALL maintain one managed summary in the existing report index, preserve owner notes, reject older observations and avoid duplicate effects. Freshness SHALL use actual complete daily coverage, not workflow success, installation or a cron expression. Missing, disabled, skipped and partial coverage MUST remain actionable.

#### Scenario: Delayed or duplicate sweep

- **WHEN** an older or repeated sweep reaches the summary
- **THEN** it does not replace newer state or duplicate an effect

### Requirement: Reviewed package distribution

Upgrade, init and reconcile SHALL use the same SDLC source to deliver housekeeping without fleet registration. Upgrade SHALL identify managed workflow and support files, configuration prerequisites and ownership outcomes. Customized and provider-owned files MUST be preserved. Installation, activation, publication and native scans MUST remain separate observations.

#### Scenario: Upgrade an existing adopter

- **WHEN** an eligible adopter previews and applies its selected SDLC scope
- **THEN** missing managed housekeeping is installed without activating it, and conflicts or configuration gaps remain explicit

#### Scenario: Defer the SDLC scope

- **WHEN** an adopter selects only the harness scope
- **THEN** housekeeping is explicitly deferred and is not reported as installed or operational
