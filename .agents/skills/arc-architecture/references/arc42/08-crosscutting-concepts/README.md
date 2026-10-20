---
kind: section
title: "crosscutting concepts"
section: "08"
source_url: https://docs.arc42.org/section-8/
source_author: "Dr. Gernot Starke"
license: "CC BY-SA 4.0"
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
---

# 8. Crosscutting Concepts

**Purpose.** Explain the small set of architecture concepts, patterns, rules, and technical practices that shape multiple blocks or processes.

## Subsections

- **8.x One focused topic per heading; choose only relevant topics.** Use it when the project has relevant information; preserve project-specific naming or grouping.

## Evidence to examine

- Shared libraries, middleware, security, logging, error handling, persistence, and communication patterns.
- Representative implementation and tests.
- Domain models and conventions spanning module boundaries.

Use these as investigation leads, not automatic proof. Prefer current implementation, tests, configuration, and maintainer-confirmed decisions appropriate to the claim. Cite concrete repository evidence in resulting documentation. Separate observed behavior, accepted intent, inference, and proposal.

## Gaps and conflicts

- If evidence does not establish useful content, state what is missing and ask the maintainer for context.
- If sources disagree, describe the competing evidence and its source; do not silently choose one. Ask the maintainer to resolve intent or status.
- Do not invent names, responsibilities, boundaries, measures, owners, dates, or rationales to make the section appear complete.
- If the project omits, combines, or adapts this section, follow that choice and link to the content location when known.

## Practical guidance

- Choose evidenced topics; do not fill a generic checklist with irrelevant content.
- Explain how each concept works, where it applies, and known exceptions.
- Link concepts to affected blocks, runtime flows, and quality requirements.
- Separate reusable mechanisms from one-time decisions; use Section 9 for decisions.

## Sources and examples

- [arc42 Section 8: Crosscutting Concepts](https://docs.arc42.org/section-8/) — section structure and content guidance.
- [Illustrative example](https://docs.arc42.org/examples/concept-htmlsc-1/) — use as a discussion pattern; do not copy example system facts into another architecture.
- Selected practical tips:
  - [Tip 8-1](https://docs.arc42.org/tips/8-1/)
  - [Tip 8-3](https://docs.arc42.org/tips/8-3/)
  - [Tip 8-4](https://docs.arc42.org/tips/8-4/)
  - [Tip 8-11](https://docs.arc42.org/tips/8-11/)

Creator and license: Gernot Starke, CC BY-SA 4.0. See [SOURCES.md](../SOURCES.md) for attribution and licensing scope.
## Practical tips

- [Tip 8-1: Explain the Concepts!](./tips/tip-8-1-explain-the-concepts.md)
- [Tip 8-10: Use the collection from arc42 as checklist for concepts!](./tips/tip-8-10-use-the-collection-from-arc42-as-checklist-for-concepts.md)
- [Tip 8-11: (Hyper)Link between Building Blocks and Concepts!](./tips/tip-8-11-hyper-link-between-building-blocks-and-concepts.md)
- [Tip 8-2: Concepts are approaches, rules, principles, tactics, strategies etc...](./tips/tip-8-2-concepts-are-approaches-rules-principles-tactics-strategies-etc.md)
- [Tip 8-3: Restrict documentation of concepts to the most important topics!](./tips/tip-8-3-restrict-documentation-of-concepts-to-the-most-important-topics.md)
- [Tip 8-4: In concepts, explain HOW it works!](./tips/tip-8-4-in-concepts-explain-how-it-works.md)
- [Tip 8-5: Document business or domain models!](./tips/tip-8-5-document-business-or-domain-models.md)
- [Tip 8-6: Combine business or domain models with the glossary!](./tips/tip-8-6-combine-business-or-domain-models-with-the-glossary.md)
- [Tip 8-7: Document (at least) the (business or domain) data model!](./tips/tip-8-7-document-at-least-the-business-or-domain-data-model.md)
- [Tip 8-8: Document concepts with source code!](./tips/tip-8-8-document-concepts-with-source-code.md)
- [Tip 8-9: Document decisions instead of concepts!](./tips/tip-8-9-document-decisions-instead-of-concepts.md)

## Worked examples

- [Example Concept: HTML Sanity Checker (Domain + URIs)](./examples/example-concept-htmlsc-1.md)
- [Example Concept: HTML Sanity Checker (Multiple Checking Algorithms)](./examples/example-concept-htmlsc-2.md)
- [Example Concept: TrafficPursuitUnit Domain Entity Model](./examples/example-concept-tpu-1.md)
- [Example Concept: TrafficPursuitUnit, Event Handling](./examples/example-concept-tpu-2.md)

See the [source register](../SOURCES.md) for attribution and licensing.
