# Web BFF testing

Test the session boundary before the browser journey: callback, cookie flags, CSRF, allowlists, logout, expiry and user switching.

| Layer | Purpose | Evidence |
| --- | --- | --- |
| Unit | Validate policy and mapping rules | Deterministic test output |
| Integration | Exercise the BFF and upstream contract | Real host or approved provider fixture |
| Browser | Prove sign in, authenticated query, mutation and sign out | Playwright evidence |
| Security review | Confirm storage, routes and failure handling | axe is complementary; security review remains explicit |

The first vertical slice must fail closed when the session is absent, expired or assigned to another user.

Keep provider credentials out of fixtures. Use a deterministic identity or approved test provider that exercises the same cookie and callback boundaries.
