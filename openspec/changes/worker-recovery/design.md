# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## Context

Dispatch receipts identify one claimed worker. Artifacts retain its original authorization. Worker reruns deliberately cannot reclaim a receipt.

## Goals / Non-Goals

Recover confirmed safe technical failure without repeating uncertain publication. Keep execution and all durable state in GitHub.

## Decisions

A maintenance workflow scans bounded owner issues, then serializes per-issue decisions with router dispatch. A retry is a new request with its own immutable artifact and a link to the previous receipt. Admission authenticates the bounded chain back to the owner event. Only failed/timed-out refine, propose, implement or apply-review executions with successful preparation, failed pre-publication execution and a positively skipped publication step qualify. Current source, intent, workflow revision and reservation are checked again. Cancellation, expired artifacts, uncertain effects, human decisions and completion stages need intervention. Lost dispatch responses are reconciled by inspecting exact worker identity; absence of a match never permits resend.

## Risks / Trade-offs

Conservative exclusions require operator recovery in some safe cases. Artifact expiry prevents automatic recovery. The fixed cap is two retries, delayed 30 minutes; repository variables explicitly enable maintenance and retry separately. No automatic reservation clearing or merge retry.
