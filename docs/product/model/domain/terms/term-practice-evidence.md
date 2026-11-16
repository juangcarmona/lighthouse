---
id: TERM-PRACTICE-EVIDENCE
type: domain-term
title: Practice evidence
status: draft
defined-in: BC-FOUNDATION
synonyms: []
uses-terms: [TERM-GUARDRAIL]
---

## Definition

A versioned observation of one practice in the shared engineering-practice catalog at an identified repository revision and source run. It records the definition version and mode, applicability, execution evidence, practice-specific quality measurements, source result, collection time and coverage needed to audit a deterministic assessment under the common practice and level rules.

## Distinguish From

A guardrail sets an expectation and failure consequence. Practice evidence reports what an identified source measured; it does not make that expectation binding, assign a score or prove other practices passed. Tool detection and subjective attestation do not supply the required execution and quality evidence. A historical aggregate summarizes identified observations and their coverage; it cannot certify a different or current revision.

## Usage

An adopter publishes practice evidence from its own verification. A read-only consumer preserves source identity, definition versions, enforcement evidence and unknown states. Exact evidence supports the assessed revision; less granular historical summaries retain their period, coverage and source trace separately.
