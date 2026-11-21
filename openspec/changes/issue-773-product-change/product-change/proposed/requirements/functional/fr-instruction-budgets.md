---
id: FR-INSTRUCTION-BUDGETS
type: functional-requirement
title: Measure bounded workflow instruction inputs
status: draft
derived-from: [BR-BOUNDED-WORKFLOW, UC-RUN-AGENT]
verification:
  - scenario: A named supported workflow branch reports reproducible entry and selected-reference byte measurements with source identities and reviewed caps.
  - scenario: Exceeding a cap, selecting an uncapped supported input or retaining a stale inventory entry fails deterministic budget verification.
  - scenario: Adding or removing a selected reference changes the inventory; unsupported branches and variable project context remain explicitly outside its measured coverage.
  - scenario: Reduced instructions retain authoritative decisions, access to full evidence and supported behavior without claiming unread references were reviewed.
uses-terms: [TERM-AGENT-RUN, TERM-WORKFLOW-STAGE, TERM-GUARDRAIL]
---

## Requirement

Lighthouse MUST expose reproducible instruction-input measurements for an explicitly named, bounded initial set of existing workflow branches. Each supported branch MUST identify its entry instructions, the reference combinations selected for that branch, their source identities, byte measurements and reviewed caps. Changes to selected references MUST account for added and removed inputs. Supported inputs without caps, exceeded caps and stale budget entries MUST fail deterministic verification. Uncovered branches and variable project context MUST be named rather than included in an unsupported completeness claim.

Budgeting or instruction reduction MUST preserve exact authoritative decisions, required policy, supported workflow behavior and access to complete retained evidence. A compact map or lookup MUST NOT imply that unread material was reviewed. Instruction reductions MUST be checked against the supported behavioral contract, not only file size.

Byte measurements MUST NOT be represented as actual model token usage, billed usage or a guarantee that variable project context fits. Tokenizer-derived values, when offered, MUST be labeled estimates with their method and coverage.

## Rationale

Branch-specific budgets make instruction growth reviewable without confusing compact presentation with complete context or weakening the authority that a bounded run must consume.
