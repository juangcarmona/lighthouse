---
id: BR-HUMAN-AUTHORITY
type: business-rule
title: Human decisions remain explicit
status: draft
applies-to: [BC-FOUNDATION, UC-IMPLEMENT-CHANGE, UC-UPDATE-FOUNDATION]
uses-terms: [TERM-INTEGRATION]
---

## Rule

Lighthouse tools and agent workflows MAY prepare, verify and report work, but product scope,
architecture acceptance, merge and release decisions MUST remain attributable to an authorised human
or to the project policy that explicitly delegates a bounded routine action.

## Rationale

Automation accelerates a project without silently expanding its authority.

## Examples

An OpenSpec workflow or SDLC route can produce a change proposal and verification evidence; product approval and acceptance of the resulting baseline remain visible decisions.

## Exceptions

Bounded unattended actions may be delegated by an adopting project's explicit policy and stop on a failed check, owner-only decision or scope boundary.
