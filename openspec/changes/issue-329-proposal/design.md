# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation. The owner supplies both literal fixture strings and reserves admission, stale-intent rejection and recovery exercises for later orchestration.

## Goals / Non-Goals

**Goal:** Deliver a minimal, reviewable documentation fixture without changing any existing file.

**Non-goals:** Change integration logic, labels, workflow policy, canonical models, merge permissions, release or deployment behavior. No interface or data migration is involved.

## Decisions

- Write the fixture as one H1, one blank line and the exact paragraph, followed by a final newline. Do not add explanatory text or citations to that document because its content is prescribed.
- Use `skip_specs: true` rather than invent a behavioral specification. Keep evidence grounding in the planning documents instead.
- Verify the exact fixture bytes and changed-path boundary, then run the configured checks. Record actual outcomes separately from independent host checks and later owner acceptance; a local pass cannot establish either later outcome.

<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

## Risks / Trade-offs

- Mistaking this candidate for a mergeable change → explicitly retain the never-merge boundary in the plan and completion report.
- Claiming later acceptance from document creation → keep owner integration exercises and required CI as separate follow-up evidence.
- Unnecessary documentation expansion → check the fixture against the exact authorized bytes and preserve unrelated files.

## Verification and Definition of Done

The fixture has the exact authorized content, all four planning files are delivered, configured repository checks and strict OpenSpec validation pass, and citations remain current. Runtime and visual behavior are unchanged, so browser screenshots and new runtime tests are not applicable. The host independently checks the candidate before publication; later owner acceptance is not an implementation task.

## Migration Plan

No deployment or migration. The disposable PR is to be closed without merging after the owner retains acceptance observations. Removing this candidate's new files rolls back the fixture; no existing content needs restoration.
