# External user identity

For products that need user authentication, use an external OpenID Connect (OIDC) provider and maintained framework middleware. Public applications need not add authentication. Keycloak is the recommended self-hosted reference; an existing standards-compatible provider is equally valid. Lighthouse defines this integration guidance and does not provision identity infrastructure.

## Ownership and deployment

Reuse a shared identity service when available. If none exists, the operator may deploy Keycloak independently of the application. Application removal must not delete the shared service, realm, accounts or database. Disposable development providers must be isolated from real users.

Register separate clients for applications and client types, with environment-specific registrations, exact redirect and post-logout URLs, minimal scopes and appropriate API audiences. Choose realms by identity and administrative boundaries, not by repository count. Do not use the Keycloak master realm for application users.

The operator owns TLS, a stable issuer address reachable by browsers and backends, persistent storage, tested backups, updates, restricted administration and emergency access independent of the identity service. Production deployment must not use development mode. Provider outages must not create an authentication bypass; document what happens to existing sessions and cached token validation.

## Application contract

- Delegate sign-in, passwords, recovery, MFA and social identity federation to the provider. A custom credential store or authorization server requires a recorded product and architecture exception with owner, reason and security evidence.
- Use Authorization Code with PKCE for interactive sign-in. Web BFFs keep tokens on the server and expose protected session cookies. Native clients use the system browser, secure token storage and no embedded client secret.
- APIs validate access-token signature, issuer, audience and expiry through maintained middleware; an ID token is not an API access token. Reject missing credentials and insufficient permissions without fallback identities.
- Map identities using issuer and subject, not email alone. Keep domain membership, resource access and tenant isolation in the application. Provider roles may supply coarse permissions but do not replace resource authorization.
- Treat access to external services as a separate authorization grant. An OIDC login does not grant repository access or permission to act as that user in another service.
- Implement local logout and document provider logout, revocation and session expiry separately. Signing out of one application must not silently promise immediate invalidation of every token or every other application session.

Keep issuer, client ID, audience, scopes, callback URLs and secret references in the application's existing configuration mechanism. Store secrets outside source control. Do not add a second identity configuration schema in Lighthouse. Changing providers may change issuer and subject identifiers; plan account linking and migration explicitly.

## Acceptance evidence

Before declaring the authenticated slice complete, demonstrate sign-in and callback validation, session expiry, logout and user switching against a real test provider. Test rejected callback state/nonce, wrong issuer/audience, expired tokens, missing credentials, insufficient permissions and access to another user's resources. Exercise CSRF protection for cookie-authenticated mutations. Verify that disabling an account has the documented session effect.

Use isolated test accounts and sanitized evidence. Test-only identity overrides must never be enabled in the deployed application. Record provider/version, non-secret configuration, tested behavior and unresolved gaps in the application's existing acceptance evidence; do not copy tokens or credentials into logs or screenshots.

These are semantic and integration requirements. Lighthouse's foundation verifier checks managed-file drift, not provider availability or security correctness. Each adopter supplies runtime tests and reviews; unavailable evidence remains a gap.

## Provider references

Use the [Keycloak administration guide](https://www.keycloak.org/docs/latest/server_admin/) for realms, clients and identity federation, and the [production configuration guide](https://www.keycloak.org/server/configuration-production) for operating the service. Provider deployment details remain operator-owned.
