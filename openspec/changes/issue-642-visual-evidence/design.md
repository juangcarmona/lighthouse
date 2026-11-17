<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:90af94bb73cab9bf61e3a4c6eb7d44f68b42513063adadaa629ba72e69150f69" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:404ea1496978d61bee268ee8dbd95709620c12725b2f65e8cd44bb450878e403" -->

# Product visual evidence design

## Existing mechanisms

GitHub Agentic Workflows v1.2.2 publishes content-addressed images in `actions/setup/js/upload_assets.cjs`. Its GitHub URLs support rendered images under repository access rules. Lighthouse uses a custom engine and an authenticated separate publisher, so agents must not invoke that safe-output tool themselves. Reuse the publication pattern on the existing explicitly adopted evidence branch rather than creating an extra assets branch.

## Stage contract

New admitted refine/propose/implement requests require an applicability assessment in `output.visualEvidence`. Old requests without the flag remain readable. Semantic classification belongs to the worker's inspection of scope; do not infer applicability from a keyword match. Unavailable evidence cannot pass the current stage. Up to six items identify kind, view, state and viewport. Existing changed views need before and candidate captures; new views explain why before is inapplicable. Proposed designs cannot substitute for candidate captures.

Planning returns bounded self-contained HTML in the envelope. The host renders it using the already pinned image's Chromium, no JavaScript, network, repository mounts or credentials, within the original deadline and resource ownership journal. Implementation uses the existing managed Playwright/browser route and stores viewport PNGs under its evidence output. No planning shell or source-write capability is added.

## Integrity and publication

The host retains PNGs by SHA-256, verifies viewport/size/file identity and writes a receipt binding repository, issue, source, run, attempt, assessment and independently checked candidate tree. The publisher revalidates those bytes and metadata against the authenticated request and command receipt, then appends an immutable run directory on the adopted non-source evidence branch. It checks existing no-deletion/no-force-push protection and current authority before remote mutation. Non-fast-forward conflicts rebuild against the current branch tip; identical already-published content is reused and conflicting content is rejected.

Stage workflows retain the small visual manifest with their existing bounded JSON result, upload PNGs as a separate visual artifact, and download those images only after a validated provided assessment. Refinement, proposal, implementation and same-PR corrections use the same transport. The original 2 MiB result archive reader remains unchanged.

Issue and PR Markdown use commit-pinned image URLs with `raw=true`. Before screenshots identify the admitted source. Candidate screenshots bind to the checked tree; that tree is separately checked against the published PR head by the existing implementation publisher. Host integrity validation is not independent proof that the image shows the claimed running application. Capture provenance says `agent-declared capture`; proposed images say `isolated proposed-design renderer`. Neither grants acceptance.

## Failures and recovery

Unsafe paths, symlinks, mismatched metadata, malformed/oversized PNGs, missing files, unavailable browser, deadline exhaustion and publication policy failures remain explicit. Capture/render failures return a blocked stage with the responsible maintainer action. Publication failures fail the workflow; retained Actions evidence and the existing failure handoff allow reconciliation. Images never become acceptance evidence solely because the workflow, PR or source check passed. Corrections remain on the same issue/PR and preserve historical images.

## Review method and limits

Ponytail review traces admission, validation, rendering, collection, publication, skills, package distribution and the refinement permission. Agent-facing guidance uses Writing for Agents; human explanations use the packaged Plain English and Humanizer fallback and evidence comparison. No external helper execution is claimed for those fallback passes. Automated and native exercises require separate execution evidence; source changes alone do not establish them.

## Static review receipt

Syntax checks and module imports resolve for the new modules and modified host entrypoints. Markdownlint passes for 460 files; local links pass for 1,085 documents; strict OpenSpec validation passes for this change. ProductShape reports no diagnostics for the four new documents; the repository-wide report separately retains 295 stale citations outside this change. Changeset status selects an SDLC minor release. No test suite or native browser/worker/publication exercise has been run locally. Automatic PR CI results are recorded against their exact heads; package release and adopter upgrade have not been performed.

Review corrections require paired existing-view comparisons, reject null/malformed capture items without dereferencing them, open file members without following symlinks or blocking on FIFOs, remove only the renderer's journal-owned container, recheck implementation authority before image publication, and compare canonical repository identity immediately before the evidence ref write. The workflow review also fixes the missing image/manifest handoff across all four producer/publisher routes using a separate bounded visual artifact. These are source-review findings and corrections, not executed regression results.

The first automatic CI run on head `479223d36cf08db3794dc1b1de45bb83a2c168fd` failed in the existing epic-refinement publication fixture because its fabricated result omitted the new required assessment. The fixture now declares its existing summary-formatting scope nonvisual; its dependency-revocation assertions and no-mutation check remain intact. No test cases were added or run locally. The first failed runs remain recorded rather than treated as passed.

All nine packaged workflow templates compile with the adopted gh-aw v0.93.2 compiler. The four changed locks were regenerated through those template sources; the other five locks compare unchanged. The CI on `90b575af9a0ee52411b889a450217e53104d42da` passed repository verification but failed the package workflow drift check because these four generated projections had not yet been refreshed. This correction retains action pins and changes only the required metadata, image transport and refinement publisher permission. The final-head automatic checks remain the source of truth for this PR.
