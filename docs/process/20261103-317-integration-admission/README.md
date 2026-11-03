# Integration label admission

Issue: [#317](https://github.com/juangcarmona/lighthouse/issues/317).

The previous catalogue omitted the repository's integration-assessment label and the native router excluded it. Labels capability version 4 declares that command, routes supported requests to an explicit admitted or blocked outcome, and retains the existing separation between assessment and merge permission.

[The reviewed label plan](labels-plan.json) created 18 missing baseline labels, including `execution-failed`. [Application evidence](labels-applied.json) and `.lighthouse/reconciliation/labels.json` record verified adoption. Existing labels, colors and descriptions were preserved; no label was assigned to a work item by reconciliation.

The executable catalogue/admission matrix is `src/tests/integration-request.test.mjs`. It checks supported command names against the catalogue and router, denies unauthorized or reserved requests, rejects missing/incomplete/ambiguous PRs and stale approvals or checks, binds the selected head, prohibits merge permission, and deduplicates the production router's blocked notices. State labels and unsupported events request no worker. Existing stage dispatch receipts remain authoritative; scheduling changes belong to #321.

Native acceptance results and exact deployed revisions will be retained here after integration.
