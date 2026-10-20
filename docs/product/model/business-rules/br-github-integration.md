---
id: BR-GITHUB-INTEGRATION
type: business-rule
title: GitHub is an adapter, not a second lifecycle
status: draft
applies-to: [BC-FOUNDATION, UC-TRIAGE-WORK-ITEM, UC-MANAGE-STACKED-CHANGE]
uses-terms: [TERM-INTEGRATION, TERM-LABEL-STATE, TERM-STACKED-CHANGE]
---

## Rule

The first tracker and forge adapter MAY use GitHub issues, labels, subissues and pull requests, but it MUST map them to Lighthouse work-item, label-state and stacked-change contracts without making GitHub prose the lifecycle authority.

## Rationale

GitHub is useful for the first adopter while the harness remains adaptable to another tracker or forge later.

## Examples

An issue label projects the current stage, a child issue represents a work-item slice and each stacked pull request carries its own verification evidence.

## Exceptions

An adopter may use another tracker or forge when it implements the same state, dependency and evidence contract.
