# Lighthouse uses its own workflows

Add `refine` to an issue to request refinement. If the agent asks a question, answer on the issue. Once it is ready, `propose` requests a design PR. Actions contains the execution logs and result artifacts.

This repository currently enables refinement and proposals. Implementation and automated integration are not enabled here. Issue #125 is the first refinement case; it does not authorize changing the host or publishing container images.

The workflows under `.github/workflows` are installed consumers, pinned to a reviewed Lighthouse commit. Reusable templates remain under `src/packages/sdlc/workflows`. Update the installation with `node src/packages/sdlc/src/install-workflows.mjs . <commit> --apply --replace-reviewed --with-propose`, review the generated diff and run `npm run verify` before merging.

The repository runner uses the operator-provisioned OpenCode engine on Bastion. Provider credentials stay outside the repository. All gh-aw runners on this host must acquire the same job-level lock before starting their gateway; the separate engine lock alone does not prevent gateway collisions. The runner releases the job lock when its worker exits, including cancellation.

Set `LIGHTHOUSE_AUTOMATION_ENABLED=false` to stop admitting new work. Existing Actions runs must be cancelled separately if needed. Keep the repository runner registered and its operator configuration intact when updating Lighthouse packages.
