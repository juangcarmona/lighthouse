---
id: TERM-SDLC-PACKAGE
type: domain-term
title: SDLC package
status: draft
defined-in: BC-FOUNDATION
synonyms: []
uses-terms: [TERM-HARNESS, TERM-WORKFLOW-STAGE, TERM-GATE, TERM-PACKAGE-ARTIFACT, TERM-MANAGED-PROJECTION]
---

## Definition

A versioned Lighthouse package that provides the software delivery lifecycle contract through skills, commands, meta-commands, route and gate descriptors, schemas, templates and deterministic checks.

## Distinguish From

An SDLC package is not the core harness, a ProductShape or ArcShape authority, an OpenSpec implementation, an agent runtime or a cross-repository software factory.

## Usage

Initialization selects and records an SDLC package, then exposes its provider-neutral contract to the adopter and the configured agent host without copying or redefining the package's lifecycle assets.
