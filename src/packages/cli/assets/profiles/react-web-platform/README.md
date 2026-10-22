# Lighthouse React web profile

Use this profile for React applications that need a predictable browser boundary, feature-oriented source and evidence for the journeys users rely on.

## Start here

| Need | Read |
| --- | --- |
| New web application | [structure](structure.md) → [guardrails](guardrails.md) → [testing](testing.md) |
| Existing web application | [adoption](adoption.md) → [structure](structure.md) |
| Implement a feature | [structure](structure.md) → [testing](testing.md) |
| Diagnose a failed check | [guardrails](guardrails.md) |

## Defaults

Use React and strict TypeScript with thin routes, an app shell and feature slices aligned with bounded contexts and backend use cases.

Use TanStack Query for server state and keep local state local; put filters, pagination and meaningful navigation state in the URL.

Use explicit API contracts, visual-theme tokens, Testing Library, Vitest, Playwright and axe for the applicable surfaces.

Add form, schema, mock or client-generation libraries only when a real feature requires them and the contract is stable.

The profile does not create a runtime component library or turn shared folders into a technical-layer architecture.
