# Architecture documentation

This directory is Lighthouse's canonical architecture source in the twelve arc42 sections.

The documents distinguish the current Lighthouse repository from product-defined target behavior. The current architecture is evidenced by the CLI, packages, scripts, tests and workflows in this checkout; target behavior is named only where the implementation is incomplete.

Product intent remains owned by [ProductShape](../product/README.md), architecture remains owned here and decision rationale remains in [the architecture decisions](09-architecture-decisions/README.md).

## Sections

1. [Introduction and goals](01-introduction-and-goals/README.md)
2. [Architecture constraints](02-constraints/README.md)
3. [System scope and context](03-context-and-scope/README.md)
4. [Solution strategy](04-solution-strategy/README.md)
5. [Building block view](05-building-block-view/README.md)
6. [Runtime view](06-runtime-view/README.md)
7. [Deployment view](07-deployment-view/README.md)
8. [Cross-cutting concepts](08-crosscutting-concepts/README.md)
9. [Architecture decisions](09-architecture-decisions/README.md)
10. [Quality requirements](10-quality-requirements/README.md)
11. [Risks and technical debt](11-risks-and-technical-debt/README.md)
12. [Glossary](12-glossary/README.md)

ArcShape validates and generates the reader site from these Markdown files; generated output is disposable. The product model is the source for product intent, although its current artifacts are still marked `draft` even though `prodshape validate` reports no diagnostics.
