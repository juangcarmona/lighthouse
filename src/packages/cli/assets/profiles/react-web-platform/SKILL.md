---
name: lighthouse-react-web
description: Apply the Lighthouse React web profile when a repository selects react-web-platform.
---

# Lighthouse React web profile

Read the profile guide before changing a React adopter.

Keep routes thin and organize behavior by feature and bounded context. Put screens, API calls, queries, mutations, components, types and tests beside the feature that owns them.

Use TanStack Query for server state. Keep local UI state local and put filters, pagination and meaningful navigation state in the URL.

Use explicit API contracts and render loading, empty, error, disabled and validation states for each interactive surface.

Run the project's typecheck, lint, format, build, unit and browser checks after a focused change. Use axe evidence for critical surfaces.

Application code, tests, dependencies and build policy become adopter-owned after creation. Do not overwrite them from the profile.
