# `/lighthouse:triage`

Run the `lighthouse-sdlc-triage` skill for one work item and stop at the `triaged` gate.

The structured result records `size`, `urgency`, `impact`, `risk`, `blast-radius`, dependencies, route, owner, confidence and evidence, then proposes workflow and classification labels from the project's configuration.

Use `lighthouse-sdlc triage --input <file>` for deterministic validation. The command is read-only unless an explicit `--apply --labels-file <file>` request is supplied.

Represent evidence with `status: provided`, `status: unavailable` or `status: pending-review`; omit the item when evidence is absent. The report keeps those cases in `missingEvidence`, `unavailableChecks` and `pendingReview` respectively.
