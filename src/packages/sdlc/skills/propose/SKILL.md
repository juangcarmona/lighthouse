---
name: lighthouse-sdlc-propose
description: Use when a ready work item needs a solution proposal, OpenSpec change artifacts, test impact and a human-readable change overview.
---

# Propose

Describe the smallest implementable solution for a Ready item.

## Steps

1. Read the Ready evidence and inspect the current product and architecture authorities.
2. Create or update the OpenSpec change artifacts through the installed OpenSpec workflow.
3. Describe the solution, interfaces, data effects, test impact, slices, risks and Definition of Done.
4. Write `change-overview` prose with the Humanizer skill while preserving facts, links, commands, frontmatter and code.
5. Return a stage result with `stage: propose`, `gate: planned`, the change artifacts as output, evidence entries and separate `missingEvidence`, `unavailableChecks` and `pendingReview` arrays.

## Completion

The change artifacts explain the future state, the slices are dependency ordered, the evidence plan is explicit and the `planned` decision remains visible.
