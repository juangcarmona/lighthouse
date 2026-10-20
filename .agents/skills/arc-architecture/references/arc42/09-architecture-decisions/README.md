---
kind: section
title: "architecture decisions"
section: "09"
source_url: https://docs.arc42.org/section-9/
source_author: "Dr. Gernot Starke"
license: "CC BY-SA 4.0"
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
---

# 9. Architecture Decisions

**Purpose.** Preserve rationale for significant choices so stakeholders can retrace alternatives, decision criteria, and consequences.

## Subsections

- **Decision records or a compact decision list; use separate records where useful.** Use it when the project has relevant information; preserve project-specific naming or grouping.

## Evidence to examine

- ADRs, proposals, pull requests, issue discussions, and migrations.
- Criteria such as quality goals, constraints, interfaces, and operating needs.
- Current implementation/configuration showing whether a choice remains active.

Use these as investigation leads, not automatic proof. Prefer current implementation, tests, configuration, and maintainer-confirmed decisions appropriate to the claim. Cite concrete repository evidence in resulting documentation. Separate observed behavior, accepted intent, inference, and proposal.

## Gaps and conflicts

- If evidence does not establish useful content, state what is missing and ask the maintainer for context.
- If sources disagree, describe the competing evidence and its source; do not silently choose one. Ask the maintainer to resolve intent or status.
- Do not invent names, responsibilities, boundaries, measures, owners, dates, or rationales to make the section appear complete.
- If the project omits, combines, or adapts this section, follow that choice and link to the content location when known.

## Practical guidance

- Document decisions with material structural, quality, dependency, interface, or construction impact.
- Capture context, decision, rationale/criteria, alternatives, consequences, status, and date when known.
- Link existing ADRs instead of duplicating them.
- Follow the repository's ADR conventions and link its canonical ADR index here; when no convention exists, the ADR skill defaults to `docs/adr/README.md`.
- Distinguish historical decisions from current choices; flag reversals or missing rationale.

## Sources and examples

- [arc42 Section 9: Architecture Decisions](https://docs.arc42.org/section-9/) — section structure and content guidance.
- [Illustrative example](https://docs.arc42.org/examples/decision-htmlsc/) — use as a discussion pattern; do not copy example system facts into another architecture.
- Selected practical tips:
  - [Tip 9-1](https://docs.arc42.org/tips/9-1/)
  - [Tip 9-2](https://docs.arc42.org/tips/9-2/)
  - [Tip 9-3](https://docs.arc42.org/tips/9-3/)
  - [Tip 9-5](https://docs.arc42.org/tips/9-5/)

Creator and license: Gernot Starke, CC BY-SA 4.0. See [SOURCES.md](../SOURCES.md) for attribution and licensing scope.
## Practical tips

- [Tip 9-1: Document only architecturally relevant decisions!](./tips/tip-9-1-document-only-architecturally-relevant-decisions.md)
- [Tip 9-10: Use lightweight tooling to support creation of ADRs](./tips/tip-9-10-use-lightweight-tooling-to-support-creation-of-adrs.md)
- [Tip 9-2: Document decision criteria!](./tips/tip-9-2-document-decision-criteria.md)
- [Tip 9-3: Provide reasons for important decisions!](./tips/tip-9-3-provide-reasons-for-important-decisions.md)
- [Tip 9-4: Document decisions as mind-map or as table!](./tips/tip-9-4-document-decisions-as-mind-map-or-as-table.md)
- [Tip 9-5: Document decisions as `Architecture Decision Record` (ADR)!](./tips/tip-9-5-document-decisions-as-architecture-decision-record-adr.md)
- [Tip 9-6: Document rejected alternatives!](./tips/tip-9-6-document-rejected-alternatives.md)
- [Tip 9-7: Document decisions informally as a blog (RSS-feed)!](./tips/tip-9-7-document-decisions-informally-as-a-blog-rss-feed.md)
- [Tip 9-8: Decisions should have a timestamp!](./tips/tip-9-8-decisions-should-have-a-timestamp.md)
- [Tip 9-9: Follow the _suggestions for good ADRs_](./tips/tip-9-9-follow-the-suggestions-for-good-adrs.md)

## Worked examples

- [Example Decision: HTML Sanity Checker](./examples/example-decision-htmlsc.md)
- [Example Decision: TrafficPursuitUnit](./examples/example-decision-tpu-1.md)
- [Example Decision: Use ADRs in Nygard format](./examples/example-decision-use-adrs.md)

See the [source register](../SOURCES.md) for attribution and licensing.
