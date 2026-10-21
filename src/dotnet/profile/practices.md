# Backend practice catalog

This catalog makes the profile reviewable. Product code owners choose applicability; security/data owners accept changes to their boundaries. “Reference” means the example demonstrates a pattern. “Enforced” names the current tool. A recommendation becomes a gate only after a product implements and verifies it.

| Practice | Problem addressed / when to apply | Mechanism in this release |
| --- | --- | --- |
| One deployable host, modules at real seams | Keep operations simple while preserving domain/data ownership; extra modules add coordination cost | Reference layout; boundary design is a review decision |
| Feature-first organization | Keep behavior changes adjacent; avoid mandatory layer-by-layer file hopping | Reference and guidance |
| One file per command/query | Keep route, DTOs, request, validation and handler together | Reference and review; file shape has no custom analyzer yet |
| CQRS without separate storage by default | Distinguish reads from writes without adding a broker/read replica prematurely | Typed handler contracts and two working slices |
| HTTP-independent handlers | Reuse/test application behavior without transport dependencies | Reference; dedicated dependency rule is future work |
| Internal sealed handlers | Prevent application implementation from becoming a public API or inheritance surface | Enforced LH1001 for supported handler interfaces |
| Public composition, private implementation | Make module registration explicit; expose only deliberate integration contracts | Reference; public entity-leak rule is future work |
| Sibling Contracts assemblies | Stop modules depending on implementation internals; add contracts only for an actual consumer | Enforced LH1002 plus compiled architecture test |
| Small shared kernel | Keep genuinely common technical contracts in one place without building an internal framework | Two typed handler interfaces; review additional abstractions |
| Validation before side effects | Reject bad commands whether invoked through HTTP or another path | Reference handler validates before mutation; HTTP tests |
| Explicit typed outcomes / ProblemDetails | Keep expected failures separate from unexpected exceptions and stable at the edge | Reference validation/missing-resource responses; HTTP tests |
| Cross-cutting pipeline with tested order | Avoid inconsistent logging/validation/cache behavior after repetition justifies decorators | Recommendation; document order and test cache invalidation if introduced |
| Trusted identity and authorization | Prevent callers from selecting their own owner/tenant boundary | JWT edge policy and 401/403 tests; tenant data checks require a persistent product slice |
| Module-owned persistence and migrations | Avoid accidental shared-table coupling; separate schema/DbContext when ownership warrants the complexity | Recommendation; example has only in-memory storage |
| Transaction boundaries per command | Make all-or-nothing behavior and concurrency conflicts explicit | Recommendation; database-backed tests required when introduced |
| Domain events with durable delivery when needed | Keep domain coordination explicit; use an outbox only when delivery must survive failure | Recommendation; no event/outbox framework in the starter |
| Read-model cache and tested invalidation | Reduce measured read cost without returning stale business state | Recommendation; no cache in the reference |
| Cancellation and explicit identifiers | Bound abandoned work and expose stable resource identity | Reference propagates CancellationToken and uses GUID-v7 identifiers |
| Same-origin/BFF where appropriate | Simplify browser session and API trust boundaries for products that benefit from one web origin | Optional architecture choice; no frontend/BFF in the example |
| Generated API contracts | Detect API/client drift while keeping generated files disposable | Recommendation; require a real consumer before adding generation |
| Structured logs and trace context | Diagnose a failed use case without logging sensitive payloads | Host development logging; exporter, redaction and event-ID policies remain product work |
| Aspire development graph | Start related services with observable readiness and coherent configuration | Runnable AppHost for the API; provision only dependencies the product uses |
| Layered verification by risk | Catch cheap faults early and reserve expensive journeys for valuable system behavior | Semantic analyzer, architecture and HTTP tests; engine/browser backend journeys added when needed |
| SDK/package pins and lockfiles | Make local and CI feedback reproducible | Locked restore, central versions and SDK feature band |
| Warnings, style and audit as failures | Surface compiler issues, code drift and known vulnerable dependencies before merge | SDK analysis, format verification and NuGet audit in the verifier |
| Scoped CI with evidence of routing | Control cost without letting path filters hide meaningful changes | Current CI runs all selected profile checks; selective routing needs its own tests |
| Concise agent/document routers | Help humans and agents find behavior, architecture and commands without duplicated truths | AGENTS entrypoint and profile navigation |
| Owned, expiring exceptions | Make deviations deliberate and reversible | Documented process; no expiry automation is claimed |

Use [architecture](architecture.md) for dependency direction, [use cases](use-cases.md) for implementation detail, and [guardrails](guardrails.md) for diagnostics, failure consequences and exception ownership.
