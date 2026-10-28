# `/lighthouse:hotfix`

Use the installed [test-first hotfix composition](../unattended.md#hotfix) for a confirmed isolated defect with root-cause and rollback context. Demonstrate the behavioral regression on unchanged production code, preserve its assertion during repair, then verify GREEN, required checks and independent review.

Keep the complete candidate within 100 production-code additions plus deletions, 10 files including tests and two declared modules. Test lines are separate from the production-code cap. Missing proof or authority stops the unattended path with the candidate retained.
