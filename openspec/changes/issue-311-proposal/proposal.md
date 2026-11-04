# Trusted validation and bounded CI correction

## Why

Failed candidate CI currently stops automatic delivery without invoking the existing same-PR correction worker. Proposal publication can also precede the Markdown and local-link checks that later fail in CI.

## What changes

- Validate proposed Markdown and local links before signing or publishing a proposal or implementation candidate.
- Admit failed adopted CI only for a current repository-owned implementation PR and a retained implementation grant whose issue intent, scope and check policy still match.
- Reuse the existing correction worker with an explicit issue allowlist and at most two attempts for the PR identity, including across changed heads.
- Retain diagnostic evidence and stop on human objections, exhausted budgets, missing origins or unconfirmed effects. Product proposal repairs retain trusted provider revalidation and renewed owner decisions.

## Capabilities

### New capabilities

- `bounded-ci-correction`: authenticated, finite correction of the same implementation PR after failed CI.

### Modified capabilities

None.

## Impact

The SDLC publisher and router, repository Markdown link checker, adopted workflow projections and optional completion configuration change. The controlled native acceptance allowlist contains only disposable issue #346. Merge, product approval, interruption retry and resource cleanup authority are unchanged.
