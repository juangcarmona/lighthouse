# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

## Context

GitHub issue creation is not idempotent. A lost response can otherwise create duplicate error reports.

## Goals / Non-Goals

Group observed failures, retain a concrete next action and mark only confirmed recovery. Preserve a report across recurrence. Exclude raw logs, source prose and external exports.

## Decisions

A globally serialized report job consumes authenticated maintenance observations. Worker/cause signatures use a fixed catalogue. An owner-selected index issue holds a reserved block recording intent before report creation, then its issue number. A lost response is reconciled against bot-owned reports; absent confirmation blocks another create. Reports retain at most 200 distinct observations, fail visibly on overflow, and count only observed identities. Same-root successful execution confirms recovery; unrelated later work does not.

## Risks / Trade-offs

The index requires one explicit operator setup. Creating intent and issue cannot be atomic: uncertain intent requires inspection, prioritizing no duplicate over automatic liveness. Index prose is preserved and rechecked before writes; all automated report writes share one concurrency group.
