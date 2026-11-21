# Proposal

<!-- pdac-scope: cited -->

## Why

Selecting a skill or reading its references does not prove that an agent followed its protocol or delivered the requested result. Issue #778 supplies a bounded, offline way to distinguish those claims without qualifying a real provider.

## What Changes

- Publish an additive trace schema and pure evaluator for design advice, direct scoped refinement and scoped implementation.
- Evaluate skill selection, protocol and delivered completion independently, with positive simulations, isolated near misses and evaluator-predicate mutation tests.
- Preserve accepted product/design decisions, enforce declared writes and require linked completion and requester-delivery events.
- Document the evidence boundary in the packaged skills and guide; exercise the evaluator and schema in an isolated packed consumer and include a patch changeset.
- Apply only the owner-approved citation declaration/payload additions to `openspec/changes/issue-590-product-change/tasks.md`; retain its six tasks verbatim.
- Correct refinement's read-only boundary and complete bounded output, add concrete assertion findings and request/run delivery bindings, and retain packed-artifact proof. Apply the review-admitted managed-command diagnostic-routing prerequisite without changing verification inputs or cache activation.

## Capabilities

### New Capabilities

- `skill-behavior`: Bounded trace evaluation of selection, protocol and requester delivery.

### Modified Capabilities

None. The installed OpenSpec inventory contains issue-control, managed-command-scratch, opaque-source-link-tree, risk-bound-continuation and unattended-ci-wait; none owns this behavior.

## Impact

SDLC module/schema exports, package documentation and two skills; inline tests and isolated package execution. No new dependencies, workflow, network route or universal design-quality score. Provider measurement remains unmeasured because no installed-provider claim is made.

## Product grounding

FR-SKILL-CONTRACTS governs the three independent claims and simulation boundary. BR-BOUNDED-WORKFLOW governs declared context, effects and completion; UC-RUN-AGENT supplies the requester boundary. Direct term neighbours describe vocabulary, not additional behavior. Transitive memory, launch and workflow-state neighbours are unchanged: this evaluator does not launch agents, store memory or transition workflows. No domain lifecycle or structured behavior links to FR-SKILL-CONTRACTS; scenarios derive from its verification list, not an invented lifecycle. No product drift is identified.

<!-- pdac:cite id="FR-SKILL-CONTRACTS" digest="sha256:9cc9969f26d71771ee0de0cd973841ad2f8fe33a5169594f4a8a88a052f48c9b" -->

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:c07c375e4fa1788978ca5d900bc8f0ea9bc009bc71a1fff5d7602ebed6b00894" -->

<!-- pdac:cite id="UC-RUN-AGENT" digest="sha256:a36f45b77cc1a28f6222e3becc70832fc60e70f6857d36d0870154165d28c42e" -->

The metadata-only prerequisite consumes FR-PRODUCT-CHANGE-WORKFLOW and FR-CHANGE-EVIDENCE under the verified owner answer; it does not refresh historical outcomes or authorize other historical edits.

<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:ebb92b84fbb181d6be2e487dcf93b934a0f15b2d61b3b82d64f6a1c3f77ad78c" -->
