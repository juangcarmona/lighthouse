# React web testing

Use a short feedback loop: typecheck and unit tests first, then integration and browser evidence for the behavior that crosses boundaries.

| Layer | Purpose | Evidence |
| --- | --- | --- |
| Typecheck and lint | Catch static contract and style errors | CI output |
| Unit and component | Exercise feature behavior and interaction states | Vitest and Testing Library |
| Integration | Exercise API and BFF contracts where a boundary matters | Project-selected test harness |
| Browser | Prove login, navigation, query, mutation and failure states | Playwright with catalogued evidence |
| Accessibility | Catch critical semantic and keyboard regressions | axe plus human review when required |

The first vertical slice covers session, an authenticated screen, a query, a mutation, loading, empty, error and authentication failure.

Keep browser journeys few and valuable. Do not replace application tests with end-to-end tests or mock away the boundary being verified.
