# PWA guardrails

| Guardrail | Level | Evidence | Failure |
| --- | --- | --- | --- |
| Manifest and icons | Required | Deterministic build and installability check | The capability is not installable. |
| Asset cache | Required | Service-worker inspection and browser test | The cache contract is incomplete. |
| Update strategy | Required | Fresh-install and update journey | A stale application can remain active without a recovery path. |
| Offline scope | Required | Declared bounded contexts and behavior review | Offline behavior remains ambiguous. |
| Private API cache | Required | Static or review check | The capability stops until private-data caching is explicitly designed. |
| Session lifecycle | Required for authenticated apps | Logout, expiry and user-change journeys | The session boundary remains unverified. |
| Push | Optional | Product-selected permission and delivery evidence | No push behavior is assumed. |

Do not enable offline-first behavior by convention. Make the offline boundary a product decision and keep it narrow.
