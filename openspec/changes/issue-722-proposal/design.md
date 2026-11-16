# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

## Context

See proposal.md. Evidence selection currently flattens all strings before applying its 256-KiB guard. Retained drafts already bind source, baseline, schema, path, revision and content hashes. Composition already supports bounded inspection and exhaustive explicit selections and omissions.

## Goals / Non-Goals

**Goals:** Keep evidence selection proportional to unique references; expose current retained paths once; preserve exact document bytes, every decision and original authority inputs.

**Non-Goals:** Summarization, implicit decision replacement, a general context service, new tools or permissions, changed provider ownership, candidate limits or approval/publication rules.

## Decisions

1. Scan bounded input strings for artifact IDs and sort/deduplicate IDs before the existing reference-scope guard. Bound authenticated issue/answer text to 2 MiB, complete host projection input to the existing 4-MiB audit transport bound, and references to 256 KiB; also bound nesting and entry count. Metadata and repeated continuation copies do not consume the authenticated-text allowance a second time. Never truncate. Keep the existing ID matching and direct-neighbour selection semantics. Raising the old guard would retain unnecessary work and fail to separate limits.
2. Reuse the retained inventory validator. Count repeated exact path/content objects once toward retained storage bounds, but retain all source/revision references and refuse duplicate path revisions. Bound declarations and references separately. Explicitly revised draft paths supersede prior document versions only; absent paths do not imply deletion and prose decisions never supersede one another automatically.
3. The adapter builds a working copy, removes only validated retained declaration bodies in favour of exact references, and exposes a current catalog. Keep prose in issue and answers verbatim. Replace redundant copies of those exact bodies with source pointers, not model summaries. Keep all original context bytes in `/workspace/.lighthouse-product-audit.json` through the existing read-only source mount; refuse a source-file collision. Composition reads that original input. Raw request/task identity and publication checks continue using the original host context. No read permissions change.
4. Apply projection only to Product Change workers. Unsupported or stale declarations fail before execution, not after partial output. Literal drafting and ordinary workers remain compatible. Existing read-only input access supplies audit retrieval; existing inspect supplies retained bodies.

## Risks / Trade-offs

- [Ambiguous history] → Refuse equal path revisions and malformed/stale bindings; preserve all other prose for worker assessment, including conflicting decisions.
- [Large unique prose or references] → Refuse at independent bounds rather than truncate or guess authority.
- [Projection mistaken for authority] → Label audit path and digest, preserve request identities, and document that current references do not approve or apply a candidate.
- [Synthetic transport differs from installed runtime] → Record local evidence separately from native qualification; do not claim adoption.

## Migration Plan

Ship a patch changeset after normal review, checks and integration. Adopt through the released package and reviewed workflow pin; rollback through normal package/pin selection. No data migration or historical comment edits.
