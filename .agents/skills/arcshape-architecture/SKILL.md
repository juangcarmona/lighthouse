---
name: arcshape-architecture
description: Reverse engineer, create, and maintain evidence-grounded arc42 architecture documentation in Markdown for any repository. Use when documenting a system, improving architecture docs, or reconciling docs with implementation evidence.
---

# ArcShape architecture documentation

Use this skill to understand a repository and propose accurate architecture documentation. The repository language and stack are not prerequisites: follow evidence in Markdown, configuration, source, tests, deployment manifests, and operational files.

## Operating rules

- Treat existing repository evidence as observations, not proof of intent. Distinguish observed behavior, maintainer-supplied intent, and proposals.
- Never claim a subsystem or behavior is implemented based only on plans, issue text, or generated docs. Cite concrete paths and relevant sections in the working notes.
- Surface contradictions, gaps, uncertainty, and stale documentation. Ask the maintainer when a decision or intent cannot be inferred safely.
- Preserve the project's existing architecture documentation conventions. ArcShape's default Markdown location is `docs/architecture/` with the 12 numbered arc42 sections.
- Draft changes for review. Do not declare proposals accepted or silently overwrite a maintainer's authored material.
- Keep diagrams in Mermaid inside Markdown. Prefer C4 context/container/component views and label relationships with concise meaning.

## Reverse engineering workflow

1. Inspect repository guidance, existing architecture docs, ADRs, product definition, and recent changes before analyzing implementation.
2. Start or resume a bounded evidence session with `arcshape session start` / `arcshape session status` / `arcshape session next`. Use each returned round to inspect sources; do not attempt to read the entire repository in one pass.
3. For each source, record its classification and what it establishes with `arcshape session mark`. Record newly discovered paths as leads and unresolved intent as questions. Correct mistakes with `unmark`; preserve uncertainty instead of filling gaps.
4. Track coverage and changed evidence. Re-read sources ArcShape reports as changed before relying on earlier notes. Continue until the session report distinguishes reviewed, excluded, pending, and changed evidence.
5. Build a compact evidence map: system boundary, users/external systems, runtime units, interfaces, data stores, deployment, cross-cutting mechanisms, quality goals, risks, and unknowns. Link every material claim to evidence.
6. Compare the evidence map with the 12 arc42 sections. Propose focused Markdown edits, marking inferred claims and unresolved questions for maintainer review.
7. Review all internal links and Mermaid syntax, then build the reader site with `arcshape site build` and inspect the generated output.

## Maintain documentation

When docs already exist, compare each claim against current evidence. Preserve accurate content, correct stale details, remove duplication, and record unresolved discrepancies. Do not rewrite sections merely to fit a template. Keep source Markdown canonical; the HTML site is generated output.

## CLI tools

Use the CLI for repeatable operations: `arcshape init`, `arcshape session ...`, `arcshape validate`, `arcshape sync ...`, and `arcshape site build`. Run `arcshape validate --links --citations` when the repository has a ProductShape model. Citation validation uses the repository's installed `@prodshape/cli`; it reports stale citations as warnings and unresolved citations as errors. Do not rewrite citations automatically. This skill owns repository interpretation, questions, and proposed documentation. Report when a requested deterministic CLI subcommand is unavailable; do not invent one.
