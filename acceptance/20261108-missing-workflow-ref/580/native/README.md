# Missing workflow refs: accepted native maintenance

Source PR #581 (`105ce46`) fixes authenticated maintenance observation when a worker's workflow ref is gone. A failed commit lookup is classified as missing only after successful bounded branch and tag inventories confirm absence. Other failures stay visible. Historical authentication and permission for a fresh claim remain separate; missing refs grant no recovery effects. TDD includes deletion, permission/network/ambiguous evidence, duplicate reconciliation, historical retries, other batch entries and fixed report publication.

CLI 0.12.65 and SDLC 0.22.4 were published from qualified source `879c4e75` through PR #582 after five native checks. Official tarball SRI and all 317 file bytes match that source and a fresh NPM installation. The public SDK's read-only observation of actual issue #133 exactly matches the source and native artifacts.

Root adoption PR #583 (`e6ea62ab`) changes only five checkout pins in the existing maintenance workflow, generated through its owning installer. Policies, product definitions and other workflows are preserved. Post-merge CI passed.

Native run 42497538809 completed a scoped batch of #133 and #580. Both observation and reconciliation jobs passed. It retained the two original #133 execution identities, including failed review 40496296153 and authenticated request comment 6440754608; that review is explicitly blocked by `workflow-ref-missing` rather than replayed. The original failure remains a failure. The companion issue was observed normally. Source issue state, labels, comments, delivery executions and absent branch/tag refs are identical before/after; no new delivery or CI run appeared during maintenance. The temporary scope was removed and every original variable value restored.

Repository checks passed: 1,154 tests, 10 optional skips; 84 focused tests and packaged real-consumer verification passed. No model, merge, CI replay, product apply, handoff restoration or automatic branch recreation was authorized. This is acceptance of maintenance observation, not completion of the historical delivery or a claim that every unrelated maintenance case is healthy.

The manifest verifies original service ZIP digests and selected original observation bytes on the protected evidence branch. Raw model contexts, prompts and credentials are excluded. Official package tarballs and executable verification scripts are retained for reproduction.
