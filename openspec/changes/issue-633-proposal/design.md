# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:39d5fabc1afdaec4f779b28efcd21b86ec5c86635b13c1d6283c359ae67823a3" -->

## Context

See proposal.md for motivation. Local fingerprint collection rejects the 513th file; preparation rejects graphs above 512 nodes; installation rejects inventories above 513 entries including the index. API fingerprints also reject both accepted and overlaid model inventories above 512 files. JSON serialization itself has no count-only ceiling. The source snapshot's 5,000-file/32 MiB limits and API tree's 10,000-entry bound protect whole-source resources, not model artifact counts, and remain unchanged.

## Goals / Non-Goals

**Goals:** Process every artifact within explicit byte budgets; keep local/API fingerprints identical, baseline checks intact and installed reports read-only. Test 640 real provider artifacts end to end, with additional synthetic resource-bound cases.

**Non-Goals:** Unbounded memory/runtime, changes to ProductShape schemas or validation, consumer-specific model fixtures, or changes to candidate-file/publication limits unrelated to accepted-model evidence.

## Decisions

- Remove the five model count checks rather than raising them to another arbitrary ceiling. Keep graph-array, safe path/identity, duplicate-report, inventory-completeness and baseline checks.
- Preserve fingerprint format and sorting. Hash each local file immediately and retain only its path and hash rather than all source buffers. Enforce 64 KiB per file and 8 MiB total, matching the API model budget; do not replace the removed count limit with unlimited model bytes.
- Preserve preparation's 512 KiB per report and 16 MiB total report budget. Explicitly check its serialized index against the existing installation limit of 512 KiB before writing it. Installation retains 512 KiB per file and 17 MiB aggregate limits; validate index file type/size before parsing. Use a set for report membership to avoid quadratic inventory validation as artifact count grows.
- Add the exact trusted core as a development dependency, not a runtime dependency. Use real provider validation, inspect, impact and citation output for the 640-artifact path. Use controlled provider doubles only for byte-budget and malformed-input tests.

## Risks / Trade-offs

- [Large graphs can still exceed resource budgets] → Keep explicit byte guards and document that count-independent support is not unlimited size support.
- [Fingerprint compatibility could regress] → Compare local and API hashes, including overlays beyond 512 files, and independently compute the expected hash.
- [Tests could silently substitute a provider double] → Load the pinned core through the production loader and verify all installed reports against real inspect, impact and citation output.

## Migration Plan

Ship a patch release of the SDLC package; no data migration or model rewrite is needed. Roll back the adapter release if required; existing fingerprint encoding is unchanged.
