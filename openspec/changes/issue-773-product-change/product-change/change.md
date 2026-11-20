---
id: CHG-LIGHTHOUSE-CONTEXT-SKILL-VISUAL
type: product-change
title: Bound instruction growth and verify skill and visual evidence contracts
status: draft
base-revision: '4b1fb0530b501d7ade25feef19d7cf34777c9a3f'
operations:
  add:
    - FR-INSTRUCTION-BUDGETS
    - FR-SKILL-CONTRACTS
  modify:
    - FR-PROFILE-CONTRACT
    - FR-EVIDENCE-COVERAGE
  remove: []
---

## Problem

The accepted definition requires bounded workflows, inspectable visual guardrails and honest evidence coverage, but does not explicitly require branch-specific instruction budgets, separate measurements of skill selection and completed behavior, separately opt-in consumer semantic-token checking or capture-time freshness for required visual evidence.

## Intended Product Outcome

Maintainers can detect instruction growth and verify observable skill obligations for a named supported set without losing authoritative context. Adopters can select bounded consumer semantic-token verification independently of visual-profile compliance. Required visual evidence covers the declared candidate views, states, viewports and appearances and becomes historical rather than current when relevant source changes.

## Rationale

Existing run, stage, profile, evidence and process-guard contracts remain the owners of these concerns. New requirements distinguish instruction inputs from optional command-output presentation and skill evaluation from incident-driven process-guard review. Existing profile and coverage IDs evolve instead of acquiring duplicates.

The verified owner answer states verbatim:

> Owner decision in answer to the pending adoption question: opt-in.
>
> The new consumer-source semantic-token checker must remain separately opt-in. Leaving it unselected must not block compliance with the visual profile, including for existing adopters after a reviewed upgrade. Continue preparing the Product Change on that basis.
>
> Recorded by Codex on the owner's explicit instruction in this conversation. This answers the adoption question; it does not approve an unseen Product Change or a candidate merge.

Default evaluation remains deterministic and offline. Provider-backed measurement is separately selected and budgeted; missing execution cannot become a pass. Visual integrity and automated assertions do not supply visual judgement or product acceptance.

## Affected Product Areas

Bounded instruction measurement, observable agent-skill contracts, selectable visual verification and current visual evidence coverage.

## Open Questions

None. No product-semantic decision is parked. Engineering refinements must preserve the explicit supported boundary and return for a product decision if they require materially different behavior.

## Product Acceptance

- The definition requires reproducible byte inventories for entry instructions and selected reference combinations, source identity, reviewed caps and failures for exceeded, uncapped and stale supported entries; estimates are not actual model usage.
- Skill selection, required behavior and delivered completion are independently assessable, including positive and near-miss advice and scoped-change scenarios, with deterministic evaluator self-tests and no simulated provider qualification.
- Consumer token checking resolves adopted authority, declares supported syntax and discovery, reports unsupported coverage and respects narrowly scoped product exceptions. It remains independently opt-in before and after reviewed upgrades.
- Rendered qualification preserves semantic roles, native interaction and product-owned design while exercising supported appearances, viewports, contrast, focus and applicable motion.
- Required visual evidence distinguishes proposed, source-before and running-candidate captures; it binds capture-time candidate source and declared coverage, rejects stale or mismatched captures, preserves history and stops on missing required evidence or unavailable publication. Inert host metadata alone cannot invalidate the visual source binding.
- Existing profile obligations, evidence measurements, provider ownership and separate approval boundaries remain intact.

## Out of Scope

Implementation, a new package or lifecycle, replacement product or architecture authority, another evidence store, replacement palettes, generic aesthetic prohibitions, mandatory animation, arbitrary framework coverage, universal screenshot baselines, credentialed default evaluation, automatic installation or automation activation, merge, release and deployment. Existing actors, journeys, bounded context, authority handoffs, process-guard review and domain terms remain unchanged because their current contracts already supply the needed boundaries.
