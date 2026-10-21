# Lighthouse .NET profile reference

Original backend showing a Minimal API command and query with one file per use case. `CreateEntry` keeps request/response, command, validation and handler together; `GetEntry` does the same for its query. Module composition is explicit.

Run `npm run verify:dotnet` from the repository root. The command builds the solution, tests analyzer semantics, checks compiled architecture, exercises HTTP outcomes and proves invalid modules fail compilation. Start the API or its optional Aspire AppHost as described in [the development guide](../profile/testing-and-development.md).

The store is process-local and disappears at restart. The API requires trusted JWT configuration for authenticated manual use. Functional tests replace authentication in the test host only and verify unauthorized/forbidden requests. Persistence, cross-module messaging, multitenancy, rate limiting, public OpenAPI and production observability are not implemented by this example.

Create a product with `npm run create:dotnet -- /tmp/Workshop --name Workshop`; use [the profile](../profile/README.md) for the contract and migration guidance.
