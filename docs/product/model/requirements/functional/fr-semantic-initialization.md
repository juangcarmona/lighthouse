---
id: FR-SEMANTIC-INITIALIZATION
type: functional-requirement
title: Initialize from a semantic project plan
status: draft
derived-from: [UC-INITIALIZE-PROJECT, BR-FAIL-CLOSED, BR-HUMAN-AUTHORITY, BR-OWNED-AUTHORITY]
verification:
  - scenario: An agent can create a schema-valid plan with no reference project, preview it in text and JSON without changing the target, and apply it only after explicit authorization.
  - scenario: A plan with a declared reference records that reference as optional metadata and does not copy or require its contents during CLI application.
  - scenario: A plan with unresolved questions, unknown profiles or incompatible selections stops before writing and reports the exact repair action.
  - scenario: An existing initializer invocation using a product name and explicit profiles retains its current behaviour.
uses-terms: [TERM-INITIALIZATION-PLAN, TERM-FOUNDATION, TERM-PROFILE, TERM-ADOPTION, TERM-MANAGED-PROJECTION]
---

## Requirement

Lighthouse MUST provide an agent-facing initialization skill that turns a natural-language project request into a versioned initialization plan containing the product intent, application shape, stacks, selected profiles, optional reference metadata and resolved questions. The skill MUST treat a reference project as optional and MUST ask for missing information instead of inventing a selection.

The CLI MUST validate the plan against a packaged schema and the installed profile catalog, report deterministic local operations and conflicts in human-readable and machine-readable forms, and use dry-run as the default for plan-driven initialization. It MUST refuse to apply a plan with unresolved questions, unsupported profiles or incompatible selections, and MUST require an explicit apply flag before writing.

The CLI MUST preserve existing project-owned and provider-owned content, MUST not inspect or copy a reference during plan application, and MUST retain compatibility with the existing name-and-profile initializer. A plan-driven initialization MUST perform no remote writes.

## Rationale

Separating semantic interpretation from deterministic application lets agents handle incomplete requests without making the CLI a model runtime or weakening the repository ownership boundary.
