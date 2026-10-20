---
id: TERM-CODEGRAPH-SERVICE
type: domain-term
title: CodeGraph service
status: draft
defined-in: BC-FOUNDATION
synonyms: [semantic code index]
uses-terms: [TERM-INTEGRATION, TERM-HARNESS, TERM-GUARDRAIL]
---

## Definition

A CodeGraph service is an external semantic index exposed through MCP that supplies repository and worktree context to the harness.

## Distinguish From

The service is an integration dependency; its index, database, credentials and runtime do not belong in the adopting repository.

## Usage

Lighthouse initialization checks service reachability and resolution of the canonical repository and active worktrees before enabling capabilities that depend on graph context.
