# PWA testing

| Journey | Evidence |
| --- | --- |
| Fresh install | Manifest, icon and service-worker registration check |
| Asset update | New revision replaces the cached revision |
| Navigation offline | Declared navigation fallback behaves as designed |
| Private data | No undeclared API response enters a cache |
| Logout and expiry | Authenticated cache and session state are cleared or blocked |
| User change | The next user cannot observe the previous user's data |
| Push, when selected | Permission, delivery and revocation evidence |

Run the journeys in a real browser context with a clean profile and a second revision of the application.

A successful service-worker registration alone is not evidence that the update and data policies work.
