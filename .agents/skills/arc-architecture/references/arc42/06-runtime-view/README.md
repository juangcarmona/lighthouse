---
kind: section
title: "runtime view"
section: "06"
source_url: https://docs.arc42.org/section-6/
source_author: "Dr. Gernot Starke"
license: "CC BY-SA 4.0"
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
---

# 6. Runtime View

**Purpose.** Explain representative runtime behavior and interaction among building-block instances through architecturally significant scenarios.

## Subsections

- **6.1 Runtime scenarios (repeat for selected scenarios).** Use it when the project has relevant information; preserve project-specific naming or grouping.

## Evidence to examine

- Request handlers, event consumers, workflows, and sequence/activity diagrams.
- Integration tests, logs, traces, queue and job definitions.
- Startup, shutdown, administration, retries, failures, and critical external interactions.

Use these as investigation leads, not automatic proof. Prefer current implementation, tests, configuration, and maintainer-confirmed decisions appropriate to the claim. Cite concrete repository evidence in resulting documentation. Separate observed behavior, accepted intent, inference, and proposal.

## Gaps and conflicts

- If evidence does not establish useful content, state what is missing and ask the maintainer for context.
- If sources disagree, describe the competing evidence and its source; do not silently choose one. Ask the maintainer to resolve intent or status.
- Do not invent names, responsibilities, boundaries, measures, owners, dates, or rationales to make the section appear complete.
- If the project omits, combines, or adapts this section, follow that choice and link to the content location when known.

## Practical guidance

- Choose a small set of scenarios that reveal architecture; do not enumerate every use case.
- Show participating blocks, sequence, important data/control flow, and external boundaries.
- Use schematic flows when details are not established and mark inferences.
- Include error or operational scenarios when they change architectural behavior.

## Sources and examples

- [arc42 Section 6: Runtime View](https://docs.arc42.org/section-6/) — section structure and content guidance.
- [Illustrative example](https://docs.arc42.org/examples/runtime-1/) — use as a discussion pattern; do not copy example system facts into another architecture.
- Selected practical tips:
  - [Tip 6-1](https://docs.arc42.org/tips/6-1/)
  - [Tip 6-2](https://docs.arc42.org/tips/6-2/)
  - [Tip 6-3](https://docs.arc42.org/tips/6-3/)

Creator and license: Gernot Starke, CC BY-SA 4.0. See [SOURCES.md](../SOURCES.md) for attribution and licensing scope.
## Practical tips

- [Tip 6-1: Always map existing building blocks to the activities within runtime scenarios!](./tips/tip-6-1-always-map-existing-building-blocks-to-the-activities-within-runtime-scenarios.md)
- [Tip 6-10: Use both small and large building blocks in scenarios!](./tips/tip-6-10-use-both-small-and-large-building-blocks-in-scenarios.md)
- [Tip 6-11: Use sequence diagrams to describe or specify runtime scenarios!](./tips/tip-6-11-use-sequence-diagrams-to-describe-or-specify-runtime-scenarios.md)
- [Tip 6-2: Document only a few runtime scenarios!](./tips/tip-6-2-document-only-a-few-runtime-scenarios.md)
- [Tip 6-3: Document 'schematic' (instead of detailed) scenarios!](./tips/tip-6-3-document-schematic-instead-of-detailed-scenarios.md)
- [Tip 6-4: Document detailed scenarios (with caution)!](./tips/tip-6-4-document-detailed-scenarios-with-caution.md)
- [Tip 6-5: Use scenarios primarily to `discover` building blocks, not so much for documentation!](./tips/tip-6-5-use-scenarios-primarily-to-discover-building-blocks-not-so-much-for-documentation.md)
- [Tip 6-6: Describe excerpts of scenarios (partial scenarios)!](./tips/tip-6-6-describe-excerpts-of-scenarios-partial-scenarios.md)
- [Tip 6-7: Use activity diagrams with swimlanes to describe or specify runtime scenarios!](./tips/tip-6-7-use-activity-diagrams-with-swimlanes-to-describe-or-specify-runtime-scenarios.md)
- [Tip 6-8: Use activity diagrams with partitions to describe or specify runtime scenarios!](./tips/tip-6-8-use-activity-diagrams-with-partitions-to-describe-or-specify-runtime-scenarios.md)
- [Tip 6-9: Use a textual notation to describe runtime scenarios!](./tips/tip-6-9-use-a-textual-notation-to-describe-runtime-scenarios.md)

## Worked examples

- [Example Runtime View: HTML Sanity Checker](./examples/example-runtime-1.md)
- [Example Runtime View: MaMa](./examples/example-runtime-mama-2.md)
- [Example Runtime View: TrafficPursuitUnit](./examples/example-runtime-tpu-1.md)

See the [source register](../SOURCES.md) for attribution and licensing.
