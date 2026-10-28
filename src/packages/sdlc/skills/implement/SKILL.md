---
name: lighthouse-sdlc-implement
description: Use when an authorized issue needs planning, implementation, verification and a reviewable pull request.
---

# Implement

Deliver the issue in one branch, including its OpenSpec plan.

## Steps

1. Read the issue, owner answers, repository rules and acceptance criteria. If a required product decision is missing, ask one concrete question and stop.
2. Read `/harness/skills/propose/SKILL.md` for planning and use the supplied OpenSpec instructions to create or update the proposal, specifications, design and tasks before changing production code. This is the planning part of implementation; return one final implementation envelope. Keep tasks coarse and dependency ordered. Reuse existing planning work where it still applies.
3. Implement the tasks, with tests that exercise the changed behavior. Follow the repository's architecture and allowed write scope.
4. Run dependency installation, builds and tests through the workspace command slot below. Capture their completed exit status and evidence before marking tasks done.
5. Write a short PR summary: what changed, how it was checked, and any blocker. Put logs, screenshots and the retrospective in the evidence output. Apply Humanizer when available; otherwise remove repetition and unexplained process jargon yourself.
6. Return the implementation stage result and envelope. Keep missing evidence, failed checks and required decisions explicit. The host publishes the branch for review.

## Completion

The plan and code are ready to review together, with passing checks. Merge remains subject to repository policy and reviewer authorization.

## Workspace command slot

Run installation, build, verification and browser commands sequentially with `node /harness/src/managed-command.mjs run /output/evidence/commands <unique-attempt-id> -- <executable> <arguments...>`. Create the evidence directory first and redirect each attempt's output to its own log. The wrapper rejects overlapping commands and writes `/output/evidence/commands/<unique-attempt-id>.json`.

When the shell tool backgrounds a command, poll that receipt until `state` is `completed` or `cancelled`. A tool response or a quiet log does not establish command completion. Read `exitCode` before editing the workspace or starting the next command. To interrupt an attempt, run `node /harness/src/managed-command.mjs stop /output/evidence/commands` and wait for its terminal receipt before retrying with a new ID.

Keep browser workers within the container budget. Start and stop a preview server inside the same managed command as its browser check; the wrapper cleans up that command's background children. Store screenshots and reports under `/output/evidence/` so they survive workspace cleanup.
