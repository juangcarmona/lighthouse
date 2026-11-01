---
id: FR-MODEL-PROFILES
type: functional-requirement
title: Resolve explicit worker model profiles
status: draft
derived-from: [UC-CONFIGURE-AGENT-CONTROL-PLANE, UC-RUN-AGENT, BR-AGENT-LAUNCH, BR-FAIL-CLOSED, BR-HUMAN-AUTHORITY]
verification:
  - scenario: Four workers resolve independently configured model and reasoning combinations, including different efforts for one model and different models at the same effort.
  - scenario: An authenticated owner may select an allowed combination for one ordinary execution only when the operator explicitly permits it; unsupported or unauthorized selections fail without fallback.
  - scenario: Existing profiles and delegated tasks remain compatible, precedence is documented, and requested, resolved and provider-reported evidence stay distinguishable.
uses-terms: [TERM-AGENT-ROLE, TERM-AGENT-RUN, TERM-GUARDRAIL]
---

## Requirement

The OpenCode adapter MUST allow an adopter to select an OpenAI model and reasoning effort independently for each worker, with direct settings or optional named presets and no three-combination limit. Existing plan, build and fast profiles, legacy single-model installations and bounded delegated-task behavior MUST remain compatible. Selection precedence among an explicitly permitted execution selection, operator and project worker settings, and operator and project defaults MUST be deterministic and documented. An authenticated owner MAY select an operator-allowed combination for one ordinary execution only when the operator explicitly enables that choice; untrusted issue content and automated continuation MUST NOT authorize an execution selection.

Operator model capabilities, tool availability and execution limits MUST remain authoritative for every selection. Incomplete, unknown, denied or unavailable selections MUST fail explicitly without choosing a different model, effort, provider or processing tier. Selection MUST NOT change authentication, billing route, processing tier, permissions or lifecycle gates. Execution evidence MUST distinguish the requested selection, resolved settings and their sources, and authenticated provider-reported settings or an explicit unverified state. Unavailable usage and account charges MUST remain unknown. Candidate selection MUST depend on repeatable accepted-task evidence and actual account economics, not token rates alone.

## Rationale

Work-specific configuration is useful only when it preserves operator choice and reports the limits of its evidence.
