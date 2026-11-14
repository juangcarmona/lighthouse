---
name: lighthouse-sdlc-implement
description: Use when an authorized issue needs planning, implementation, verification and a reviewable pull request.
---

# Implement

Deliver the issue in one branch, including its OpenSpec plan.

For human-facing explanations, PR summaries, agent-facing instructions or UI/visual changes, read and apply [the audience policy](../audience-guidance/SKILL.md). Record the pinned helper or fallback review used; visual acceptance follows the accepted UI contract.

## Steps

1. Read the issue, owner answers, repository rules and acceptance criteria. If a required product decision is missing, ask one concrete question and stop.
2. Read `/harness/skills/propose/SKILL.md` for planning and use the supplied OpenSpec instructions to create or update the proposal, specifications, design and tasks before changing production code. This is the planning part of implementation; return one final implementation envelope. Keep tasks coarse and dependency ordered. Reuse existing planning work where it still applies.
3. Implement the tasks, with tests that exercise the changed behavior. Follow the repository's architecture and allowed write scope.
4. Run dependency installation, builds and tests through the workspace command slot below. Capture their completed exit status and evidence before marking tasks done.
5. Write a short PR summary: what changed, how it was checked, and any blocker. Put logs, screenshots and the retrospective in the evidence output. Complete the audience policy's human-writing reviews and evidence comparison, using its explicit fallback when the pinned helper is unavailable.
6. Return the implementation stage result and envelope. Keep missing evidence, failed checks and required decisions explicit. The host publishes the branch for review.

## Completion

Return `passed` when the bounded candidate is ready and its available workspace checks complete. The host runs independent checks after you return; independent review, forge CI, integration and installed-runtime acceptance follow under their own authority. Record those future requirements in `result.output` and `nextAction`; their future receipts cannot already exist, and must never be claimed as passed. Current-stage failed checks, missing product decisions and unavailable required tools remain blockers. Merge remains subject to repository policy and reviewer authorization.

## Workspace command slot

Run installation, build, verification and browser commands sequentially with `node /harness/src/managed-command.mjs run /output/evidence/commands <unique-attempt-id> -- <executable> <arguments...>`. Create the evidence directory first and redirect each attempt's output to its own log. The wrapper rejects overlapping commands and writes `/output/evidence/commands/<unique-attempt-id>.json`.

When the shell tool backgrounds a command, poll that receipt until `state` is `completed` or `cancelled`. A tool response or a quiet log does not establish command completion. Read `exitCode` before editing the workspace or starting the next command. To interrupt an attempt, run `node /harness/src/managed-command.mjs stop /output/evidence/commands` and wait for its terminal receipt before retrying with a new ID.

Keep browser workers within the container budget. Start and stop a preview server inside the same managed command as its browser check; the wrapper cleans up that command's background children. Store screenshots and reports under `/output/evidence/` so they survive workspace cleanup.

Use `/tmp` for temporary consumers, dependency installs and caches. The host sets scratch/cache variables and disables Node compile caching; `/output/evidence/` contains only bounded final logs, command receipts, screenshots and reports. The host collects that tree after the worker exits. An unreadable or unsafe required member blocks collection and preserves the candidate for recovery.
