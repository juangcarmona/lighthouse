# Lighthouse uses its own workflows

Add `refine` to an issue to request refinement. Answer questions on the issue when needed. Once refinement passes, the same run continues into implementation: the agent writes the OpenSpec proposal first, then the code, and opens one PR containing both.

For an already refined issue, `implement` requests that combined planning and implementation step directly. Use `propose` when you want a design-only PR. A proposal does not need to be merged before implementation. `future` pauses implementation.

Comment on the implementation PR to request changes. Approve its current revision when it is ready. Integration checks that approval and required CI before merging; successful CI on the merged commit starts the final review. Reports and retrospectives are retained on the protected `process/retrospectives` branch.

The workflows under `.github/workflows` are installed consumers, pinned to a reviewed Lighthouse commit. Reusable templates remain under `src/packages/sdlc/workflows`. Update the installation with `node src/packages/sdlc/src/install-workflows.mjs . <commit> --apply --replace-reviewed --with-completion`, review the generated diff and run `npm run verify` before merging.

The repository runner uses the operator-provisioned OpenCode engine on Bastion. Provider credentials stay outside the repository. All gh-aw runners on this host acquire the same job-level lock before starting their gateway. The runner releases the lock when its worker exits, including cancellation.

Set `LIGHTHOUSE_AUTOMATION_ENABLED=false` to stop admitting new work. Existing Actions runs must be cancelled separately if needed. Package publication does not update operator-provisioned images.
