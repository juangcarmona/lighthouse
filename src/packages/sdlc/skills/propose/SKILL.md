---
name: lighthouse-sdlc-propose
description: Use when a ready work item needs a solution proposal, OpenSpec change artifacts, test impact and a human-readable change overview.
---

# Propose

For product context, scenario selection, tests or evidence review, read and apply [product-derived verification](../../product-verification.md). Trace applicable lifecycle and structured-behaviour meaning to actual tests and results; record justified non-applicability and unresolved model gaps.

Describe the smallest implementable solution for a Ready item.

For proposals, change overviews, PR descriptions or agent-facing instructions, read and apply [the audience policy](../audience-guidance/SKILL.md). Record the pinned helper or fallback review used. Visual proposals also use its scoped visual review.

## Steps

1. Read the Ready evidence and inspect the current product and architecture authorities.
2. Create or update the OpenSpec change artifacts through the installed OpenSpec workflow. Always return `proposal.md`, `design.md` and `tasks.md`, including for documentation-only changes. For a change without spec-level behavior, return `.openspec.yaml` containing exactly `skip_specs: true` instead of a specification; the host adds it to provider-owned metadata.
3. Describe the solution, interfaces, data effects, test impact, slices, risks and Definition of Done.
4. Write a concise change overview using the audience policy's human-writing review order and final evidence comparison. Preserve facts, links, commands, frontmatter and code; record the review method in the result output. Complete its explicit fallback when the pinned helper is unavailable.
5. Return a stage result with `stage: propose`, `gate: planned`, the change artifacts as output, evidence entries and separate `missingEvidence`, `unavailableChecks` and `pendingReview` arrays.

## Completion

The change artifacts explain the future state, the slices are dependency ordered, the evidence plan is explicit and the `planned` decision remains visible.
