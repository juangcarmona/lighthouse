# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation and scope. The SDLC package is currently 0.15.0; the separate catalog package field is 0.5.0 and is not the installed workflow revision. The installer substitutes an immutable source SHA into package workflow templates and selects triage/refine by default, proposal plus apply-review with proposal support, implementation with its dependencies, and integrate/review with completion. Foundation init/upgrade does not install these workflows.

The eight authored display names retain the Lighthouse SDLC prefix. The README contains operator material and a worker-catalogue link that escapes its packed boundary. CLI rendering is manifest-driven: it emits the selected SDLC package but cannot infer a workflow source pin from that value. Installed workflows contain a separate harness checkout pin; for example the inspected self-adopted refine source pins 55d236d96cf293537af5498ba6f6eb5674c27103, independently of this run's product/source identity. That observation is illustrative, not a new pin selection.

ProductShape owns intent, ArcShape owns repository architecture and OpenSpec owns these change artifacts. The existing authorization and label contracts constrain the presentation; they are not reimplemented here.

<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:8331c79365b9d40d8970a0821efaad3d961f1e07d7f78a7083b441937fbdabc8" -->

## Goals / Non-Goals

**Goals:** Keep one package-local operational entrypoint; make source discovery accurate for partial and independently upgraded installations; change presentation at its owners; prove generated and packed outputs without a Lighthouse checkout.

**Non-Goals:** No renderer that scans workflows or new revision registry; no route, permission, isolation, authentication, retry, stage or schema change; no automatic rewriting of adopter labels; no replacement of independently prepared implementation; no action on #179's labels, branches or merge state from the engine.

## Decisions

### 1. Presentation names are not execution identities

Change only top-level `name` in the router YAML and seven worker Markdown sources. Compile locks with gh-aw v0.93.2 and update reviewed self-adoption through the installer. Keep `run-name`, basenames, `apply-review`, stage values, request identities, inputs, paths, pins and permissions stable except for owning-generator metadata changes explicitly reviewed. Preserve template placeholders and the adopter's chosen immutable revision; never copy a substituted self-adoption pin over package placeholders.

Alternative: rename files or normalize identifiers to the display text. Rejected because dispatch authentication compares executable paths, not cosmetic names. Alternative: edit locks directly. Rejected because it leaves source/compiled drift. The cost of regeneration is worthwhile even for a cosmetic change.

### 2. Discover independent local evidence before the action matrix

The README starts with an installed-source section. Read the actual SDLC `package.json` in the installed package; compare its version with the selected record in `lighthouse.json` and `.lighthouse/sdlc.json`. Locate installed `.github/workflows/lighthouse-sdlc-router.yml` and selected worker Markdown/locks; inspect the immutable `ref` associated with the Lighthouse harness checkout, not the authorized product checkout expression. Inspect per-workflow evidence rather than assuming all pins agree.

Generated `LIGHTHOUSE.md` keeps its selected-package line and adds a short discovery block before delivery behavior, linking `node_modules/@juangcarmona/lighthouse-sdlc/README.md` when SDLC is selected. It directs the reader to installed metadata and actual workflow files; it does not embed an inferred workflow SHA. Keep rendering a deterministic function of the manifest, including when no workflows are installed.

For absent workflows say not installed/no pin established. For missing package evidence or selected/installed version mismatch, explain the discrepancy and reviewed repair route. For inconsistent/missing workflow pins, report per-file evidence and do not choose main, a product SHA or a convenient common value. Different package version and workflow SHA formats do not themselves prove incompatibility; no unsupported version-to-commit equivalence is introduced. A package-local workflow link documents that package's source, not proof of the separately installed execution.

Alternative: embed a current source SHA or use main links. Rejected because generated files would assert stale or uninstalled behavior. Alternative: teach the renderer to inspect workflows. Rejected as unnecessary filesystem-sensitive generation and a new discovery mechanism; clear local inspection guidance satisfies the acceptance criteria with a smaller change.

### 3. README for daily actions, packaged guide for operations

After identity discovery, use one action matrix with prerequisite, owner action, result, continuation/stop and executable source. Cover triage, refine, independent propose, implement including planning, matching blocked replies, existing-PR corrections, integrate and review. Include router discovery and distinguish the apply review display name from the apply-review worker. Use package-relative `workflows/` and `src/` links for the route and executable evidence.

Move existing installation, runtime, receipt/continuation, implementation configuration, maintenance, recovery and reporting detail to `src/packages/sdlc/workflow-operations.md`; add it to the package files list. Keep `request-triage.md`, `completion.md`, `host-contract.md`, `execution-environments.md` and `model-profiles.md` as their specialist owners. Preserve commands, limits, warnings and links when moving prose; do not invent a simplified runtime guarantee. Keep compact forwarding sections for existing public README anchors such as worker-maintenance and worker-error-reports, and update owned inbound links. Keep the overview focused rather than duplicating the guides.

Eliminate checkout-relative repository-doc links from the packaged reading path. When repository-only material such as the deployment example is necessary, provide a clearly labeled repository path and revision-qualified URL construction using the actually observed workflow SHA; do not publish an unresolved placeholder as a working Markdown link or use main as installed authority. The repository worker catalogue remains in its ArcShape runtime view, with its incorrect triage sentence corrected against the installer.

Alternative: copy the full repository catalogue into the package. Rejected because it duplicates authority and can still depend on unpacked repository content. Alternative: only link remote docs. Rejected because the package must remain useful without a source checkout or network dependency for core instructions.

### 4. Clarify the existing label vocabulary, not label policy

Add propose as a request command, future as an independent implementation-pause overlay and waiting-review as a state/attention signal using existing schema roles. Clarify existing descriptions for triage/refine/implement, needs-info, ready, pr-draft/pr-ready and work overlays without migrating their existing declared roles or transition list. Labels can be operational request signals without becoming authenticated authority or durable locks. `waiting-review` can point to a blocker report, not necessarily a completed PR; readers must follow the current validated report.

Preserve allowed create/preserve and blocked modify/rename/remove/ambiguous operations. Catalog descriptions apply when creating missing labels; they do not overwrite existing adopter text. Keep ordinary init/install/upgrade local and retain explicit authorized provider apply. Do not use this issue to reconcile pre-existing differences between older product label-role wording and the current adapter vocabulary. Any global role-policy migration would need its own owner/product decision.

<!-- pdac:cite id="FR-LABEL-STATE" digest="sha256:754d81137a03d3679e7213068b36a5377dd5aa02fe479be14ad720973bf2d705" -->

Alternative: overwrite all descriptions or infer roles from prose. Rejected because customization and explicit declarations remain authoritative. Alternative: change transitions to encode the router. Rejected because the catalog transition example and executable admission are distinct existing contracts.

### 5. Preserve authorization in both prose and regression evidence

Describe continuation as conditional on installed policy and current authenticated evidence, with future checked at dispatch and admission. Triage stops for the owner. An independent proposal requires ready and current passed refinement; implementation includes planning and does not require an accepted proposal PR. Matching replies resume only their blocked stage; unrelated issue comments and proposal approvals grant no new work. PR corrections retain the existing branch, feedback/head freshness, deduplication and non-forced update. Completion remains separately opted in and binds explicit current-head merge authority and enforced checks.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

No router algorithm is changed. Review any regenerated semantic difference separately from name fields and expected compiler hashes; unexpected permission, pin, dispatch or route changes stop the candidate for investigation.

## Interfaces and data effects

Public changes are eight Actions names, README/operator links, generated Markdown instructions and descriptive catalog entries. No command arguments, JSON schemas, lifecycle interfaces, durable state or runtime services are added. Installed links use package-local files; generated root guidance points into the selected installed package. Existing labels and custom workflows remain adopter-owned until an explicit reviewed operation.

## Slices and dependencies

1. Preserve the plan-only acceptance trace and coordinate separately prepared work before editing.
2. Rename authored display fields, regenerate locks/projections and land their projection tests together.
3. Restructure package documentation and catalog, correct repository catalogue wording and land link/semantics/reconciliation tests together.
4. Update CLI guidance and generated projections, then verify actual packed consumers with no source checkout.
5. Run cross-cutting regression, strict validation, semantic review and rendered documentation evidence.

The slice order prevents generated guidance from linking to a guide that has not yet been packaged. Owner authorization is required before implementation slices; passing this proposal does not satisfy that dependency.

## Validation and evidence plan

- AC1: compare exact corresponding top-level names in authored sources, compiled locks and all selected installed projections. Exercise baseline, proposal, implementation and completion selections; preserve unselected existing files. Inspect stable filenames, dispatch identifiers, run-name values and permissions. Use the installer/compiler path with gh-aw v0.93.2 and extend the existing workflow-verification coverage rather than hand-authoring locks.
- AC2/AC4: compare every matrix row and label description with issue-actions.mjs, stage-transition.mjs, proposal-review.mjs, the installer and completion.md. Assert triage's owner stop, planning composition, future, same-stage replies, same-PR corrections and current-head merge requirements. Preserve every existing specialist-guide warning.
- AC3: extend CLI and SDLC tests with a clean packed-artifact consumer, not only npm pack --dry-run. Walk README/operator/action and generated entrypoint links and local anchors within packed files. Cover no workflows, baseline/partial/all workers, selected-versus-installed package mismatch, different workflow/product SHAs, and missing/mixed workflow pins. Verify discovery appears before behavior and repeat generation/verification stays deterministic. Never require the source checkout to resolve the operational path.
- AC4: use provider fixtures to show missing labels created only by explicit apply, customized descriptions/colors preserved, idempotency and ordinary upgrade with no provider calls. Existing reconcile checks remain in place.
- AC5: run the relevant issue-actions, implement-dispatch, proposal, proposal-review, completion, request-triage, delivery-events, pr-state, worker-catalogue, lighthouse and sdlc-package suites; retain existing routing/host-contract coverage through npm run verify. Run npm run markdownlint, link validation and npm run verify in the authorized implementation environment. Run strict OpenSpec validation and ProductShape citation verification there; copied payloads are not a claim of current machine validation.
- Visual evidence: render the changed README/operator matrix and updated runtime catalogue at desktop and narrow widths, inspect table readability, heading order, source links and existing accessible diagrams, and retain screenshots with the candidate revision and commands. Extend the existing public-site capture approach for the actual catalogue page rather than claiming portal landing screenshots cover it. Host Actions sidebar evidence can confirm short names after reviewed adoption. No theme/gallery or .NET change is proposed; their specialized suites are not substitutes for these documentation checks.
- AC6: the trusted host retains the actual owner-added propose event, linked router/request and proposal execution, authenticated admission and published result. Supplied identities are provenance, not independent engine verification. The publisher first checks file boundaries and OpenSpec planning/strict validity, then publishes the proposal PR/report. Retain future and observe no implementation despite the implement label. A routing receipt or this envelope alone cannot close AC6. Any failed or blocked publication stays recorded as such.

## Risks / Trade-offs

- [Compiler regeneration changes more than names] → Retain v0.93.2, inspect semantic and generated-metadata diffs separately, and stop on unintended behavior or permission changes.
- [Newly concise text hides a safety prerequisite] → Source-backed matrix, preserved specialist detail and action-specific regression assertions land in the same slice.
- [Package and workflow updates move independently] → Explain each local evidence source and mismatch case; do not bake workflow discovery into deterministic manifest rendering.
- [Moved material breaks deep links] → Keep short forwarding anchors and verify owned inbound links plus packed local anchors.
- [Descriptions overwrite customization] → Keep explicit create/preserve-only apply and fixture coverage.
- [Separately prepared work is overwritten] → Coordinate with juangcarmona and inspect current candidate before edits; reuse matching work rather than starting a competing implementation.
- [Planning is mistaken for acceptance] → Keep future, the proposal-only boundary and the separate current-head merge decision visible.

## Migration Plan

This run returns only proposal artifacts. After a separate owner implementation decision, change package-owned sources and their tests, regenerate through their owning tools and review self-adoption through the installer using the reviewed immutable source revision and existing selection. Keep workflow names/paths distinct, preserve template placeholders and avoid pin refreshes unrelated to the reviewed change. Do not remove future from #179 as part of this acceptance exercise.

An adopter receives documentation through a package update and names through a separately reviewed workflow installation/update; neither step silently changes labels or activates new workers. Existing labels retain their descriptions. Roll back only this change's source edits through a reviewed follow-up and regenerate their projections with the prior reviewed inputs; preserve adopter customizations and unrelated prepared work. No data migration, forced branch update or automatic label cleanup is needed.

## Definition of Done

All six refined criteria have retained evidence or an explicit unsuccessful outcome; names and packed links match their specifications; source/generated projections agree; existing authorization/continuation/review/merge contracts and required checks pass; moved operator content remains reachable; semantic and rendered evidence identifies the tested candidate. Citation or pre-existing test failures are reported rather than hidden. No implementation, merge or release is inferred from OpenSpec validity, Product Change status or proposal acceptance.

The immediate next decision is juangcarmona's review of this candidate. There is no unresolved product-scope decision needed to finish the proposal; permission to implement and merge remains intentionally ungranted.
