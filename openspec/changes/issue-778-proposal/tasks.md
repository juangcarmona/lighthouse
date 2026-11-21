# Tasks

<!-- pdac-scope: cited -->

## 1. Bounded evaluator contract

- [x] 1.1 Add the closed trace schema and pure evaluator, with inline simulated positives and isolated near misses for all three scenario families; verify schema rejection, independent dimensions and actual predicate mutants with `node --test src/tests/skill-contracts.test.mjs`.

<!-- pdac:cite id="FR-SKILL-CONTRACTS" digest="sha256:9cc9969f26d71771ee0de0cd973841ad2f8fe33a5169594f4a8a88a052f48c9b" -->

## 2. Distributed contract and guidance

- [x] 2.1 Add public module/schema exports, package guide, bounded refinement/implementation guidance and patch changeset; retain all existing package assertions and prove offline evaluator/schema execution from an isolated real packed consumer with `node --test src/tests/sdlc-package.test.mjs`.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:c07c375e4fa1788978ca5d900bc8f0ea9bc009bc71a1fff5d7602ebed6b00894" -->

## 3. Citation prerequisite and integration

- [x] 3.1 Bind only issue-590's current task document using the provider-emitted FR-PRODUCT-CHANGE-WORKFLOW and FR-CHANGE-EVIDENCE citations; verify all six checked tasks and wording remain unchanged and run the unchanged full citation verification.
- [ ] 3.2 Complete required installation, repository verification and strict implementation-plan check; retain terminal receipts, product/test traceability, instruction/audience/code reviews and retrospective in evidence. Mark only completed tasks.

<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:ebb92b84fbb181d6be2e487dcf93b934a0f15b2d61b3b82d64f6a1c3f77ad78c" -->

## Workflow follow-up

- Repository verification is blocked by the unchanged `src/tests/managed-command.test.mjs` logging assertion: managed execution adds a scratch-status line to the expected child-only log. The new evaluator/package tests, strict plan validation, citation verification, document links and public-site verification pass. Task 3.2 remains incomplete until the unchanged full repository command passes; no assertion, command or environment control is weakened here.
- Host independently checks and publishes the complete candidate for review. Owner-authorized epic integration, merge and release are not performed by this stage.
