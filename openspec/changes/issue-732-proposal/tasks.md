# Tasks

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

## 1. Protocol interoperability

- [x] 1.1 Validate supported MCP envelopes and inert metadata without relaxing tool arguments; add protocol/refusal regressions and document the contract, verified by focused composition tests.
- [x] 1.2 Apply the owner-captured session-metadata correction: admit only string `ai.opencode/sessionID` as inert metadata, preserve all previous assertions, and verify captured-shape success plus malformed-session, unsafe-argument and altered-binding refusals in composition and packed-server tests; update guidance and changeset.

## 2. Exact indexed-answer inspection

- [x] 2.1 Add digest- and binding-checked UTF-8-safe paging to existing inspection, with unchanged input and reference bounds; verify exact reconstruction and refusing cases in context/composition tests and update worker guidance.
- [x] 2.2 Exercise long single-line combined history through the adapter and packed server without ambient dependencies; preserve all existing assertions and verify exact document/answer retrieval and exhaustive composition, explicitly labelled non-native.

## 3. Candidate verification

- [x] 3.1 Add a patch changeset, finish code/architecture and audience fallback reviews, and run all policy checks plus relevant provider evidence validation; retain completed receipts and a retrospective under the evidence output.
- [x] 3.2 Re-run all configured candidate checks after the session-metadata correction and retain terminal receipts, source review and the original native failures in the new evidence output.

## Workflow follow-up

- Independently check and review the exact candidate head before integration and protected publication.
- Adopt the released package through the managed installer, retaining source/tarball/version provenance.
- Capture actual pinned-client request-envelope fields and qualify native catalog inspection, exact documents and indexed answers, exhaustive composition and trusted ProductShape validation. Existing native failures remain unresolved until that separate installed acceptance succeeds.
