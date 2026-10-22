# Backend structure and boundaries

Use the product namespace under juangcarmona. The example's namespace is `JuanGCarmona.Lighthouse.Example`; the creator replaces it with `JuanGCarmona.<Product>`. Established products retain their namespace as a documented adoption choice.

```text
src/
  root/<Product>.Api/                   host, HTTP policy, composition
  root/<Product>.AppHost/               optional development orchestration
  modules/<Product>.Modules.<Name>/
    <Name>Module.cs                     public registration and route composition
    Features/<Feature>/
      CreateThing.cs                   one complete command slice
      GetThing.cs                      one complete query slice
      Domain/                         when the feature needs domain behavior
    Infrastructure/Persistence/       when there is actual persistence
  dotnet/Lighthouse.Cqrs/              initial typed command/query contracts
  dotnet/Lighthouse.Analyzers/         local, versioned tooling source
src/dotnet/tests/                     analyzer, HTTP and architecture tests
```

Paths describe responsibilities; create folders only when they hold real code. The distributed starter keeps its examples under `src/`; generated products start directly under `src/`.

## Dependencies

The API host composes modules. A module may depend on a sibling's separate `.Contracts` assembly, never its implementation assembly. Add a contracts project only when a consumer exists. Keep contracts small: integration DTOs, stable interfaces and events that describe a real boundary. A separate contracts assembly is a structural boundary; it does not by itself guarantee safe data exposure or correct authorization.

Within a feature, use cases coordinate domain behavior and infrastructure. A command may write; a query returns a read model and must not mutate business state. Keep the domain independent of ASP.NET Core and storage APIs. A schema/DbContext per module is recommended when data ownership warrants that cost; cross-module joins or shared tables need an explicit decision. An in-memory single-module example cannot prove those persistence boundaries.

## Composition and cross-cutting behavior

Use explicit DI registration first. Introduce scanning or dispatch only when it removes measured repetition. The example injects typed handlers directly; it makes no mediator package mandatory. When logging, validation, authorization or caching become decorators, document and test their order. Authorization belongs at the edge and at the relevant domain/data boundary; validation must execute before mutation, including invocations outside HTTP.

Transactions belong to the consistency boundary of a command. Use domain events for real domain coordination; introduce an outbox when delivery must survive process/transaction failure. Cache keys and invalidation must be tested together. These capabilities are recommendations with adoption costs, not speculative packages in the starter.

## Runtime and diagnostics

Aspire owns the optional local dependency graph and startup feedback. A deployment can use containers, a managed host or another product-approved topology. Production readiness covers configuration, identity, persistent data, migrations, health, telemetry, backup/recovery and release controls; the example implements only the smaller contract documented in its README.
