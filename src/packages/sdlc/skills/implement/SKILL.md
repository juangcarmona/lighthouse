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
4. Run the repository checks and capture the evidence needed to review the result. Mark only completed tasks as done.
5. Write a short PR summary: what changed, how it was checked, and any blocker. Put logs, screenshots and the retrospective in the evidence output. Apply Humanizer when available; otherwise remove repetition and unexplained process jargon yourself.
6. Return the implementation stage result and envelope. Keep missing evidence, failed checks and required decisions explicit. The host publishes the branch for review.

## Completion

The plan and code are ready to review together, with passing checks. Merge remains subject to repository policy and reviewer authorization.
