# Lighthouse .NET profile

Use this profile to create an ASP.NET Core backend or assess an existing one. The executable reference targets .NET 10 and combines Minimal APIs, one file per command/query slice, a modular monolith structure, Aspire development orchestration, typed CQRS contracts and Roslyn boundary checks.

| Start here | Then follow |
| --- | --- |
| New backend | [Adoption](adoption.md#new-backend) → [layout and boundaries](architecture.md) → [one-file use cases](use-cases.md) |
| Existing backend | [Assessment and adoption](adoption.md#existing-backend) → [guardrail matrix](guardrails.md) |
| Implement a capability | [Use-case contract](use-cases.md) → [tests](testing-and-development.md) |
| Review all backend practices | [Practice catalog, applicability and real mechanisms](practices.md) |
| Diagnose a failed build | [Diagnostics and exceptions](guardrails.md) |

## Defaults

- Start with one deployable API. Introduce a module only for a real ownership, domain, data or lifecycle boundary; keep features within a module by default.
- Use Minimal APIs. Place transport mapping, request/response records, command or query, validator and handler in one use-case file. Keep the handler independent of HTTP.
- Keep handlers `internal sealed`. Expose module composition and intentionally designed contracts; do not expose persistence or domain implementation types.
- Treat commands and queries as separate responsibilities. CQRS does not require separate databases, a broker or eventual consistency.
- Validate before side effects. Translate expected outcomes into useful HTTP statuses/ProblemDetails at the endpoint. Propagate cancellation.
- Run analyzers during local build and CI, back them with semantic tests and retain a narrow exception process.

## Working implementation

```sh
dotnet restore src/dotnet/Lighthouse.slnx --locked-mode
npm run verify:dotnet
dotnet run --project src/dotnet/examples/src/root/Lighthouse.Example.Api
```

The distributed starter includes a Catalog example that exercises a POST command and GET query. Its store is in memory and deliberately disposable. JWT authorization is enforced; test identities live only in the test assembly. Production persistence, multitenancy, migrations, distributed caching and outbox delivery require product-specific design and tests.

The [enforcement table](guardrails.md) distinguishes implemented rules from recommendations. No rule implies remote branch protection or production readiness.
