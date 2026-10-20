---
name: arcshape-adr
description: Draft, review, and maintain Markdown Architecture Decision Records from a decision supplied by a maintainer and supporting repository evidence. Use when a durable architecture trade-off needs a record.
---

# ArcShape ADR workflow

1. Confirm the decision being made and who has authority to accept it. If the decision itself is unknown, ask; do not infer a choice from implementation alone.
2. Inspect existing ADR conventions, indexes, relevant arc42 sections, and evidence. Default only when no repository convention exists: `docs/adr/` with four-digit sequential filenames.
3. Draft a Markdown ADR with Context, Decision, Alternatives considered, Consequences, and References. Separate supplied decisions from observed facts and unresolved assumptions.
4. New records are Proposed unless the maintainer explicitly says the decision is accepted. Include the rejected alternatives and why they were rejected.
5. Never rewrite history to reverse a decision. Propose a new ADR and show any superseding relationship for review. Keep the existing ADR's status until the new decision is accepted; then mark the old record superseded. Confirm the relationship with the maintainer before recording it.
6. Update an existing ADR index if the repository has one. For an accepted decision, update arc42 section 09 when present with a concise decision, ADR link, and affected architecture. Do not put proposed decisions in the current architecture index.
7. Show the complete diff and summarize open questions. Leave acceptance to the maintainer.

Keep the ADR and its index in Markdown. Do not invent a repository index if the project has none; report that clearly.
