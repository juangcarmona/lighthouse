---
id: QR-ADOPTABILITY
type: quality-requirement
title: Keep the foundation adoptable with a small documented route
status: draft
quality-attribute: adoptability
applies-to: [JRN-ADOPT-AND-DELIVER, UC-INITIALIZE-PROJECT, UC-ADOPT-PROFILE, UC-UPDATE-FOUNDATION]
verification:
  - scenario: A maintainer can initialize a representative empty project by following the documented route, identify the selected profiles and reach a first passing verification without consulting repository history.
  - scenario: A maintainer can follow a supported upgrade guide, satisfy its prerequisites, review its plan, verify the result and find the recovery route without knowing Lighthouse internals.
uses-terms: [TERM-ADOPTION, TERM-UPGRADE-GUIDE, TERM-UPGRADE-PLAN]
---

## Requirement

The foundation MUST have documented first-use and upgrade routes that expose prerequisites, commands or supported actions, owned files, selected scopes and verification results without requiring knowledge of Lighthouse internals.

## Measurement

Use a fresh checkout and a representative empty target for initialization, then use an adopted fixture for each supported upgrade guide. Record the prerequisites, commands, unresolved questions, evidence and time to the first verified state; a route fails when an undocumented step, hidden manual edit or unexplained recovery action is required.
