<!-- pdac-scope: none reason="Design for the issue #348 disposable text fixture only; no product-semantic dependency or behavior change." -->

# Design

## Context

See `proposal.md` for motivation. The fixture does not exist in the source checkout. The issue explicitly distinguishes the initial implementation from the later CI correction; no owner answer changes that sequence.

## Goals / Non-Goals

**Goals:** Make the initial candidate deterministic and reviewable, with an exact-content assertion and unchanged configured checks.

**Non-Goals:** Change correction logic, inject a new check, simulate CI, publish directly, merge, release or retire the PR from this worker.

## Decisions

- Create a three-line Markdown document with a trailing newline: heading, blank line and `The initial candidate awaits its injected CI correction.` This follows the issue's initial-phase instruction rather than prematurely writing `The current candidate passed its bounded CI correction.`
- After trusted CI reports the mismatch, a later authorized correction may replace only that paragraph. The initial worker does not anticipate or claim that event.
- Use a documentation-only OpenSpec change with `skip_specs: true`, rather than invent a behavioral requirement. Include this design to explain the intentional intermediate state.
- Run an exact-byte assertion from the managed command slot without adding a repository test or modifying validators. Run all four policy commands; the repository verify command includes Markdown, tests, links and public-site checks.

## Risks / Trade-offs

- [The initial paragraph fails the additional trusted CI check] → Intentional acceptance stimulus; preserve it until that CI result requests correction.
- [A green local check is mistaken for end-to-end acceptance] → Report later host/CI events separately as unperformed follow-up, not completed tasks.
- [Scope expands into correction infrastructure] → Review the final changed-path list against the two authorized paths.

## Migration Plan

No runtime deployment or migration applies. The host publishes the initial candidate for the disposable acceptance route; a subsequent bounded worker handles the paragraph correction. Retirement and any cleanup remain with the host or owner after evidence collection.
