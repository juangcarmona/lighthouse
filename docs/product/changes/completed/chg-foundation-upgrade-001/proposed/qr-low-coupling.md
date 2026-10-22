---
id: QR-LOW-COUPLING
type: quality-requirement
title: Preserve independent authority boundaries
status: draft
quality-attribute: extensibility
applies-to: [BC-FOUNDATION, UC-UPDATE-FOUNDATION]
verification:
  - scenario: Updating Lighthouse or one declared integration changes only files whose ownership is proven and leaves project-owned and other authority-owned content byte-identical.
  - scenario: A selective dry run and update against a fixture containing managed, customized, project-owned and foreign-managed files reports the classification and changes only the accepted owned scope.
---

## Requirement

An integration update MUST be independently removable or replaceable and MUST preserve content outside its recorded ownership boundary. Its dry-run plan MUST identify the evidence used to make that decision and MUST stop when ownership or a semantic merge cannot be proven.

## Measurement

Run a dry run and an update against a fixture containing managed, customized, project-owned and foreign-managed files. Compare all classes before and after the operation, verify the selected scope and recovery evidence, and confirm only the owned class can change.
