# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

## Context

The installer selects five independently dispatched workers and a deterministic router.

## Goals / Non-Goals

Make actual execution understandable. Preserve lifecycle and authorization semantics.

## Decisions

Use the existing ArcShape runtime-view renderer, small Mermaid diagrams and source links. Assert catalogue coverage against installer and workflow sources.

## Risks / Trade-offs

Descriptions can drift; executable-name coverage and source links constrain the maintenance cost. Screenshots verify readable rendering.
