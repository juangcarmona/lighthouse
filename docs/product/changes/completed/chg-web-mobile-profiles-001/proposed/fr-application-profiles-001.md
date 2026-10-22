---
id: FR-APPLICATION-PROFILES-001
type: functional-requirement
title: Provide bounded web and mobile application profiles
status: draft
derived-from: [UC-ADOPT-PROFILE, BR-OWNED-AUTHORITY]
verification:
  - scenario: An adopter can inspect the React web, web BFF, PWA, Expo and MAUI profiles, their prerequisites, owned surfaces, commands, guardrails, verification and repair hints before selecting one.
  - scenario: A web composition can run a first vertical slice through the BFF with session, authenticated screen, API query, mutation, loading, empty, error and authentication failure evidence.
  - scenario: A mobile composition proves authentication, secure storage, an API call and a real interaction on the selected emulator or device evidence route.
  - scenario: Invalid profile combinations, missing prerequisites and platform-specific exceptions are rejected before initialization writes files.
uses-terms: [TERM-PROFILE, TERM-GUARDRAIL, TERM-FOUNDATION]
---

## Requirement

Lighthouse MUST provide the following selectable application profiles:

- `react-web-platform` for React and TypeScript web applications with strict typing, thin routes, an app shell, feature slices aligned with bounded contexts and use cases, explicit API contracts, URL-backed navigation state, server state through TanStack Query, i18n, visual-theme integration, unit and component tests, browser tests, accessibility checks and reproducible builds.
- `web-bff` for authenticated web applications. It MUST use a same-origin BFF when practical, keep OAuth tokens outside browser JavaScript, use Authorization Code with PKCE, Secure and HttpOnly cookies, explicit SameSite and CSRF protection, logout and revocation, destination and route allowlists, rate limiting, correlation IDs, observability and ProblemDetails. It MUST reject arbitrary proxying and browser token storage. It MAY live inside the ASP.NET Core application host.
- `pwa-capability` as an optional extension of `react-web-platform` for manifest, icons, installability, service-worker asset caching, update policy and declared offline behavior. It MUST NOT enable offline-first behavior or private API caching by default, and it MUST test logout, session expiry and user changes.
- `mobile-expo` for real Android or iOS requirements using Expo, React Native, Expo Router, TypeScript, TanStack Query, secure storage, deep links, permissions, push notifications, native builds and native tests. It MUST NOT be selected automatically with `react-web-platform`.
- `mobile-maui` for real Android or iOS requirements using .NET MAUI, C#, XAML, lifecycle handling, secure storage, deep links, notifications, permissions, device capabilities, native tests and OIDC Authorization Code with PKCE. Packaging and signing apply only when the product selects them.

Profiles MUST preserve vertical feature slices and MUST NOT require global `services`, `utils`, `hooks` or `components` directories as the primary structure. They MUST expose interaction states, explicit contracts, stack-specific commands and deterministic verification. A web profile MUST use the existing browser evidence contract for critical journeys. A mobile profile MUST separate native evidence from an optional web export.

Profiles MUST declare valid combinations, incompatible combinations, prerequisites, owned surfaces, stacks, libraries, generated structure, commands, hard and soft guardrails, verification methods, failure consequences, repair hints, exceptions, consumer fixtures and upgrade strategy. The profile contract MUST distinguish reusable API, contracts, permissions, pure business rules, errors, functional states, telemetry and visual principles from platform-specific components, layout, routing, authentication, storage, lifecycle, filesystem, push, camera and navigation.

The supported combinations MUST include public web with `react-web-platform` and `visual-theme`; private web with `react-web-platform`, `web-bff`, `visual-theme` and `dotnet-backend`; private PWA with those profiles plus `pwa-capability`; TypeScript mobile with `mobile-expo` and `dotnet-backend`; .NET mobile with `mobile-maui` and `dotnet-backend`; React web with MAUI with the corresponding web, BFF, mobile and backend profiles; and no simultaneous Expo and MAUI selection without an explicit product decision.

The first web vertical slice MUST cover login or session, an authenticated screen, an API query, a mutation, loading, empty, error and authentication-failure states, automated tests and evidence through the BFF and browser route. The first mobile vertical slice MUST cover authentication, secure storage, one API call, one real interaction and emulator or device evidence.

## Rationale

Application profiles make the foundation useful for real project starts while keeping architecture choices explicit, composable and verifiable. Platform boundaries remain visible instead of being hidden behind a universal template.
