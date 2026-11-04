# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## Context

The installer selects the current stage/product workers, deterministic router and optional maintenance/unattended workflows. Presence in the package does not establish installation, activation or native acceptance.

## Goals / Non-Goals

Make actual execution understandable. Preserve lifecycle and authorization semantics.

## Decisions

Use the existing ArcShape runtime-view renderer, small Mermaid diagrams and source links. Assert catalogue coverage against installer and workflow sources.

## Risks / Trade-offs

Descriptions can drift; executable-name coverage and source links constrain the maintenance cost. Screenshots verify readable rendering.
