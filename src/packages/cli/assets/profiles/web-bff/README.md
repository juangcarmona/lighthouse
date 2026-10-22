# Lighthouse web BFF profile

Use this profile for authenticated web applications that need a same-origin browser session and a server-side boundary for tokens and API calls.

## Start here

| Need | Read |
| --- | --- |
| New private web application | [adoption](adoption.md) → [security](security.md) → [testing](testing.md) |
| Existing web application | [adoption](adoption.md) → [security](security.md) |
| Implement a session change | [security](security.md) → [testing](testing.md) |
| Diagnose an authentication failure | [security](security.md) |

## Defaults

Keep OAuth tokens outside browser JavaScript and use a Secure, HttpOnly session cookie with an explicit SameSite policy.

Use Authorization Code with PKCE, CSRF protection, logout and revocation, destination and route allowlists, correlation IDs, ProblemDetails and rate limiting.

Keep the BFF inside the ASP.NET Core host unless a product decision requires another deployment boundary.

Treat direct browser-to-API access as a recorded exception for public or otherwise suitable APIs.
