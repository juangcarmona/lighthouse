---
id: SB-STALE-BEHAVIOUR-EVIDENCE
type: structured-behaviour
title: Stale behaviour evidence preserves historical execution
status: draft
illustrates: [UC-IMPLEMENT-CHANGE, BR-FAIL-CLOSED]
given:
  - A completed test run has a passing result tied to a structured behaviour and its original source and model revisions.
  - The accepted model has changed so that the run's provider-generated citation is stale.
when: Current verification evaluates that external evidence through the supported ProductShape interface
then:
  - The report preserves the original passing execution outcome and its revisions as historical evidence.
  - The report identifies the stale citation and need for revalidation.
  - The historical result is not presented as current acceptance of the changed behaviour.
  - Model coverage, test existence, execution and acceptance remain distinguishable.
uses-terms: [TERM-GUARDRAIL, TERM-INTEGRATION]
---

## Intent

Model evolution changes the current applicability of evidence without rewriting what a past execution observed. Reviewers can see both the history and the missing revalidation.

## Boundaries

This example neither changes a passing historical execution to a failure nor approves the changed model. It does not prescribe that every revalidation requires an end-to-end test; the observable behaviour determines the test level.
