---
id: TERM-WORK-ITEM-SIZE
type: domain-term
title: Work-item size
status: draft
defined-in: BC-FOUNDATION
synonyms: [scope size]
uses-terms: [TERM-TRIAGE]
---

## Definition

Work-item size is a relative estimate of scope, affected contracts and dependencies, and verification or migration work. Requester triage records provisional points on the approved scale of 1, 2, 3, 5, 8 and 13, with an explanation of each factor.

## Distinguish From

Size is not complexity, elapsed time, urgency, risk or a delivery promise. Confidence and uncertainty are recorded separately, not encoded by inflating the point value.

## Usage

Initial anchors are 1 for a localized familiar correction, 2 for small component behavior, 3 for a bounded outcome across a few components, 5 for an outcome crossing contracts with integration checks, 8 for a broad cohesive outcome with several verification paths and 13 for work needing decomposition analysis. These anchors will be calibrated with the first few stories; they are not time estimates or validated historical comparisons.

Refinement reconsiders an initial estimate and preserves the prior value and reason for revision. Existing S/M/L/XL classifications remain supported for legacy callers without a numeric conversion. Decomposition policy is a separate change.
