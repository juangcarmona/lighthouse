# .NET MAUI mobile guardrails

| Guardrail | Level | Evidence | Failure |
| --- | --- | --- | --- |
| Locked restore and build | Required | Deterministic restore and build per target | The selected native target is not reproducible. |
| Analyzers and format | Required | Static checks and format verification | The mobile slice stops before integration. |
| Secure storage and authentication | Required | OIDC, storage, logout and expiry tests | Credentials or session behavior remains unverified. |
| Permissions and deep links | Required | Native configuration and lifecycle tests | The capability remains incomplete. |
| Emulator or device journey | Required | Native functional evidence | The selected platform remains unverified. |
| Notifications, camera and files | Optional | Product-selected native evidence | No device capability is assumed. |
| Packaging and signing | Optional | Product-selected release evidence | No release signing is assumed. |

Share contracts, permissions, pure rules, errors, telemetry and visual principles deliberately. Keep web routing, cookies, React components, persistence entities and internal backend handlers outside the client.
