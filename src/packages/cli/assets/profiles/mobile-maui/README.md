# Lighthouse .NET MAUI mobile profile

Use this profile when Android or iOS is a real product requirement and the application will run as a native .NET MAUI client.

## Start here

| Need | Read |
| --- | --- |
| New native application | [adoption](adoption.md) → [guardrails](guardrails.md) → [testing](testing.md) |
| Add a device capability | [guardrails](guardrails.md) → [testing](testing.md) |
| Prepare a release build | [adoption](adoption.md) → [guardrails](guardrails.md) |

## Defaults

Use C# and XAML with explicit lifecycle, secure storage, deep links, notifications, permissions and device capability boundaries.

Use OIDC Authorization Code with PKCE and keep API contracts, permissions, pure business rules, errors, telemetry and visual principles aligned with the product's other clients.

Do not reuse React components, browser cookies, web routing, persistence entities, DbContexts or internal handlers.
