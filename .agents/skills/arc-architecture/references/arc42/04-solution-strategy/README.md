---
kind: section
title: "solution strategy"
section: "04"
source_url: https://docs.arc42.org/section-4/
source_author: "Dr. Gernot Starke"
license: "CC BY-SA 4.0"
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
---

# 4. Solution Strategy

**Purpose.** Summarize the few architectural approaches that shape the system and explain how they address important quality goals, constraints, and problem context.

## Subsections

- **Key technology, decomposition, quality, and organizational strategies.** Use it when the project has relevant information; preserve project-specific naming or grouping.

## Evidence to examine

- Architecture decision records and accepted design notes.
- Module boundaries, technology configuration, and integrations.
- Quality goals, constraints, and detailed views in Sections 5 and 8.

Use these as investigation leads, not automatic proof. Prefer current implementation, tests, configuration, and maintainer-confirmed decisions appropriate to the claim. Cite concrete repository evidence in resulting documentation. Separate observed behavior, accepted intent, inference, and proposal.

## Gaps and conflicts

- If evidence does not establish useful content, state what is missing and ask the maintainer for context.
- If sources disagree, describe the competing evidence and its source; do not silently choose one. Ask the maintainer to resolve intent or status.
- Do not invent names, responsibilities, boundaries, measures, owners, dates, or rationales to make the section appear complete.
- If the project omits, combines, or adapts this section, follow that choice and link to the content location when known.

## Practical guidance

- Keep this a compact orientation, not a second architecture inventory.
- Connect each approach to a quality goal or constraint and link to details.
- Separate accepted choices from proposals and unresolved alternatives.

## Sources and examples

- [arc42 Section 4: Solution Strategy](https://docs.arc42.org/section-4/) — section structure and content guidance.
- [Illustrative example](https://docs.arc42.org/examples/solution-strategy-htmlsc-1/) — use as a discussion pattern; do not copy example system facts into another architecture.
- Selected practical tips:
  - [Tip 4-1](https://docs.arc42.org/tips/4-1/)
  - [Tip 4-3](https://docs.arc42.org/tips/4-3/)
  - [Tip 4-6](https://docs.arc42.org/tips/4-6/)

Creator and license: Gernot Starke, CC BY-SA 4.0. See [SOURCES.md](../SOURCES.md) for attribution and licensing scope.
## Practical tips

- [Tip 4-1: Explain the solution strategy as compact as possible (e.g. as list of keywords)!](./tips/tip-4-1-explain-the-solution-strategy-as-compact-as-possible-e-g-as-list-of-keywords.md)
- [Tip 4-2: Describe the solution approaches as a table!](./tips/tip-4-2-describe-the-solution-approaches-as-a-table.md)
- [Tip 4-3: Describe solution approaches in context of quality requirements!](./tips/tip-4-3-describe-solution-approaches-in-context-of-quality-requirements.md)
- [Tip 4-4: In the solution strategy, refer to concepts, views or code!](./tips/tip-4-4-in-the-solution-strategy-refer-to-concepts-views-or-code.md)
- [Tip 4-5: Let the solution strategy grow iteratively / incrementally!](./tips/tip-4-5-let-the-solution-strategy-grow-iteratively-incrementally.md)
- [Tip 4-6: Justify the solution strategy!](./tips/tip-4-6-justify-the-solution-strategy.md)

## Worked examples

- [Example Solution Strategy: HTML Sanity Checker](./examples/example-solution-strategy-htmlsc-1.md)
- [Example Solution Strategy: MaMa](./examples/example-solution-strategy-mama-2.md)

See the [source register](../SOURCES.md) for attribution and licensing.
