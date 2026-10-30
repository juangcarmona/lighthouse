---
id: UC-MANAGE-STACKED-CHANGE
type: use-case
title: Manage a stacked change
status: draft
primary-actor: ACT-ADOPTER
supporting-actors: [ACT-INTEGRATED-SYSTEM]
bounded-context: BC-FOUNDATION
governed-by: [BR-DECOMPOSITION, BR-GITHUB-INTEGRATION, BR-STAGE-GATES, BR-HUMAN-AUTHORITY]
uses-terms: [TERM-STACKED-CHANGE, TERM-WORK-ITEM-SLICE, TERM-LABEL-STATE, TERM-GATE]
---

## Goal

Deliver dependent children through one reviewable aggregate outcome while preserving every merge decision.

## Trigger

An authorized decomposition plan or its child and aggregate state changes.

## Preconditions

The parent and children have authenticated identities, explicit dependencies, an integration branch and configured repository checks.

## Main Flow

1. Reconcile current native relationships, issue and pull request correlations and retained host evidence.
2. Run independent eligible children within capacity; wait for accepted prerequisites before dependent work.
3. Target child pull requests at the shared epic branch and invalidate integration evidence when the base changes.
4. Require the owner's explicit current-head decision and current checks for each child merge.
5. Publish one aggregate pull request from the epic branch to the default branch after child outcomes are accepted.
6. Preserve the parent's open state until the owner accepts the aggregate outcome under existing merge gates.

## Alternative Flows

An explicitly justified predecessor base can support a concrete dependency. Changed, cancelled, blocked or uncertain work remains visible and cannot satisfy prerequisites.

## Failure Conditions

Wrong bases, stale checks or approval, unauthenticated metadata, duplicate correlations and unresolved writes stop dependent actions. Retrying reconciles rather than recreates uncertain resources.

## Postconditions

Each child retains evidence and decision ownership; the parent reports the accepted combined outcome or an actionable blocker.
