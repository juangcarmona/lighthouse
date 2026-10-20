---
id: TERM-LABEL-STATE
type: domain-term
title: Label state
status: draft
defined-in: BC-FOUNDATION
synonyms: [tracker state projection]
uses-terms: [TERM-TRIAGE, TERM-GATE, TERM-DELIVERY-ROUTE]
---

## Definition

Label state is the finite, machine-readable projection of a work item's workflow handoff and human attention state in its configured tracker.

## Distinguish From

Label state is not an interpretation of issue prose and does not replace product, architecture or verification evidence.

## Usage

The harness validates the project's configured labels and uses them to select the next action without asking an agent to infer state from narrative text. Complexity, blast radius and risk remain structured triage data instead of label families.
