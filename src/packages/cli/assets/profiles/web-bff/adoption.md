# Adopt the Lighthouse web BFF profile

Select `web-bff` with `react-web-platform` and `dotnet-backend` for an authenticated private web application.

Set the session, identity provider, callback routes, logout route, allowed destinations and CSRF policy before exposing an authenticated screen.

Start with one vertical slice: sign in, load the session, call one API query, submit one mutation, handle expiry and sign out.

Existing authentication code remains product-owned. Map its behavior to the profile and record a narrow exception when migration would change a security boundary.
