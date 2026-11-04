<!-- pdac-scope: none reason="Design of an owner-authorized disposable documentation fixture, not a change to product behavior." -->

# Design

## Context

See proposal.md for motivation. This is the initial implementation request, with no predecessor or failed-CI correction diagnostics. Only the fixture and this OpenSpec change directory may change.

## Goals / Non-Goals

**Goals:** Deliver the exact initial fixture, preserve the intentional mismatch, and retain local verification evidence.

**Non-Goals:** Implement the correction router, simulate hosted CI, modify checks, replace the paragraph early, or merge or release the candidate.

## Decisions

- Use a plain Markdown document with one heading and one paragraph, ending in a newline. The initial paragraph is `The initial candidate awaits its injected CI correction.` Writing the final paragraph immediately would bypass the acceptance experiment.
- Document the final state without applying it: after actual CI reports the mismatch, the bounded correction replaces only the paragraph with `The current candidate passed its bounded CI correction.` The heading stays unchanged.
- Use the documentation-only `skip_specs: true` option rather than inventing a product capability or duplicating #311's behavioral specification.
- Verify exact fixture bytes with a read-only assertion, then run the unchanged repository and provider checks. Do not add a committed test because the authorized scope explicitly preserves tests and validation scripts.

## Risks / Trade-offs

- [The initial paragraph intentionally fails the additional hosted CI assertion] → Report this expectation explicitly; do not claim hosted acceptance has passed.
- [Local success cannot prove routing, same-PR correction or duplicate suppression] → Keep these as later hosted acceptance evidence, outside the initial implementation assessment.
- [Disposable input could be mistaken for published product documentation] → Retain the issue's no-merge constraint and keep the fixture under the dedicated acceptance directory.

## Migration Plan

The host publishes one draft implementation PR containing plan and fixture. Actual CI and its authenticated continuation own the later paragraph-only correction. The candidate remains unmerged and is retired after evidence collection by the responsible host/operator; this implementation performs no publication or retirement.
