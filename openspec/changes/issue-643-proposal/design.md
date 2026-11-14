# Design

<!-- pdac-scope: cited -->

## Context

See `proposal.md` for motivation and product alignment. SDLC tarballs already include the `skills` directory, and delivery workers mount that package as `/harness`. Root guidance can point directly into the same source tree. Local third-party writing helpers are not currently included.

## Goals / Non-Goals

**Goals:** Make the audience decision and offline review available through one stable skill pointer in both environments. Preserve exact artifacts and distinguish presentation findings from authoritative product or architecture decisions.

**Non-Goals:** Run external skill hooks, add host discovery infrastructure, rewrite product definitions, change gates, redesign the UI or assert deployment of this source change.

## Decisions

1. Keep the policy and all fallback reviews in `skills/audience-guidance/SKILL.md`, with an immutable source register beside it. This avoids duplicating review rules across stages. Separate per-helper installations would introduce contributor setup, transitive assets and host-dependent execution.
2. Use pinned upstream helpers only when the exact reviewed source is available; otherwise perform the corresponding checked-in manual review and record that method. Do not claim the upstream skill ran. No helper availability failure blocks prose review when the explicit fallback can be completed. Missing required evidence or human decisions still block delivery.
3. Run Plain English first for clarity, Humanizer second for natural wording, then compare against source evidence. For mixed documents, review explanatory prose separately from commands, frontmatter, normative specifications and agent instructions. Writing for Agents governs executable instructions and their pointers.
4. Treat Taste as critique of UI/visual changes under the accepted UI contract. Its upstream website layouts, palette choices, animation requirements and hooks are not adopted. A style recommendation cannot change product or architecture authority or waive required visual acceptance.
5. Cover policy structure and deliberate contradictions with offline tests, and assert inclusion in the npm artifact. These checks detect known guidance drift, not writing quality or product correctness; reviewers still inspect meaning.

The overview and authority decisions follow the existing product contracts.
<!-- pdac:cite id="FR-CHANGE-OVERVIEW" digest="sha256:83a43bb0871c9d8785defad12c95b61b015386e24b4d9644bf88018abb4ce184" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
<!-- pdac:cite id="BR-SDLC-PACKAGE-BOUNDARY" digest="sha256:4ba55af58f445e06672a1a7cc82a2f35fad20051acb9f172ba297998e6af5a71" -->

## Risks / Trade-offs

- Manual review differs from running upstream helpers → name the method and retain source evidence; the policy never claims equivalence to an executed external skill.
- External sources evolve or disappear → immutable revisions and digests identify the reviewed material; delivery uses checked-in fallbacks without fetching anything.
- Phrase checks miss arbitrary contradictions → mutation fixtures cover concrete regressions, and the policy retains a semantic review requirement.
- Taste conflicts with existing design choices → retain Lighthouse's contract and report the conflicting recommendation rather than applying it.

## Migration Plan

Ship the new skill, links, tests and patch changeset together. Contributors read the root pointer; package users read the SDLC guide and stage skills. Existing installed workers adopt the updated package through their normal update route. Rollback removes this guidance and its pointers together; no data or runtime migration is required.
