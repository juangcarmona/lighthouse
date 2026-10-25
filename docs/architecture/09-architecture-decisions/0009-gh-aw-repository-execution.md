---
name: gh-aw-repository-execution
description: Run opt-in repository workers through gh-aw with foreground OpenCode execution and separate publication.
status: Accepted
date: 2026-10-25
deciders: [repository-owner]
tags: [execution, github-actions]
---

# ADR-0009: Execute repository workers through gh-aw

## Context

The repository had a catalog of gh-aw stage templates and a separate issue-refinement adapter calling a local socket executor. Installing both created redundant workflows and hid engine output behind a progress response. A single-host adopter needs observable execution without operating a second lifecycle service.

## Decision

Use one opt-in event router and compiled gh-aw workers. The first enabled worker is refinement. Import the OpenCode engine definition, execute its container in the foreground of the Actions job and retain logs, the validated result and runtime identity as artifacts. Load skills from the pinned package at runtime. Foundation upgrades preserve optional workflows instead of installing every stage.

Keep authorization and publication in separately credentialed Actions jobs. The engine receives no GitHub token. A single-host subscription profile uses an operator image, authentication volume and shared Linux file lock. SoFa observes GitHub state; execution does not depend on it. This replaces the socket transport choice while retaining ADR-0007's separation of execution, decisions and publication.

## Consequences

- Execution and failure are visible in the same Actions run as the triggering event.
- A single machine can queue multiple worker types without a persistent service per type.
- The subscription profile disables gh-aw's AWF agent sandbox and supplies Docker isolation instead. It lacks AWF egress filtering and credential proxying; the host remains trusted infrastructure.
- Only refinement is enabled. Additional stage triggers, unattended composition and approval adapters require their own acceptance evidence.
- GitHub artifacts expire according to retention settings. Permanent retrospectives remain a separate concern.

## Alternatives considered

- Keep the socket executor: retains another service and separates engine logs from the job.
- Install every worker by default: exposes unused pipelines and implies capabilities that have not been validated.
- Require API-key authentication immediately: changes the adopter's billing/authentication choice; an AWF profile can be added independently.
- Use SoFa as scheduler: makes repository execution depend on the observer.

## References

- [Execution boundary](0007-host-execution-boundary.md)
- [Entry and autonomy](0008-separate-entry-and-autonomy.md)
- [Engine deployment](../../../src/examples/opencode-engine/README.md)
- [Issue 84](https://github.com/juangcarmona/lighthouse/issues/84)
