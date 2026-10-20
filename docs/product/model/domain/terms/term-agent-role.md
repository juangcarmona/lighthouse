---
id: TERM-AGENT-ROLE
type: domain-term
title: Agent role
status: draft
defined-in: BC-FOUNDATION
synonyms: [role contract]
uses-terms: [TERM-HARNESS, TERM-AGENT-RUN, TERM-GUARDRAIL]
---

## Definition

An agent role is a provider-neutral contract for one bounded responsibility, including its inputs, allowed tools, write scope, output schema and handoff conditions.

## Distinguish From

A role is not a model name, provider-specific agent file or unrestricted autonomous worker.

## Usage

An adapter maps the role to an agent host while preserving the Lighthouse contract and the host's managed-file ownership.
