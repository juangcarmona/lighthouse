---
kind: section
title: "risks and technical debt"
section: "11"
source_url: https://docs.arc42.org/section-11/
source_author: "Dr. Gernot Starke"
license: "CC BY-SA 4.0"
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
---

# 11. Risks and Technical Debt

**Purpose.** Make known architecture risks and technical debt visible, prioritized, and actionable without presenting speculative concerns as confirmed defects.

## Subsections

- **Prioritized list/table of known risks, problems, and technical debt.** Use it when the project has relevant information; preserve project-specific naming or grouping.

## Evidence to examine

- Incidents, failure modes, security findings, and unsupported dependencies.
- Missing/outdated tests, difficult changes, migrations, and operational constraints.
- Interfaces, data models, processes, and code relevant to risks.

Use these as investigation leads, not automatic proof. Prefer current implementation, tests, configuration, and maintainer-confirmed decisions appropriate to the claim. Cite concrete repository evidence in resulting documentation. Separate observed behavior, accepted intent, inference, and proposal.

## Gaps and conflicts

- If evidence does not establish useful content, state what is missing and ask the maintainer for context.
- If sources disagree, describe the competing evidence and its source; do not silently choose one. Ask the maintainer to resolve intent or status.
- Do not invent names, responsibilities, boundaries, measures, owners, dates, or rationales to make the section appear complete.
- If the project omits, combines, or adapts this section, follow that choice and link to the content location when known.

## Practical guidance

- Record evidence, impact/likelihood only when grounded, ownership when known, and mitigation.
- Distinguish confirmed risk, technical debt, and hypothetical concern.
- Examine stakeholders, interfaces, data, processes, and source code.
- State unknown impact or ownership instead of assigning arbitrary scores.

## Sources and examples

- [arc42 Section 11: Risks and Technical Debt](https://docs.arc42.org/section-11/) — section structure and content guidance.
- [Illustrative example](https://docs.arc42.org/examples/risk-htmlsc-1/) — use as a discussion pattern; do not copy example system facts into another architecture.
- Selected practical tips:
  - [Tip 11-1](https://docs.arc42.org/tips/11-1/)
  - [Tip 11-2](https://docs.arc42.org/tips/11-2/)
  - [Tip 11-6](https://docs.arc42.org/tips/11-6/)

Creator and license: Gernot Starke, CC BY-SA 4.0. See [SOURCES.md](../SOURCES.md) for attribution and licensing scope.
## Practical tips

- [Tip 11-1: Search for problems and risks with different stakeholders!](./tips/tip-11-1-search-for-problems-and-risks-with-different-stakeholders.md)
- [Tip 11-2: Analyze (external) interfaces for problems and risks!](./tips/tip-11-2-analyze-external-interfaces-for-problems-and-risks.md)
- [Tip 11-3: Identify problems or risks by qualitative evaluation!](./tips/tip-11-3-identify-problems-or-risks-by-qualitative-evaluation.md)
- [Tip 11-4: Analyze _processes_ for problems and risks!](./tips/tip-11-4-analyze-processes-for-problems-and-risks.md)
- [Tip 11-5: Analyze data or data structures for problems and risks!](./tips/tip-11-5-analyze-data-or-data-structures-for-problems-and-risks.md)
- [Tip 11-6: Analyze source-code for problems and risks!](./tips/tip-11-6-analyze-source-code-for-problems-and-risks.md)

## Worked examples

- [Example Risk: HTML Sanity Checker](./examples/example-risk-htmlsc-1.md)
- [Example Risk: TrafficPursuitUnit](./examples/example-risk-tpu-1.md)

See the [source register](../SOURCES.md) for attribution and licensing.
