---
kind: section
title: "quality requirements"
section: "10"
source_url: https://docs.arc42.org/section-10/
source_author: "Dr. Gernot Starke"
license: "CC BY-SA 4.0"
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
---

# 10. Quality Requirements

**Purpose.** Describe architecture-influencing quality requirements using concrete, assessable scenarios or measures, linking to canonical requirements where available.

## Subsections

- **10.1 Quality Requirements Overview.** Use it when the project has relevant information; preserve project-specific naming or grouping.
- **10.2 Quality Scenarios.** Use it when the project has relevant information; preserve project-specific naming or grouping.

## Evidence to examine

- System requirements and acceptance criteria.
- Load, latency, availability, recovery, security, compatibility, and maintainability evidence.
- Stakeholder priorities, SLOs, incidents, and architecture evaluation results.

Use these as investigation leads, not automatic proof. Prefer current implementation, tests, configuration, and maintainer-confirmed decisions appropriate to the claim. Cite concrete repository evidence in resulting documentation. Separate observed behavior, accepted intent, inference, and proposal.

## Gaps and conflicts

- If evidence does not establish useful content, state what is missing and ask the maintainer for context.
- If sources disagree, describe the competing evidence and its source; do not silently choose one. Ask the maintainer to resolve intent or status.
- Do not invent names, responsibilities, boundaries, measures, owners, dates, or rationales to make the section appear complete.
- If the project omits, combines, or adapts this section, follow that choice and link to the content location when known.

## Practical guidance

- Keep the highest-priority goals summarized in Section 1 and the fuller set here.
- Use measurable scenarios where evidence supports them; do not invent thresholds.
- Group large sets by category and link to canonical requirements.
- Distinguish required qualities from aspirations and resolve missing priorities with the maintainer.

## Sources and examples

- [arc42 Section 10: Quality Requirements](https://docs.arc42.org/section-10/) — section structure and content guidance.
- [Illustrative example](https://docs.arc42.org/examples/quality-requirements-1/) — use as a discussion pattern; do not copy example system facts into another architecture.
- [Quality scenarios example](https://docs.arc42.org/examples/quality-htmlsc-2/) — compare how quality scenarios are written without carrying HTML Sanity Checker facts into another architecture.
- Selected practical tips:
  - [Tip 10-1](https://docs.arc42.org/tips/10-1/)
  - [Tip 10-5](https://docs.arc42.org/tips/10-5/)
  - [Tip 10-6](https://docs.arc42.org/tips/10-6/)
  - [Tip 10-8](https://docs.arc42.org/tips/10-8/)

Creator and license: Gernot Starke, CC BY-SA 4.0. See [SOURCES.md](../SOURCES.md) for attribution and licensing scope.
## Practical tips

- [Tip 10-1: Keep the quality goals in arc42-section 1.2 short!](./tips/tip-10-1-keep-the-quality-goals-in-arc42-section-1-2-short.md)
- [Tip 10-2: Document and explain the specific quality tree! (deprecated!)](./tips/tip-10-2-document-and-explain-the-specific-quality-tree-deprecated.md)
- [Tip 10-3: Use a mind-map as quality tree!](./tips/tip-10-3-use-a-mind-map-as-quality-tree.md)
- [Tip 10-4: Use the quality tree as checklist!](./tips/tip-10-4-use-the-quality-tree-as-checklist.md)
- [Tip 10-5: Consider usage or application (quality) scenarios!](./tips/tip-10-5-consider-usage-or-application-quality-scenarios.md)
- [Tip 10-6: Consider change (quality) scenarios!!](./tips/tip-10-6-consider-change-quality-scenarios.md)
- [Tip 10-7: Consider fault/error/failure (quality) scenarios!!](./tips/tip-10-7-consider-fault-error-failure-quality-scenarios.md)
- [Tip 10-8: Use (quality) scenarios for architecture analysis or evaluation!](./tips/tip-10-8-use-quality-scenarios-for-architecture-analysis-or-evaluation.md)

## Worked examples

- [Example Quality Scenarios: HTML Sanity Checker](./examples/example-quality-htmlsc-2.md)
- [Example Quality Scenarios: TrafficPursuitUnit](./examples/example-quality-tpu-1.md)

See the [source register](../SOURCES.md) for attribution and licensing.
