---
name: arc-adr
description: Draft and maintain Markdown Architecture Decision Records using ArcShape's standalone workflow or the shared ADR workflow when installed. Use when a durable architecture trade-off needs a reviewable record.
---

# ArcShape ADR workflow

## Relationship to the shared workflow

When the shared `adr` skill is installed, use it as the authority for decision responsibility, record conventions, statuses, indexes, and the architecture-index handoff. This ArcShape skill adds no competing rules; it provides the same complete workflow for repositories that use ArcShape without the shared skill. ArcShape does not provide a separate ADR command or record format.

## Standalone workflow

1. **Confirm decision authority.** Identify the maintainer or role authorized to decide. Repository evidence establishes current behavior and constraints, not intent or acceptance. Ask for the decision if it is unknown; do not infer it from implementation, plans, or issue text. New records stay Proposed unless the maintainer explicitly confirms acceptance.
2. **Inspect the canonical collection.** Read the existing ADR files, index, relevant accepted ADRs, and arc42 section 09 when present. Reuse the repository's folder, filename, metadata, status, and index conventions. Never create a parallel collection.
3. **Use the default only when no convention exists.** Create `docs/adr/` and `docs/adr/README.md`; name files `ADR-0001-kebab-case-title.md`, using the next unique four-digit ID. Numbers only increase and are never reused. Copy [`references/template.md`](references/template.md). If an established collection has no index or its convention is ambiguous, report the gap and ask before changing it.
4. **Complete the record from supplied intent and evidence.** Keep Context neutral and separate observed behavior, maintainer intent, assumptions, and unresolved questions. State the authorized decision in Decision. Include the main rejected alternatives and reasons, positive/negative/neutral consequences, and references. Remove all template guidance and placeholders.
5. **Preserve decision history.** Reverse a decision in a new ADR. Do not mark the old decision superseded until the replacement is accepted. Confirm superseding relationships with the maintainer before recording them.
6. **Update the canonical ADR index.** Add every record to the repository's existing index. The default `README.md` index links the ADR ID/title and shows status and date in ID order. Keep rationale and consequences in the ADR rather than copying them into the index.
7. **Update arc42 section 09 only for accepted decisions.** When `docs/architecture/09-architecture-decisions.md` exists, index an accepted decision with `Decision`, `ADR`, and `Affected architecture`. Keep proposed decisions out of the current-architecture index. Do not copy the ADR rationale or modify other arc42 sections here; the architecture documentation workflow owns the resulting system shape.
8. **Present the proposal.** Show the complete diff, identify evidence and assumptions, report the file path and ID, and summarize open questions. Leave decision and documentation acceptance to the maintainer.

## Default status vocabulary

Use the repository's existing vocabulary when it has one. For the default convention, use only these values:

| Status | Meaning |
| --- | --- |
| `Proposed` | Under discussion; default for a new record. |
| `Accepted` | Explicitly agreed by the authorized maintainer and in effect. |
| `Rejected` | Considered and declined; retained for the record. |
| `Deprecated` | No longer applies and has not been replaced. |
| `Superseded by ADR-NNNN` | Replaced by a later accepted decision; link that record. |

## Validation

- The filename and frontmatter ID follow the repository convention; the default is a unique, sequential `ADR-NNNN-kebab-case-title.md` record.
- Frontmatter follows the repository convention; the default fields are `id`, `title`, `status`, `date`, and `deciders`. Add `supersedes` or `superseded_by` only for confirmed relationships.
- The record has Context, Decision, Alternatives considered, Consequences, and References in order, with no placeholders.
- The authorized maintainer supplied the decision and acceptance status; neither was inferred from implementation evidence.
- The canonical ADR index has the matching entry, or an established absence is reported.
- Arc42 section 09 indexes accepted decisions only and remains a concise navigation table.
