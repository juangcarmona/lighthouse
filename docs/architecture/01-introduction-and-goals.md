---
title: Introduction and goals
arc42-section: "01"
description: Purpose, scope and measurable goals of the current Lighthouse repository.
---

# 1. Introduction and goals

## Requirements overview

Lighthouse is a source repository for a small engineering baseline. The current implementation contains a Node/npm workspace, a CLI package, a CSS theme, native CSS recipes, a .NET reference profile, verification scripts and a static public site.

The baseline helps a project adopt a declared manifest, generate managed guidance and run repeatable local checks. ProductShape, ArcShape and OpenSpec are installed development tools with their own ownership boundaries; Lighthouse does not replace them.

The active Product Change proposes a wider delivery harness. That proposal is not part of the current runtime or command surface.

## Quality goals

- **Reproducibility:** a clean install and pinned toolchain produce repeatable checks.
- **Small package boundaries:** runtime artifacts contain only the files their package owns.
- **Adoption clarity:** a project can find its manifest, generated guidance and profile checks.
- **Low maintenance:** documentation describes implemented behavior and points to the owning source.

## Stakeholders

| Stakeholder | Interest | Responsibility |
| --- | --- | --- |
| Lighthouse maintainer | A reusable baseline that remains small | Owns source, package contracts and checks |
| Adopting project | A documented starting point and local verification | Owns product code, configuration and exceptions |
| ProductShape | Product intent | Owns product definition when adopted |
| ArcShape | Architecture documentation | Owns the architecture source when adopted |
| Agent or developer | Clear commands and evidence | Uses the repository contract and reports failures |
