# Practice evidence

Use `lighthouse-sdlc practices catalog` to read common definitions. Use `validate --input <file>` for structural checks and an unauthenticated report; offline declarations remain unavailable for certification. Use `github --input <file>` to read and verify an exact native test execution with authenticated `gh` access.

The native request contains `context` (numeric repository identity, ref, commit, scope/module inventory and shared profile), `runId`, `attempt`, `jobId`, `workflow`, `stepName` and `command`. The adapter requires a unique direct test command in the pinned workflow and a matching completed native job/step. It extracts one reconciled TAP summary from that step's logs and reads effective branch rules without changing them. Missing logs or mismatched identity fail collection. Unknown enforcement remains a certification gap.

The producer's committed workflow and test command are the execution authority. This adapter does not inspect arbitrary scanners or turn arbitrary output into test evidence. Restrict an assessment's scope to the tests actually declared by that command. Exact measurements can establish a practice result while other practices or enforcement remain missing. Read the [full contract](../practice-evidence.md) before interpreting a level.
