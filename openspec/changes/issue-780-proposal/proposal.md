# Proposal

<!-- pdac-scope: cited -->

## Why

The visual profile checks installed guidance and token presence, not consumer CSS declarations. Adopters need an explicit, bounded source check without acquiring new compliance obligations merely by selecting or upgrading the visual profile.

## What Changes

- Add separately enabled standalone CSS checking to `lighthouse verify`, with an exact source inventory and reasoned exclusions.
- Resolve visual authority from the manifest, managed guide and skill, upgrade ownership hashes and installed UI exports; never substitute a root design file.
- Diagnose undefined roles, primitive references and raw presentation values, including fallback bypasses; accept only narrow, reviewed product exceptions.
- Report unsupported syntax, imports and uninspected source surfaces as coverage limitations.
- Extend package-consumer and unchanged-gallery verification without changing tokens, recipes, layout or interactions.

## Capabilities

### New Capabilities

- `standalone-css-semantic-tokens`: Independently selected consumer CSS verification, adopted authority resolution, scoped exceptions and honest coverage reporting.

### Modified Capabilities

None. The installed capability inventory has no existing visual-source checking specification.

## Impact

CLI verification, manifest schema, guardrail metadata, UI guidance, inline test fixtures, packed-consumer checks and gallery browser assertions change. No dependency, package version, palette, runtime component or framework support is added. Existing verification and ownership consequences remain intact.

<!-- pdac:cite id="FR-PROFILE-CONTRACT" digest="sha256:17f929f382361372ad9c6cedef951d8639003afbbfe465477284601f4e09fdd2" -->
