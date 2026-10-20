---
id: QR-LOW-COUPLING
type: quality-requirement
title: Preserve independent authority boundaries
status: draft
quality-attribute: extensibility
applies-to: [BC-FOUNDATION, UC-UPDATE-FOUNDATION]
verification:
  - scenario: Updating Lighthouse or one declared integration changes only files whose ownership is proven and leaves project-owned and other authority-owned content byte-identical.
---

## Requirement

An integration update MUST be independently removable or replaceable and MUST preserve content
outside its recorded ownership boundary.

## Measurement

Run a dry-run and an update against a fixture containing managed, project-owned and foreign-managed
files. Compare all three classes before and after the operation and confirm only the owned class can
change.
