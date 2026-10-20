---
kind: section
title: "deployment view"
section: "07"
source_url: https://docs.arc42.org/section-7/
source_author: "Dr. Gernot Starke"
license: "CC BY-SA 4.0"
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
---

# 7. Deployment View

**Purpose.** Show technical execution infrastructure and how software building blocks map to it, including environments that matter to architecture or operations.

## Subsections

- **7.1 Infrastructure Level 1.** Use it when the project has relevant information; preserve project-specific naming or grouping.
- **7.2 Infrastructure Level 2 and deeper when useful.** Use it when the project has relevant information; preserve project-specific naming or grouping.

## Evidence to examine

- Containers, orchestration, infrastructure-as-code, networking, and cloud configuration.
- Deployment pipelines, environment settings, and operations runbooks.
- Telemetry or deployment evidence for actual nodes, channels, replicas, and regions.

Use these as investigation leads, not automatic proof. Prefer current implementation, tests, configuration, and maintainer-confirmed decisions appropriate to the claim. Cite concrete repository evidence in resulting documentation. Separate observed behavior, accepted intent, inference, and proposal.

## Gaps and conflicts

- If evidence does not establish useful content, state what is missing and ask the maintainer for context.
- If sources disagree, describe the competing evidence and its source; do not silently choose one. Ask the maintainer to resolve intent or status.
- Do not invent names, responsibilities, boundaries, measures, owners, dates, or rationales to make the section appear complete.
- If the project omits, combines, or adapts this section, follow that choice and link to the content location when known.

## Practical guidance

- Capture only infrastructure detail needed to explain placement, communication, or quality.
- Map software blocks to nodes, containers, processes, or managed services.
- Cover environment differences when they affect architecture or operations.
- Explain operationally significant nodes; leave undocumented hardware decisions open.
- Keep domain context in Section 3.

## Sources and examples

- [arc42 Section 7: Deployment View](https://docs.arc42.org/section-7/) — section structure and content guidance.
- [Illustrative example](https://docs.arc42.org/examples/deployment-htmlsc-1/) — use as a discussion pattern; do not copy example system facts into another architecture.
- Selected practical tips:
  - [Tip 7-3](https://docs.arc42.org/tips/7-3/)
  - [Tip 7-4](https://docs.arc42.org/tips/7-4/)
  - [Tip 7-5](https://docs.arc42.org/tips/7-5/)
  - [Tip 7-9](https://docs.arc42.org/tips/7-9/)

Creator and license: Gernot Starke, CC BY-SA 4.0. See [SOURCES.md](../SOURCES.md) for attribution and licensing scope.
## Practical tips

- [Tip 7-1: Document your technical infrastructure (hardware)!](./tips/tip-7-1-document-your-technical-infrastructure-hardware.md)
- [Tip 7-10: Leave hardware decisions to hardware-experts!](./tips/tip-7-10-leave-hardware-decisions-to-hardware-experts.md)
- [Tip 7-2: Explain hardware and infrastructure decisions!](./tips/tip-7-2-explain-hardware-and-infrastructure-decisions.md)
- [Tip 7-3: Document the various environments!](./tips/tip-7-3-document-the-various-environments.md)
- [Tip 7-4: Document the deployment view hierarchically!](./tips/tip-7-4-document-the-deployment-view-hierarchically.md)
- [Tip 7-5: Document the mapping of building-blocks to hardware!](./tips/tip-7-5-document-the-mapping-of-building-blocks-to-hardware.md)
- [Tip 7-6: Use UML deployment diagrams to document software/hardware mapping!](./tips/tip-7-6-use-uml-deployment-diagrams-to-document-software-hardware-mapping.md)
- [Tip 7-7: Use tables to document software/hardware mapping!!](./tips/tip-7-7-use-tables-to-document-software-hardware-mapping.md)
- [Tip 7-8: Explain your nodes!](./tips/tip-7-8-explain-your-nodes.md)
- [Tip 7-9: Explain what (else) is relevant for productive use (aka operation) of the system!](./tips/tip-7-9-explain-what-else-is-relevant-for-productive-use-aka-operation-of-the-system.md)

## Worked examples

- [Example Deployment View: HTML Sanity Checker](./examples/example-deployment-htmlsc-1.md)
- [Example Deployment View: Traffic Pursuit Unit](./examples/example-deployment-1.md)
- [Example Deployment View: Traffic Pursuit Unit Level 2](./examples/example-deployment-2.md)

See the [source register](../SOURCES.md) for attribution and licensing.
