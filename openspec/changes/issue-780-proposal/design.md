# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-PROFILE-CONTRACT" digest="sha256:17f929f382361372ad9c6cedef951d8639003afbbfe465477284601f4e09fdd2" -->

## Context

See proposal.md for motivation. The CLI already projects the installed UI guide and skill and records their content hashes in `.lighthouse/upgrade.json`. The UI guide identifies `tokens.css`. Existing visual compliance must not gain a source scan implicitly.

## Goals / Non-Goals

**Goals:** deterministic offline checks of explicitly inventoried standalone CSS, exact authority evidence, reviewable exceptions and independently meaningful negative fixtures.

**Non-Goals:** a general CSS engine, framework discovery, inline/template/CSS-in-JS inspection, automatic fixes, new parser dependencies, palette changes or gallery redesign.

## Decisions

1. Use optional `semanticTokens` manifest configuration with `enabled: true`, exact relative `.css` `files`, reasoned `exclude` entries and exact `exceptions`. An absent or disabled selection returns not-applicable without reading consumer sources. This reuses ordinary verification rather than introducing a second adoption state or remote capability provider. Reviewed upgrades preserve the optional manifest field.
2. Require the selected visual profile, pinned installed UI identity, managed guide/skill inventory, current installed projections and matching upgrade ownership hashes. Resolve the token asset through the installed package export and guide metadata. The UI guide declares primitive token names. Missing, duplicate, inconsistent or drifted inputs fail closed; root `DESIGN.md` is never consulted.
3. Implement a small bounded tokenizer for comments, strings, balanced functions and declaration blocks. Support flat selector rules and grouping `@media`, `@supports` and `@layer`; report other at-rules, nesting, escapes and malformed syntax as incomplete coverage. Parse every `var()` and fallback recursively, including values on otherwise literal-friendly properties. No runtime CSS evaluation or dependency addition is needed for this deliberately bounded surface.
4. Enforce semantic values for color/background, typography, radius, shadow and motion properties. Permit documented geometry and structural literals (including widths, grid, padding and margins), global keywords, transparent/currentColor and zero/none where applicable. Primitive references and undefined `--lh-*` names remain errors everywhere. Product token overrides require exact role/value exceptions; canonical installed definitions are read as authority, not scanned as consumer code.
5. Exceptions require exact path, property, value, optional selector/role, reason, owner and review date. They suppress only the matched raw-value/override diagnostic, never undefined roles, primitive references or unsupported syntax. Excluded files and always-uninspected inline/template/CSS-in-JS surfaces remain visible in successful bounded reports. Imports are not followed; unresolved imports block complete checking of the selected file.
6. Add tests and documentation with each implementation slice. Extend the existing packed-consumer script rather than replacing its assertions. Browser qualification uses the unchanged gallery at both configured viewports and all four explicit/system appearance resolutions, plus existing axe, dialog, literal-input and persistence checks.

## Risks / Trade-offs

- [Bounded grammar rejects valid CSS outside its surface] → Return actionable limitations and document supported properties; never claim arbitrary CSS support.
- [Exceptions hide unrelated problems] → Exact matching and separate unsuppressible role validation, with near-miss tests.
- [Upgrade changes authority] → Check recorded ownership against both current projected bytes and installed source; preserve upgrade conflict handling.
- [A passing bounded scan sounds universal] → Include scanned, excluded and uninspected coverage in every selected report; zero-file scans fail.

## Migration Plan

Existing adopters remain unselected. After a reviewed harness/UI upgrade, adopters explicitly add the source inventory and reviewed exceptions, run `lighthouse verify --format json`, and repair failures before relying on this check. Removing or disabling the selection restores the previous compliance surface without changing any existing guardrail. Publication, integration and merge remain separately authorized.
