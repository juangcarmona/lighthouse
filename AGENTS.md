# Lighthouse contributor and adopter entrypoint

Lighthouse is the juangcarmona engineering baseline. Start with [the adoption routes](docs/adoption.md). For a backend, read [the .NET profile](docs/profiles/dotnet/README.md), then its architecture, use-case and guardrail contracts. For interface work, read [the design guide](docs/design/README.md).

Keep implementation under `src/`, including packages and examples. Maintained documentation belongs under `docs/`, and repository automation stays in the conventional `scripts/` root. Root-level tool directories (`.agents/`, `.github/`, `.product/`, `.vscode/`, `openspec/`) and package entrypoint metadata are integration contracts; do not relocate them without checking their owning tool. The optional .NET profile is scoped under `src/dotnet/` and does not make the repository a root-level .NET solution.

- For agent-facing documents, follow [agent-facing writing](docs/agent-writing.md). For code and architecture work, follow [pragmatic engineering](docs/pragmatic-engineering.md).
- For human-facing prose in docs, proposals, reports and change descriptions, run the Humanizer skill when available; preserve facts, links, commands, frontmatter and code.

- Keep documentation concise, original and consistent with executable examples.
- Keep client, downstream client and employer project identities, repository paths, domains, assets and source provenance outside this repository. General engineering patterns may be documented without attribution to those sources.
- Product decisions belong to the product; record exceptions instead of silently universalizing a convention.
- ProductShape and ArcShape retain their own installation and managed-file ownership. Adopters operate their own factories; Lighthouse defines the adoptable baseline.
- Run `npm run verify` for repository checks, `npm run verify:dotnet` for backend changes and `npm run test:visual` for changes to themes or the visual gallery. `npm run verify:all` runs all three.
- Run `npm run markdownlint` for Markdown checks. Keep each logical prose paragraph on one source line; do not hard-wrap prose at a fixed column. Provider-owned generated Markdown is excluded by `.markdownlint-cli2.jsonc` and must be changed through its owning tool.
- Edit generated projections through their source and verify drift. Changes to theme tokens require light/dark, contrast, keyboard and narrow-viewport checks.
- A workflow failure fails a check. Only configured hosting rules make that check mandatory for merge; never assume branch protection is active.
