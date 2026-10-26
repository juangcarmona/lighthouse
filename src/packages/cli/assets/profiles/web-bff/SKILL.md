---
name: lighthouse-web-bff
description: Apply the Lighthouse web BFF profile when a repository selects web-bff for an authenticated web application.
---

# Lighthouse web BFF profile

Read the profile guide before changing an authenticated web adopter.

Keep OAuth tokens on the server side. Use Authorization Code with PKCE and a Secure, HttpOnly session cookie with an explicit SameSite policy.

Validate origin and CSRF state, allow only declared destinations and routes, and expose stable ProblemDetails with correlation IDs.

Implement logout, revocation, expiry and user switching as tested behavior. Keep rate limiting and observability at the BFF boundary.

Run the session, API, browser and security checks after a focused change. Treat a missing security check as a repair action.

Before implementing user authentication, read `assets/profiles/identity.md` in the installed Lighthouse package. Consume an external OIDC provider through maintained middleware. Keep application permissions in the product and record any custom identity-server exception explicitly.
