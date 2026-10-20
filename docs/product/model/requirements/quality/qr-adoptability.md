---
id: QR-ADOPTABILITY
type: quality-requirement
title: Keep the foundation adoptable with a small documented route
status: draft
quality-attribute: adoptability
applies-to: [JRN-ADOPT-AND-DELIVER, UC-INITIALIZE-PROJECT, UC-ADOPT-PROFILE]
verification:
  - scenario: A maintainer can initialize a representative empty project by following the documented route, identify the selected profiles and reach a first passing verification without consulting repository history.
---

## Requirement

The foundation MUST have a documented first-use route that exposes its prerequisites, commands,
owned files and verification result without requiring knowledge of Lighthouse internals.

## Measurement

Use a fresh checkout and a representative empty target. Record the commands, unresolved questions
and time to the first verified foundation state; the route fails when an undocumented step or hidden
manual edit is required.
