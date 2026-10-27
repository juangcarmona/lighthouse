# Triage dogfooding: issue 145

[Issue #145](https://github.com/juangcarmona/lighthouse/issues/145) asks for approachable intake and explained estimates. [Issue #146](https://github.com/juangcarmona/lighthouse/issues/146) separately captures decomposition and aggregate PR delivery. The owner requested this exercise before implementation.

## Installed artifacts and execution boundary

The isolated checkout uses main revision `57d4e23da2831be5fad0331f1ba82326782943cc`. Lighthouse 0.11.3 and SDLC 0.14.0 were installed from npm, with UI 0.2.0 as a dependency, under `node_modules/.cache/lighthouse-registry-dogfood`. [Package evidence](package-evidence.json) records exact versions, registry URLs and integrity hashes. The owner approved [publication](https://github.com/juangcarmona/lighthouse/actions/runs/40522455418), which completed successfully. Initial local-tarball preparation was repeated with the registry packages; the triage reports matched exactly.

The installed SDLC installer refreshes the repository's existing worker projections to that immutable main revision. Existing workflow selections remain explicit. The repository is a package workspace with partial workflow self-adoption; it has no root `lighthouse.json`. This exercise does not claim complete harness adoption or overwrite existing agent guidance with a greenfield initializer.

Codex performed the triage using the installed triage skill and repository evidence. The installed CLI validated [the input](triage-input.json), produced [the classification report](triage-report.json), and validated [the stage result](stage-result.json). This was an attended execution. The installed GitHub router still has no native triage entrypoint, so no Actions triage run or automated question/resumption loop is claimed.

## Observed result

The classification is structurally valid and blocked on size judgement; `canApply` is false. The provisional size is L with low confidence, because the story touches intake, routing, the estimate contract and refinement handoff. There is no supported conversion to story points. The stage also records external-intake admission as an owner decision. Classification labels and the proposed transition to refine were not applied. Only the `triage` label was explicitly created and assigned for this requested exercise.

Repository evidence establishes that the current schema accepts S/M/L/XL, the triage skill asks for supporting evidence, the installed router starts at refine, and no repository issue form exists. Inference: delivering this request as an automatic workflow requires an authenticated triage entrypoint, visible questions, answer resumption and a recorded estimate before refinement. The owner request supplies the desired simple form and the later strictly-greater-than-8 decomposition threshold; it does not authorize untrusted text to launch arbitrary work.

## Proposed intake and estimation criteria

The external form should ask “What problem do you have?” and “What would you like to happen?”, with an optional example or context. Empty or incomplete answers remain usable input: triage checks repository context, records each material inference with its source and asks only for unresolved information that affects the outcome. Engineers derive testable acceptance criteria during refinement.

Use relative points as an initial proposal, then calibrate them with accepted Lighthouse changes. Consider behavior and scope, contracts and dependencies, verification and migration work. Record uncertainty and confidence separately; an unknown requirement calls for a question or investigation, not an automatic large number. These anchors are proposals, not accepted product policy, elapsed-time estimates, file counts or a calibrated numeric result for #145.

| Points | Candidate anchor |
| --- | --- |
| 1 | A localized, familiar correction with an existing way to verify it |
| 2 | A small behavior change inside one component, with a focused test |
| 3 | One bounded outcome spanning a few cooperating components and known integration checks |
| 5 | One outcome crossing contracts or boundaries, with meaningful integration verification |
| 8 | A broad but cohesive outcome with several verification paths, compatibility or migration work |
| 13+ | Several outcomes or a scope that needs decomposition analysis during refinement |

Triage records a provisional estimate, rationale and confidence. Refine verifies assumptions, defines acceptance and revises the estimate. A confirmed value strictly above 8 triggers decomposition planning under #146. Each child gets its own triage and refinement. Meaningful dependencies control execution and integration; the parent remains open until the aggregate outcome is accepted. Neither a number nor an HTML marker grants merge authority.

## First owner question

May a request from someone outside the repository's collaborators start bounded automatic triage, or must the owner admit it first? The initial recommendation is owner admission for external requests, followed by automatic questions and classification within that authorization. This keeps the form public and simple while making agent capacity and execution authority explicit. Collaborator policy can be considered separately.

## Reproduction

From a checkout of the recorded revision, install the released packages with `npm install --prefix node_modules/.cache/lighthouse-registry-dogfood --workspaces=false --ignore-scripts --save-exact @juangcarmona/lighthouse@0.11.3 @juangcarmona/lighthouse-sdlc@0.14.0`. Invoke the CLI at `node_modules/.cache/lighthouse-registry-dogfood/node_modules/@juangcarmona/lighthouse-sdlc/src/sdlc.mjs` with Node 24. This isolated prefix avoids replacing the source workspace packages with their own published artifacts.

Use the installed SDLC CLI's `triage --input docs/process/20261027-145-triage-dogfood/triage-input.json --format json` command. Expect a nonzero exit and a valid blocked report with unresolved size judgement. Validate `stage-result.json` with `stage-result --input <path> --format json`; structural validation must pass. Requiring successful stage completion must reject this blocked result. Do not apply the proposed label transition or dispatch refinement while its decisions remain unresolved.

## Verification

The registry-installed classifier reproduced the report exactly. Structural stage-result validation passed; requiring a completed worker rejected the blocked status and pending decisions. All six installed agentic workflows compiled with gh-aw v0.93.2. `npm run verify` passed with 213 tests passed, zero failed and three existing optional container checks skipped, plus Markdown/link checks and the public-site build. This verifies the adoption and attended assessment artifacts; live automatic triage remains part of #145.
