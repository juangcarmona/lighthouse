---
id: TERM-FOUNDATION-CAPABILITY
type: domain-term
title: Foundation capability
status: draft
defined-in: BC-FOUNDATION
synonyms: [adoption capability]
uses-terms: [TERM-FOUNDATION, TERM-PROFILE, TERM-MANAGED-PROJECTION, TERM-INTEGRATION]
---

## Definition

A foundation capability is a versioned Lighthouse contract published by a package with a catalog entry, a selectable declaration, prerequisites, an owned projection, a verification method, a mutation boundary and adoption evidence.

## Distinguish From

A capability is not a tracker label, a package version or a provider-owned source of truth. It may describe those surfaces through an explicit integration while the provider keeps ownership of its data.

## Usage

The first capability adapter reconciles the declared tracker label vocabulary. A package catalog can expose future adapters for hooks, CI, guardrails or profiles without changing the declaration, plan, authorization and evidence contract.
