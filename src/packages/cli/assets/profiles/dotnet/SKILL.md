---
name: lighthouse-dotnet
description: Apply the Lighthouse .NET profile when a repository selects the dotnet-backend profile.
---

# Lighthouse .NET profile

Read the profile guide before changing a .NET adopter.

Keep the default backend as a feature-aligned modular monolith with Minimal API endpoints, one file per command or query, internal sealed handlers and explicit module contracts.

Use Aspire as the composition boundary and keep analyzers active in every implementation module.

Use red-green development: start with unit tests, then add integration, functional and browser evidence when the selected application surface needs them.

Run `npm run verify` and `npm run verify:dotnet` after a focused change. Treat unavailable evidence as a repair action, not as proof of compliance.

Application code, tests and build policy become adopter-owned after creation. Do not overwrite them from the profile.

Before implementing user authentication, read `assets/profiles/identity.md` in the installed Lighthouse package. Consume an external OIDC provider through maintained middleware. Keep application permissions in the product and record any custom identity-server exception explicitly.
