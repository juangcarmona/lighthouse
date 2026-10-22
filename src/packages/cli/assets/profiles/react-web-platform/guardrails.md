# React web guardrails

| Guardrail | Level | Evidence | Failure |
| --- | --- | --- | --- |
| Strict TypeScript | Required | Deterministic typecheck | The profile is not ready for delivery. |
| Lint and format | Required | Deterministic lint and format checks | The change stops before integration. |
| Reproducible build | Required | Deterministic production build | The application cannot be released from this revision. |
| Unit and component tests | Required | Deterministic Vitest and Testing Library checks | The affected slice needs repair. |
| Critical browser journeys | Required | Playwright evidence | The journey remains unverified. |
| Accessibility on critical surfaces | Required | axe evidence and human review where needed | The surface remains pending review. |
| Import boundaries | Recommended | Static or architectural check | Record a project-owned exception with an owner and review date. |
| Visual drift | Recommended | Visual evidence against the selected theme | Review the changed surface before accepting it. |
| Performance budget | Optional | Project-selected budget check | Record why the budget is not applicable. |

A public web application may call a public API directly when that decision is recorded; an authenticated web application selects `web-bff` by default.

Do not store access or refresh tokens in localStorage, sessionStorage or IndexedDB. The BFF profile owns the authenticated browser session contract.
