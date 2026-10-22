# Tests and development feedback

Run `npm run verify:dotnet` from Lighthouse or the generated backend. It performs locked restore, Release build, tests and a deliberately failing-build rehearsal. The repository CI definition runs this command as its .NET job.

| Level | Purpose | Reference / cost |
| --- | --- | --- |
| Analyzer semantic fixtures | Reject forbidden shapes and allow legitimate code | Compiler in memory; fast |
| Architecture | Inspect actual exports and assembly dependencies | Compiled assemblies; fast |
| Functional HTTP | Verify routing, auth, validation and responses through the real ASP.NET pipeline | WebApplicationFactory; no network/services |
| Persistence | Prove queries, transactions, schema and isolation against the real engine | Add Testcontainers when persistence is introduced |
| Browser journey | Prove an actual user interaction across the system | Product UI only; slower lane |

Choose boundaries according to failure risk. Use domain tests for complex domain rules, functional tests for API/data integration, and a small number of valuable end-to-end journeys. Don't replace functional coverage with mocks or make every PR start a full deployment without evidence that the cost helps.

## Local loop

```sh
dotnet run --project src/dotnet/examples/src/root/Lighthouse.Example.Api
dotnet run --project src/dotnet/examples/src/root/Lighthouse.Example.AppHost
dotnet test src/dotnet/tests/Lighthouse.Example.Tests -c Release
```

Run either the API or AppHost entrypoint. The AppHost starts the API and exposes Aspire's local dashboard; the example has no fake database dependency. Host telemetry/health are development feedback, not proof of a production collector, alerts or durable storage. When adding PostgreSQL or another service, provision it in the local graph, wait for readiness, expose configuration through DI, and add engine-backed tests.

Configure `Authentication__Authority` and `Authentication__Audience` with the product's trusted OIDC provider for authenticated manual requests. JWT defaults require issuer/signature/expiry validation and secure metadata. The test scheme and synthetic identity headers are confined to the test assembly. Missing credentials fail closed; the example ships no bypass, identity service or secret. `/health` is a minimal process-readiness route, not proof of data-service readiness.

Use user-secrets/environment/approved secret storage for development configuration. Define production logging, redaction, traces/metrics exporters, graceful shutdown, dependency timeouts and recovery according to the product. The in-memory store and lack of full production hardening are explicit example limits.

The AppHost pins MessagePack 2.5.303 to resolve [GHSA-qhrr-8q5h-9q3h](https://github.com/MessagePack-CSharp/MessagePack-CSharp/security/advisories/GHSA-qhrr-8q5h-9q3h) while retaining NuGet audit. Revisit the override when the upstream dependency includes the fix.
