# Web BFF security contract

| Boundary | Contract | Required evidence |
| --- | --- | --- |
| Browser session | Secure, HttpOnly cookie with explicit SameSite policy | Cookie inspection and browser session test |
| Authorization | Authorization Code with PKCE | Provider configuration and callback test |
| CSRF | Origin and request-token policy for state-changing requests | Negative and positive mutation tests |
| Destinations | Explicit allowlist for outbound targets and routes | Rejected destination test |
| Proxying | Fixed routes and typed upstream calls | No arbitrary proxy path |
| Logout | Session removal and provider revocation when supported | Logout and expired-session test |
| Failure | Stable ProblemDetails and correlation ID | Error response and trace evidence |
| Abuse | Rate limiting at the boundary | Configured limit and response test |

Do not place access or refresh tokens in localStorage, sessionStorage or IndexedDB.

The BFF may be hosted inside the ASP.NET Core application host. A separate service requires a product and architecture decision with its own deployment evidence.
