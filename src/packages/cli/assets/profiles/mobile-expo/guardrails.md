# Expo mobile guardrails

| Guardrail | Level | Evidence | Failure |
| --- | --- | --- | --- |
| TypeScript and lint | Required | Deterministic static checks | The mobile slice stops before integration. |
| Expo health | Required | Expo doctor and reproducible build | The selected native target is not ready. |
| Secure storage | Required | Storage and logout test | Credentials remain unverified. |
| Permissions and deep links | Required | Native configuration and lifecycle tests | The capability remains incomplete. |
| Authentication and API | Required | Native integration evidence | The first mobile slice is not proven. |
| Emulator or device journey | Required | Native test evidence | The selected platform remains unverified. |
| Push notifications | Optional | Product-selected native evidence | No push behavior is assumed. |
| Web export | Optional | Separate browser build and journey evidence | Native success does not imply web success. |

Do not treat a web export as evidence for Android or iOS behavior.
