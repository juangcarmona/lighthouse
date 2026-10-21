# Lighthouse contributor and adopter entrypoint

Lighthouse is the juangcarmona engineering baseline. Start with [the harness package guide](src/packages/cli/README.md). For a backend, read [the .NET profile](src/dotnet/profile/README.md), then its architecture, use-case and guardrail contracts. For interface work, read the UI package's [design guide](src/packages/ui/DESIGN.md).

Keep implementation under `src/`, including packages and examples. Package documentation stays with its owning package; repository documentation belongs under `docs/`; repository automation stays in the conventional `scripts/` root. Root-level tool directories (`.agents/`, `.github/`, `.product/`, `.vscode/`, `openspec/`) and package entrypoint metadata are integration contracts; do not relocate them without checking their owning tool. The optional .NET profile and its guidance are scoped under `src/dotnet/` and do not make the repository a root-level .NET solution.

- For agent-facing documents, use the installed `writing-for-agents` skill. For code and architecture work, use the installed `ponytail` skill.
- For human-facing prose in docs, proposals, reports and change descriptions, run the Humanizer skill when available; preserve facts, links, commands, frontmatter and code.

- Keep documentation concise, original and consistent with executable examples.
- Keep client, downstream client and employer project identities, repository paths, domains, assets and source provenance outside this repository. General engineering patterns may be documented without attribution to those sources.
- Product decisions belong to the product; record exceptions instead of silently universalizing a convention.
- ProductShape and ArcShape retain their own installation and managed-file ownership. Adopters operate their own factories; Lighthouse defines the adoptable baseline.
- Run `npm run verify` for repository checks, `npm run verify:dotnet` for backend changes and `npm run test:visual` for changes to themes or the visual gallery. `npm run verify:all` runs all three.
- Run `npm run markdownlint` for Markdown checks. Keep each logical prose paragraph on one source line; do not hard-wrap prose at a fixed column. Provider-owned generated Markdown is excluded by `.markdownlint-cli2.jsonc` and must be changed through its owning tool.
- Edit generated projections through their source and verify drift. Changes to theme tokens require light/dark, contrast, keyboard and narrow-viewport checks.
- A workflow failure fails a check. Only configured hosting rules make that check mandatory for merge; never assume branch protection is active.
