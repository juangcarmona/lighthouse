---
id: CHG-LH-MODEL-PROFILES-001
type: product-change
title: Configure worker model profiles and bounded delegation
status: applied
base-revision: 'bdd4bf3e15790d28e72eeecfa37a4275db4c670d'
operations:
  add: [FR-MODEL-PROFILES, FR-PROFILE-DELEGATION]
  modify: []
  remove: []
---

## Problem

The agent launch contract does not describe independent model and reasoning selection or safe profile-aware task waves.

## Intended Product Outcome

Operators can configure OpenAI-only plan, build and fast profiles without changing legacy selections, authentication, billing or permission boundaries. Delegated tasks use the same selection rules with bounded dependency-aware execution.

## Rationale

Issue #148 and the verified owner answer authorize this configurable behavior and explicit branch application (https://github.com/juangcarmona/lighthouse/issues/148#issuecomment-6449899598). The approved status records that supplied human authorization after overlay validation, not agent approval. Candidate presets and live evaluation remain unapproved and unverified. This change records that bounded intent, not a new model purchase or a merge approval.

## Affected Product Areas

Agent launch, control-plane configuration, execution evidence and delegated task verification. Existing lifecycle, memory, tracker and merge contracts remain unchanged.

## Open Questions

None.

## Product Acceptance

Selection precedence, legacy compatibility, independent reasoning, honest execution evidence and conflict-safe bounded waves are explicit. Account access, candidate evaluation and billing remain evidence obligations rather than assumptions.

## Out of Scope

No preset adoption, authentication migration, premium processing, Flex or Batch transport, database, fleet runtime, permission expansion or merge authorization. Product Change application is not implementation or acceptance evidence.
