---
kind: section
title: "building block view"
section: "05"
source_url: https://docs.arc42.org/section-5/
source_author: "Dr. Gernot Starke"
license: "CC BY-SA 4.0"
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
---

# 5. Building Block View

**Purpose.** Describe the static decomposition into meaningful software building blocks and dependencies, from a system-level view into selected details.

## Subsections

- **5.1 Whitebox Overall System.** Use it when the project has relevant information; preserve project-specific naming or grouping.
- **5.2 Level 2.** Use it when the project has relevant information; preserve project-specific naming or grouping.
- **5.3 Level 3 and further refinements as needed.** Use it when the project has relevant information; preserve project-specific naming or grouping.

## Evidence to examine

- Source tree, package boundaries, dependencies, public interfaces, and code ownership.
- Build graph, runtime composition, and tests demonstrating responsibilities.
- Existing diagrams and maintainer-confirmed rationale for decomposition.

Use these as investigation leads, not automatic proof. Prefer current implementation, tests, configuration, and maintainer-confirmed decisions appropriate to the claim. Cite concrete repository evidence in resulting documentation. Separate observed behavior, accepted intent, inference, and proposal.

## Gaps and conflicts

- If evidence does not establish useful content, state what is missing and ask the maintainer for context.
- If sources disagree, describe the competing evidence and its source; do not silently choose one. Ask the maintainer to resolve intent or status.
- Do not invent names, responsibilities, boundaries, measures, owners, dates, or rationales to make the section appear complete.
- If the project omits, combines, or adapts this section, follow that choice and link to the content location when known.

## Practical guidance

- Start at level 1; describe important blocks’ responsibility, interfaces, and relationships.
- Refine only blocks whose internals matter, and make each refinement’s parent clear.
- Use black-box descriptions for blocks not being decomposed.
- Map blocks to repository locations when evidence supports it; directory names alone are not architecture.
- Link crosscutting rules to Section 8 rather than duplicating them.

## Sources and examples

- [arc42 Section 5: Building Block View](https://docs.arc42.org/section-5/) — section structure and content guidance.
- [Illustrative example](https://docs.arc42.org/examples/buildingblock-hsc/) — use as a discussion pattern; do not copy example system facts into another architecture.
- Selected practical tips:
  - [Tip 5-2](https://docs.arc42.org/tips/5-2/)
  - [Tip 5-3](https://docs.arc42.org/tips/5-3/)
  - [Tip 5-5](https://docs.arc42.org/tips/5-5/)
  - [Tip 5-13](https://docs.arc42.org/tips/5-13/)

Creator and license: Gernot Starke, CC BY-SA 4.0. See [SOURCES.md](../SOURCES.md) for attribution and licensing scope.
## Practical tips

- [Tip 5-1: Use common structures for sections of the building block view!](./tips/tip-5-1-use-common-structures-for-sections-of-the-building-block-view.md)
- [Tip 5-10: Use crosscutting concepts to describe or specify similarities in building blocks!](./tips/tip-5-10-use-crosscutting-concepts-to-describe-or-specify-similarities-in-building-blocks.md)
- [Tip 5-11: Show multiple levels of the building block view!](./tips/tip-5-11-show-multiple-levels-of-the-building-block-view.md)
- [Tip 5-12: Refine building-blocks consistently!](./tips/tip-5-12-refine-building-blocks-consistently.md)
- [Tip 5-13: Explain the mapping of source-code to building blocks!](./tips/tip-5-13-explain-the-mapping-of-source-code-to-building-blocks.md)
- [Tip 5-14: Explain where to find the source code of your building blocks!](./tips/tip-5-14-explain-where-to-find-the-source-code-of-your-building-blocks.md)
- [Tip 5-15: Align the mapping of source-code to building-blocks along the directory and file structure!](./tips/tip-5-15-align-the-mapping-of-source-code-to-building-blocks-along-the-directory-and-file-structure.md)
- [Tip 5-16: Map building blocks according to modularization constructs of your programming language!](./tips/tip-5-16-map-building-blocks-according-to-modularization-constructs-of-your-programming-language.md)
- [Tip 5-17: 'Cohesion' shall be the primary driver when creating architecture building blocks!](./tips/tip-5-17-cohesion-shall-be-the-primary-driver-when-creating-architecture-building-blocks.md)
- [Tip 5-18: Ensure **every** piece of source code can be located in the building block view!](./tips/tip-5-18-ensure-every-piece-of-source-code-can-be-located-in-the-building-block-view.md)
- [Tip 5-19: In exceptional cases include third-party software in the building block view!](./tips/tip-5-19-in-exceptional-cases-include-third-party-software-in-the-building-block-view.md)
- [Tip 5-2: Organize the building block view hierarchically!](./tips/tip-5-2-organize-the-building-block-view-hierarchically.md)
- [Tip 5-20: Clearly indicate third-party elements in the building block view!](./tips/tip-5-20-clearly-indicate-third-party-elements-in-the-building-block-view.md)
- [Tip 5-21: Describe or specify internal interfaces with minimal effort!](./tips/tip-5-21-describe-or-specify-internal-interfaces-with-minimal-effort.md)
- [Tip 5-22: Document or specify interfaces with unit-tests!](./tips/tip-5-22-document-or-specify-interfaces-with-unit-tests.md)
- [Tip 5-23: Document or specify interfaces with runtime scenarios!](./tips/tip-5-23-document-or-specify-interfaces-with-runtime-scenarios.md)
- [Tip 5-24: Use building-block level-1 for **other** information!](./tips/tip-5-24-use-building-block-level-1-for-other-information.md)
- [Tip 5-25: If useful, refine several building blocks at once!](./tips/tip-5-25-if-useful-refine-several-building-blocks-at-once.md)
- [Tip 5-26: Make the origin of lower-level building blocks explicit!](./tips/tip-5-26-make-the-origin-of-lower-level-building-blocks-explicit.md)
- [Tip 5-27: Refine only a few building blocks!](./tips/tip-5-27-refine-only-a-few-building-blocks.md)
- [Tip 5-28: Explain concepts instead of building blocks!](./tips/tip-5-28-explain-concepts-instead-of-building-blocks.md)
- [Tip 5-3: Always describe level-1 of the building block view ('Level-1 is your friend')!](./tips/tip-5-3-always-describe-level-1-of-the-building-block-view-level-1-is-your-friend.md)
- [Tip 5-4: Ensure consistency of external interfaces to level-1](./tips/tip-5-4-ensure-consistency-of-external-interfaces-to-level-1.md)
- [Tip 5-5: Describe the responsibility or purpose of every (important) blackbox!](./tips/tip-5-5-describe-the-responsibility-or-purpose-of-every-important-blackbox.md)
- [Tip 5-6: Hide the inner workings of blackboxes!](./tips/tip-5-6-hide-the-inner-workings-of-blackboxes.md)
- [Tip 5-7: Use tables to efficiently document/specify blackboxes!](./tips/tip-5-7-use-tables-to-efficiently-document-specify-blackboxes.md)
- [Tip 5-8: Justify every whitebox structure!](./tips/tip-5-8-justify-every-whitebox-structure.md)
- [Tip 5-9: Use runtime views to explain or specify whiteboxes!](./tips/tip-5-9-use-runtime-views-to-explain-or-specify-whiteboxes.md)

## Worked examples

- [Example Building Block View Level-1: Traffic Pursuit Unit](./examples/example-buildingblock-tpu-1.md)
- [Example Building Block View Level-2: Traffic Pursuit Unit](./examples/example-buildingblock-tpu-2.md)
- [Example Building Block View: HTML Sanity Checker](./examples/example-buildingblock-hsc.md)
- [Example Building Block View: status.arc42.org](./examples/example-buildingblock-status.md)

See the [source register](../SOURCES.md) for attribution and licensing.
