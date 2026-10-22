# .NET guardrails and enforcement

Each product maintainer owns activation and exceptions. Lighthouse maintainers own the reference diagnostics and their tests. The distinction between implemented and recommended checks is part of the contract.

| Rule | Mechanism now | Failure | Exception / owner |
| --- | --- | --- | --- |
| LH1001: handlers stay internal sealed | Roslyn semantic rule for implementations of `JuanGCarmona.Lighthouse.Cqrs.ICommandHandler<,>` / `IQueryHandler<,>` | Error during module build | Maintainer records a narrow suppression and rationale; test the changed boundary |
| LH1002: sibling module access uses Contracts | Roslyn compilation rule checks assembly references in the same `.Modules.` family | Error even for an unused implementation reference | Redesign dependency; temporary scoped suppression requires owner/review date |
| Every implementation module activates the rules | Verifier inspects evaluated MSBuild properties and analyzer references for solution projects | Verifier fails if a named module silently omits enforcement | Product maintainer defines an explicit migration scope before adopting this full verifier |
| Nullable correctness and SDK analysis | `src/dotnet/Directory.Build.props`, warnings-as-errors | Compiler/analysis warning fails build | Narrow documented suppression |
| Formatting | `.editorconfig` and `dotnet format whitespace --verify-no-changes` | Verifier fails on whitespace drift | Product-owned formatting policy |
| Reproducible dependency resolution | Pinned versions, SDK feature band, committed NuGet locks, locked restore | Restore fails on drift | Reviewed dependency update regenerates locks |
| Known dependency vulnerabilities | NuGet audit of all dependencies; warnings-as-errors | Restore fails for reported advisories at low or above | Security owner decides explicit, expiring risk acceptance; no blanket audit disable |
| HTTP validation and authorization | Functional tests of 400/401/403/201/200/404 behavior | Test fails | Accepted behavior changes require corresponding product decision |
| Compiled module boundary | Reflection architecture test checks exported handlers and references | Test fails | Match product's actual architectural contract |
| Broken compilation rules really fail build | `src/packages/cli/internal/verify-dotnet.mjs` compiles deliberately invalid temporary projects | Verifier fails unless LH1001 and LH1002 reject the fixture | Fix tooling; never accept a fixture merely because a unit test passed |
| Public entity leaks, controller prohibition, domain-framework dependency | Documented profile rules; targeted automated rules are future work | Review finding today | Maintainer records exception; do not claim automatic enforcement |
| Persistent data/tenant isolation | Product-specific integration tests, recommended | No coverage in this in-memory example | Product owner and security/data owner define requirements |

## Activation

Attach the analyzer as an analyzer-only project reference, set `LighthouseModule=true` on implementation projects, and expose that property with `CompilerVisibleProperty`. Module assembly names follow `<Root>.Modules.<Name>` and separate contract assemblies end in `.Contracts`. The distributed Catalog project and build properties are the executable contract.

`LH1001` recognizes the supplied CQRS interfaces semantically, including aliases/inheritance. A different mediator/handler abstraction needs an adapter or another tested rule; class-name conventions alone are not enforcement. The rule skips compiler-generated code. `LH1002` checks compilation references for the configured naming family; it does not inspect payload semantics, reflection-based access, network calls or dependency injection at runtime. Use architecture/functional tests for those boundaries.

## Diagnostic lifecycle

New rules require positive and negative compiler fixtures, a stable diagnostic ID, useful remediation, release tracking and a failing-build rehearsal. Keep their compiler API compatible with the supported SDK. Move rules to the shipped ledger only as part of an accepted release. The current analyzers are local source tooling, not a published NuGet package.

## Exceptions

Record rule/diagnostic, affected paths, reason, owner, review date and compensating test. Suppress the smallest symbol/project scope, and remove the suppression after the migration. An architectural exception must not be disguised as generated code. CI runs the same verifier; required merge status still depends on the host's branch rules.
