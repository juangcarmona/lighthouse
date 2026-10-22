# One file per use case

Read the distributed starter's `CreateEntry.cs` and `GetEntry.cs` examples. Each file owns a concrete behavior rather than a technical layer.

| Part | Responsibility | Boundary |
| --- | --- | --- |
| Route mapping | URL, binding, authorization policy, cancellation and HTTP outcome | Thin transport adapter |
| Request / response | External input and output shape | Never expose persistence entities |
| Command / query | Application intent and its inputs | No HttpContext or IResult |
| Validator | Structural/business input constraints before mutation | Callable for non-HTTP invocations |
| Handler | Coordinate the use case and domain/storage work | Internal sealed; returns application data/outcome |

Nest these types in the use-case class so related changes remain adjacent. Omit a request DTO where there is no body and no benefit; the query example binds its ID from the route. Keep reusable domain rules in the domain rather than duplicating them across validators.

## Completion checklist

1. Define the accepted behavior and failure examples before implementing the slice.
2. Map a Minimal API endpoint and apply its real authorization policy.
3. Resolve authenticated identity/tenant from trusted context when needed; never trust an owner ID supplied by the body.
4. Map to a command/query, validate and call an HTTP-independent handler.
5. Produce explicit success, validation, missing-resource and conflict outcomes as applicable. Hide unexpected exception details behind ProblemDetails and log context without secrets or payload dumps.
6. Add the cheapest useful tests: domain rules, functional outcomes, authorization failures and persistence boundaries where present.
7. Run build/analyzers and the required verification command; record any approved exception.

The example keeps validation and outcome records local rather than introducing a general results framework. Products can choose an established result/validation library with a pinned version. Cancellation, authorization, logging and transactions still need verification regardless of the library.

## Avoid accidental complexity

Do not create a controller/service/repository class for every endpoint, a contracts assembly per feature, or a separate read database because a diagram says CQRS. Extract shared code only after a real use case needs it. Keep generated clients/metadata disposable; validate generator inputs, deterministic output and consumer contracts rather than hand-editing generated files.
