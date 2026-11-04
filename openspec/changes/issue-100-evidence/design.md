# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->

## Context

`implementation.mjs` already checks run/source/change digest and argv. `opencode-execute.mjs` runs checks in a fresh credential-free container and rejects source changes during checking. `completion.mjs` binds current head, intent, policy and forge observations; `process-publication.mjs` authenticates retained integration receipts. The common evidence validator checks shape and declared coverage, not arbitrary producer truth.

## Goals / Non-Goals

Transport actual command results through those existing boundaries with current-input verification. Preserve legacy readers, distinct failure/unavailability and independent assessment. Test strength, policy expansion, a collector and unattended-route redesign are outside this slice.

## Decisions

- Add internal receipt v2 when the host supplies repository/run/attempt/intent; legacy requests remain readable. Bind implementation policy and approved planning reference, keep the admitted policy revision distinct from a correction's PR-head source revision, record the candidate's Git tree before checks and compare it with the published commit tree. Tree equality covers relevant source, plans and dependency declarations without requiring unrelated main commits to rerun checks.
- The publisher emits a separate small Actions artifact. Retain bounded redacted output, full retained-log digest and an explicitly truncated excerpt. When the full log parses as JSON, retain its bounded summary and unmodified provider rows for changed files/the issue plan, plus diagnostics. Commands write to an ephemeral regular file before output is streamed to the host; this preserves complete output from providers that exit before pending pipe writes flush. Capture/line bounds and excerpt truncation remain explicit, and an incomplete log cannot supply a JSON summary. Original host logs keep their existing owner and retention.
- Authenticate native repository, supported workflow, successful run/attempt, default-branch context, owner or verified router origin and unchanged installed workflow bytes. Compare current issue intent, policy, external plan, published head/tree and outputs. Shared authority/model, OpenSpec and Markdown inputs must match the admitted baseline or the already-tested candidate after merge; use the existing ProductShape root resolver. An artifact or producer string supplied by an agent is insufficient.
- Expose verified commands as additional completion observations. Reuse existing cited-check revalidation before effects and retain the verifier result inside the existing report payload. Forge merge gates and stage-result v1 stay unchanged.

## Risks / Trade-offs

Missing/expired origin or command artifacts, changed workflow bytes and malformed results stop reuse conservatively. Truncated text proves only the retained content/summary, not omitted provider details. The host-authenticated API is the trust root; pure shape validation and aggregate coverage do not authenticate arbitrary JSON. Legacy and unattended receipts without this handoff remain explicit unavailable command evidence. Independent integrity/adequacy qualification belongs to #101.
