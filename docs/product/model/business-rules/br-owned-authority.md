---
id: BR-OWNED-AUTHORITY
type: business-rule
title: Each concern keeps its authority
status: draft
applies-to: [BC-FOUNDATION, UC-INITIALIZE-PROJECT, UC-ADOPT-PROFILE, UC-UPDATE-FOUNDATION]
uses-terms: [TERM-INTEGRATION, TERM-MANAGED-PROJECTION, TERM-AUTHORITY-MAP, TERM-HARNESS]
---

## Rule

Lighthouse MUST keep its baseline and adoption content separate from product intent, architecture documentation, factory operations and agent infrastructure. An integration MUST identify the connected authority and MUST NOT overwrite files it does not own.

## Rationale

The foundation stays reusable when project concerns have one clear source of truth.

## Examples

ProductShape owns product artifacts, ArcShape owns architecture documents, an adopter owns its factory or operational tooling, and Lighthouse owns the delivery harness and evidence contracts; each remains connected through an explicit integration.

## Exceptions

None. A proposed ownership change requires a new product decision.
