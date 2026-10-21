# Enforcement matrix

This matrix describes checks that exist in Lighthouse now. Product proposals and recommendations are not active gates.

| Rule | Class | Owner | Verification | Failure consequence | Exception |
| --- | --- | --- | --- | --- | --- |
| Manifest required fields and safe managed paths | Local CLI + test | Lighthouse maintainers | `npm test` | Nonzero exit | Fix the CLI or evolve the schema with migration |
| Generated projection matches manifest | Local CLI | Adopting repository maintainer | `lighthouse verify` | Nonzero exit | Change the manifest and regenerate |
| Markdown prose layout | `markdownlint-cli2` plus `no-hard-wrapped-prose` | Lighthouse maintainers | `npm run markdownlint`; included in `npm run verify` | Nonzero exit | Keep provider-owned generated Markdown under its owning tool |
| Common repository conventions | Documentation / agent guidance | Product maintainer | Review | Finding; no automatic block | Document scoped exception |
| ProductShape / ArcShape integration | Documentation; tool only when adopted | Product/architecture owner | Their CLI and pinned version | Their configured validator result | Versioned opt-out recorded in manifest |
| .NET handler/module rules | Roslyn local build + semantic tests + CI job | Lighthouse / product maintainers | `npm run verify:dotnet` | Build/test/verifier fails | [Narrow documented exceptions](../src/dotnet/profile/guardrails.md) |
| .NET auth/validation outcomes | Functional tests + CI job | Product maintainer | Same command, real ASP.NET test pipeline | Failed test | Product behavior decision |
| Dependency resolution/audit | Locked NuGet restore, warnings-as-errors + CI job | Maintainer / security owner | Same command | Restore fails | Reviewed pin or expiring risk acceptance |
| Visual contrast, semantics and interactions | Playwright + axe tests + CI job | Visual maintainer | `npm run test:visual` | Failed browser check | Fix behavior or document platform-specific compatibility |
| Theme artifact boundary | Package smoke test + CI job | Theme maintainer | `npm run verify` | Failed package test | Reviewed distribution change |
| Other stack profiles | Documentation / proposed | Stack owner | Future profile-specific checks | Review finding today | Product-specific profile decision |
| CI-required checks | CI gate only when wired and branch-protected | Repository maintainer | Workflow plus hosting rules | Merge blocked by hosting | Maintainer changes policy with record |

Lighthouse does not have access to adopter branch-protection settings, so a manifest cannot claim that a CI status is required. Each adopting repo must document the actual workflow and hosting consequence.
