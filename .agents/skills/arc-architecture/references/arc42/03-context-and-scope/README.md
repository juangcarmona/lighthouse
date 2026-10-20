---
kind: section
title: "context and scope"
section: "03"
source_url: https://docs.arc42.org/section-3/
source_author: "Dr. Gernot Starke"
license: "CC BY-SA 4.0"
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
---

# 3. Context and Scope

**Purpose.** Define the system boundary and the people or systems that exchange information with it; connect domain exchanges to technical channels when supported by evidence.

## Subsections

- **3.1 Business context.** Use it when the project has relevant information; preserve project-specific naming or grouping.
- **3.2 Technical context.** Use it when the project has relevant information; preserve project-specific naming or grouping.

## Evidence to examine

- Product descriptions, user journeys, API contracts, and integration tests.
- Protocols, network and deployment configuration, and identity boundaries.
- External actors and systems with evidence of their interfaces.

Use these as investigation leads, not automatic proof. Prefer current implementation, tests, configuration, and maintainer-confirmed decisions appropriate to the claim. Cite concrete repository evidence in resulting documentation. Separate observed behavior, accepted intent, inference, and proposal.

## Gaps and conflicts

- If evidence does not establish useful content, state what is missing and ask the maintainer for context.
- If sources disagree, describe the competing evidence and its source; do not silently choose one. Ask the maintainer to resolve intent or status.
- Do not invent names, responsibilities, boundaries, measures, owners, dates, or rationales to make the section appear complete.
- If the project omits, combines, or adapts this section, follow that choice and link to the content location when known.

## Practical guidance

- Show the system as a boundary with named parties and meaningful inputs and outputs.
- Keep business meaning distinct from transport, then map the two when known.
- Cluster neighbors only with an explicit grouping rule and keep material interfaces visible.
- Keep this an overview; defer infrastructure detail to Section 7.

## Sources and examples

- [arc42 Section 3: Context and Scope](https://docs.arc42.org/section-3/) — section structure and content guidance.
- [Illustrative example](https://docs.arc42.org/examples/business-context-1/) — use as a discussion pattern; do not copy example system facts into another architecture.
- Selected practical tips:
  - [Tip 3-1](https://docs.arc42.org/tips/3-1/)
  - [Tip 3-3](https://docs.arc42.org/tips/3-3/)
  - [Tip 3-9](https://docs.arc42.org/tips/3-9/)
  - [Tip 3-10](https://docs.arc42.org/tips/3-10/)

Creator and license: Gernot Starke, CC BY-SA 4.0. See [SOURCES.md](../SOURCES.md) for attribution and licensing scope.
## Practical tips

- [Tip 3-1: Explicitly demarcate your system from its environment!](./tips/tip-3-1-explicitly-demarcate-your-system-from-its-environment.md)
- [Tip 3-10: Differentiate business and technical context!](./tips/tip-3-10-differentiate-business-and-technical-context.md)
- [Tip 3-11: In the business context, show data flows (instead of dependencies)!](./tips/tip-3-11-in-the-business-context-show-data-flows-instead-of-dependencies.md)
- [Tip 3-12: Show external influences in the context!](./tips/tip-3-12-show-external-influences-in-the-context.md)
- [Tip 3-13: Show transitive dependencies in the context!](./tips/tip-3-13-show-transitive-dependencies-in-the-context.md)
- [Tip 3-14: Pay attention to quality requirements at external interfaces!](./tips/tip-3-14-pay-attention-to-quality-requirements-at-external-interfaces.md)
- [Tip 3-15: Show the technical context (in case hardware is central to your system)!](./tips/tip-3-15-show-the-technical-context-in-case-hardware-is-central-to-your-system.md)
- [Tip 3-16: Use the technical context to describe protocols or channels!](./tips/tip-3-16-use-the-technical-context-to-describe-protocols-or-channels.md)
- [Tip 3-17: Combine business context with technical information!](./tips/tip-3-17-combine-business-context-with-technical-information.md)
- [Tip 3-18: Explain the relationship between domain interfaces and their technical realization!](./tips/tip-3-18-explain-the-relationship-between-domain-interfaces-and-their-technical-realization.md)
- [Tip 3-19: Defer technical context to the deployment view!](./tips/tip-3-19-defer-technical-context-to-the-deployment-view.md)
- [Tip 3-2: Show the context as diagram!](./tips/tip-3-2-show-the-context-as-diagram.md)
- [Tip 3-3: Combine the context diagram with a table!](./tips/tip-3-3-combine-the-context-diagram-with-a-table.md)
- [Tip 3-4: Explicitly indicate risks in the context!](./tips/tip-3-4-explicitly-indicate-risks-in-the-context.md)
- [Tip 3-5: Restrict the context to an overview, avoid too many details!](./tips/tip-3-5-restrict-the-context-to-an-overview-avoid-too-many-details.md)
- [Tip 3-6: Simplify the context by categorization!](./tips/tip-3-6-simplify-the-context-by-categorization.md)
- [Tip 3-7:  If many external systems are involved, aggregate (cluster) them by explicit criteria!](./tips/tip-3-7-if-many-external-systems-are-involved-aggregate-cluster-them-by-explicit-criteria.md)
- [Tip 3-8: Aggregate (cluster) similar neighbour systems with ports!](./tips/tip-3-8-aggregate-cluster-similar-neighbour-systems-with-ports.md)
- [Tip 3-9: Show all (all!) external interfaces!](./tips/tip-3-9-show-all-all-external-interfaces.md)

## Worked examples

- [Example Business Context: HTML Sanity Checker](./examples/example-business-context-1.md)
- [Example Business Context: MaMa](./examples/example-context-business-2.md)
- [Example Business Context: status.arc42.org](./examples/example-business-context-4.md)
- [Example Business Context: TrafficPursuitUnit](./examples/example-business-context-3.md)
- [Example Technical Context: HTML Sanity Checker](./examples/example-technical-context-1.md)
- [Example Technical Context: TrafficPursuitUnit](./examples/example-technical-context-4.md)

See the [source register](../SOURCES.md) for attribution and licensing.
