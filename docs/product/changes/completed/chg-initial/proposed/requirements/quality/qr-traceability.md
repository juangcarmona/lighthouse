---
id: QR-TRACEABILITY
type: quality-requirement
title: Keep guardrails and evidence traceable
status: draft
quality-attribute: traceability
applies-to: [BC-FOUNDATION, UC-VERIFY-FOUNDATION, UC-IMPLEMENT-CHANGE]
verification:
  - scenario: Every configured guardrail in a selected profile names its owner, verification, failure consequence and exception path, and a failed result links back to that contract.
---

## Requirement

Every configured Lighthouse guardrail MUST be traceable from its declaration to its verification
result and documented exception route.

## Measurement

Select every configured guardrail in a representative project and inspect its declaration, check,
failure output and exception documentation. A missing link is a traceability failure.
