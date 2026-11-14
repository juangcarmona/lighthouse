# Proposal

<!-- pdac-scope: cited -->

## Why

Writing reviews currently depend on helpers installed in a contributor's session. Issue #643 asks for consistent audience guidance, reviewed source pins and an explicit offline fallback for contributors and delivery workers.

## What Changes

- Add one package-owned audience policy: Plain English followed by Humanizer for human explanations, Writing for Agents for instructions, and Taste only for visual review.
- Record immutable upstream revisions, source paths, content digests, license findings and compatibility decisions. Ship Lighthouse-authored fallback reviews rather than installing external hooks or depending on network access during delivery.
- Link repository guidance, SDLC stage skills and public-result guidance to the same policy, including PR summaries and change overviews.
- Add focused fixtures for audience mapping, authority boundaries, stage pointers and package contents.

## Capabilities

### New Capabilities

None. This change documents and tests presentation guidance; it adds no runtime capability or lifecycle transition.

### Modified Capabilities

None. The inventory contains `issue-control`, `opaque-source-link-tree` and `unattended-ci-wait`; none concerns writing guidance. Use `skip_specs: true` for this documentation/tooling change.

## Product alignment

The policy implements the existing human-facing writing policy for change overviews, preserves authority boundaries and belongs to the SDLC package's existing ownership of delivery skills. No product model edit or Product Change is needed.
<!-- pdac:cite id="FR-CHANGE-OVERVIEW" digest="sha256:83a43bb0871c9d8785defad12c95b61b015386e24b4d9644bf88018abb4ce184" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
<!-- pdac:cite id="BR-SDLC-PACKAGE-BOUNDARY" digest="sha256:4ba55af58f445e06672a1a7cc82a2f35fad20051acb9f172ba297998e6af5a71" -->

Impact discovery used provider inspection and impact reports for those three artifacts. Checked neighbors `UC-RUN-SDLC`, `UC-IMPLEMENT-CHANGE`, `TERM-CHANGE-OVERVIEW` and the UI design contract remain unchanged: presentation review does not change stage admission, completion, product meaning or visual intent. Other model areas (initialization, telemetry, labels, memory, public-site projection and integrations) do not acquire new behavior.

## Impact

Changes affect `AGENTS.md`, packaged SDLC guidance, source metadata, tests and a patch changeset. There are no new dependencies, network requirements, UI changes, generated workflow changes or automatic skill installation. Existing installations need an updated package or source harness to receive this guidance; source checks alone do not prove deployed adoption.
