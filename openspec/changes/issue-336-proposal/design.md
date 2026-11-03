# Design

<!-- pdac-scope: none reason="This design implements only the fixed documentation fixture authorized in issue #336 without changing product semantics or architecture." -->

## Context

See `proposal.md` for motivation. The fixture must contain only the owner-specified heading and paragraph. Repository documentation belongs under `docs/`; OpenSpec planning belongs in this change directory.

For this same-PR correction, the final wording in the [owner's review](https://github.com/juangcarmona/lighthouse/pull/339#pullrequestreview-5758505351) supersedes the original issue paragraph. Keep the heading and file format unchanged; no product or design decision remains outstanding.

## Goals / Non-Goals

**Goals:** Deliver the exact text with a reviewable, completed docs-only plan and verifiable file scope.

**Non-Goals:** Change delivery behavior, add acceptance instrumentation, edit canonical models, report owner-run observations, or merge the disposable PR.

## Decisions

- Use a plain Markdown file with a blank line between heading and paragraph and a final newline. Do not add metadata, links or explanatory text because the fixture content is exact.
- Use `skip_specs: true` rather than inventing a behavior specification. Include `schema: spec-driven`, required by OpenSpec 1.15.0 for valid change metadata, as in the existing docs-only fixture. Declare a reasoned `pdac-scope: none` in each planning document; no canonical product text is changed or restated.
- Verify exact bytes and changed-file scope, then run the supplied policy checks and repository citation verification. Keep logs and the retrospective outside the candidate in `/output/evidence/`. Browser screenshots are not applicable to this non-visual fixture.

## Risks / Trade-offs

- [A technical fixture is mistaken for proof of delivery behavior] → Claim only document and plan verification; leave duplicate-request and continuation observations to the owner.
- [Broad checks cost more than this fixture needs] → Run the explicit implementation-policy checks once successfully where possible; leave the independent clean-candidate rerun to the host.

## Migration Plan

No runtime migration or deployment. Removing the new documentation and planning directory would withdraw this fixture; the intended owner follow-up is closure without merging.
