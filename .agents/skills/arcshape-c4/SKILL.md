---
name: arcshape-c4
description: Create and maintain evidence-grounded C4 architecture diagrams as Mermaid in Markdown. Use when a maintainer asks for context, container, component, or code views.
---

# ArcShape C4 diagram workflow

1. Inspect current documentation, repository structure, runtime configuration, deployment, interfaces, and tests. Ask the maintainer about external actors or intended boundaries that evidence cannot establish.
2. Choose the smallest useful C4 level: context, container, component, or code. Do not produce every level by default.
3. Draft Mermaid `C4Context`, `C4Container`, or `C4Component` diagrams in the appropriate Markdown arc42 section. Keep names and relationship labels concise.
4. Ground nodes and relationships in evidence. Mark inferred boundaries and unknown relationships for review; do not imply that a planned component exists.
5. Preserve existing correct diagrams and propose focused edits. When evidence changes, update only affected nodes, relationships, and adjacent explanation; leave unrelated authored content unchanged and show the diff. Do not overwrite diagrams from external sources without review.
6. Run `arcshape site build` and inspect the rendered diagram. Report Mermaid render failures and unresolved assumptions.
