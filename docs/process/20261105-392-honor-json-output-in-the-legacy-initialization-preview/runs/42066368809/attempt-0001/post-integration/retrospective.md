## What went well
The bounded CLI correction preserved the existing planner and text/semantic routes. Real subprocess regressions parse all stdout, compare text operations, exercise conflicts and reject JSON apply while checking target bytes, modes and local Git configuration (`lighthouse.test.mjs:33-167`). All five authenticated command receipts passed; distinct planning/candidate acceptances, the actual merge receipt and post-merge `ci.yml` success remain separate evidence.

## What went wrong
The reported product defect was a successful JSON request returning prose; PR #447 fixes it. `tasks.md:34` also reports one test-fixture attempt missing required package pins, corrected without weakening validation. The original failed-attempt log is not supplied, and recurrence across work items is not established. No new source defect or conflicting affected guidance was established.

## Start doing
CLI test maintainer: keep format/mode cases at the real executable boundary and construct profiled fixtures with their required pins. Retain negative validation coverage alongside valid fixtures.

## Stop doing
Do not interpret a green check as behavior proof, skipped tests as executed tests, configured models as authenticated provider settings, or merge as release/deployment. Do not generalize this single corrected fixture attempt into a recurring process failure.

## Improvement candidates
**I1 — proposed owner: CLI test maintainer.** The observed fixture gap is documented at `tasks.md:34`; current pins and their validator are at `lighthouse.test.mjs:75-81` and `lighthouse.mjs:635-657`. The smallest optional guard is a local valid-profile fixture builder when another such fixture is needed. Before adopting it, reproduce the missing-pin rejection in an authorized workspace, then prove valid previews and unchanged negative/no-write/text/semantic cases. This guard needs its own review and regression proof; it is not implemented or approved here. Follow-up reference: this record, I1. No policy change, new issue or next stage is started.