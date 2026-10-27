---
id: FR-MODEL-PROFILES
type: functional-requirement
title: Resolve explicit worker model profiles
status: draft
derived-from: [UC-CONFIGURE-AGENT-CONTROL-PLANE, UC-RUN-AGENT, BR-AGENT-LAUNCH, BR-FAIL-CLOSED, BR-HUMAN-AUTHORITY]
verification:
  - scenario: Two workers resolve different profiles with independently configured reasoning; operator overrides outrank project defaults and legacy single-model behavior remains unchanged.
  - scenario: Invalid or unavailable settings stop without fallback; requested and provider-reported evidence remain distinguishable and unknown account usage remains unknown.
uses-terms: [TERM-AGENT-ROLE, TERM-AGENT-RUN, TERM-GUARDRAIL]
---

## Requirement

The OpenCode adapter MUST support opt-in OpenAI-only plan, build and fast model profiles, independent reasoning settings, project defaults, worker assignments and explicit operator overrides with documented precedence. Legacy single-model configurations MUST remain unchanged. Host capabilities and execution limits MUST remain authoritative; invalid or unavailable selections MUST fail without fallback. Profiles MUST NOT change authentication, billing route, processing tier, permissions or lifecycle gates. Execution evidence MUST distinguish requested, configuration-derived and provider-reported settings and unknown usage. Candidate selection MUST depend on repeatable accepted-task evidence and actual account economics, not token rates alone.

## Rationale

Work-specific configuration is useful only when it preserves operator choice and reports the limits of its evidence.
