---
id: CHG-WORK-RESERVATION-LABELS-001
type: product-change
title: 'Expose agent and human work reservations'
status: applied
base-revision: '96ed0a65e976635782722f1ed0c936822fb95d2c'
operations:
  add: []
  modify: [BR-LABEL-STATE, FR-LABEL-STATE]
  remove: []
---

## Problem

Lifecycle labels do not distinguish an active agent reservation from work reserved by a human. Concurrent participants need a visible ownership signal that survives lifecycle transitions.

## Intended Product Outcome

A declared overlay label can project agent activity or human reservation independently of lifecycle state and triage classification. The host keeps the authoritative reservation, rejects conflicting work and reconciles the visible marker after termination and recovery.

## Rationale

The maintainer requested this on 2026-10-24: "siempre que esté habiendo un trabajo agentico en progreso deberíamos saberlo" and "sirve de flag para que no trabajen dos agentes o un agente y un humano en la misma issue". His instruction to continue authorizes this implementation. Labels coordinate cooperating participants; they cannot lock GitHub's editor.

## Affected Product Areas

Tracker label roles, work visibility and ownership coordination.

## Open Questions

None. The initial names are `agent-working` and `human-working`.

## Product Acceptance

Overlay labels coexist with lifecycle state, survive unrelated transitions, and grant no execution authority. Agent work keeps its visible reservation until termination and cleanup. A human reservation blocks new work and requests active work to stop.

## Out of Scope

Preventing arbitrary human edits, distributed cooperation with tools that ignore the protocol, additional runtime stages and automatic merge.
