<!-- pdac-scope: none reason="Owner-authored issue #135 explicitly requests a documentation-only acceptance fixture with no product behavior or policy change." -->

# Design

## Context

See [proposal.md](proposal.md) for scope and motivation. The fixture text is fully specified by the owner; no product or visual decision is missing.

## Goals / Non-Goals

**Goals:** Preserve the supplied text exactly as UTF-8 with LF line endings and a final newline; keep the fixture and minimum plan reviewable together.

**Non-Goals:** Exercise or modify dispatch, add runtime tests or dependencies, change product specifications, publish directly, or approve integration.

## Decisions

- Add a standalone Markdown file rather than changing existing documentation. This preserves author-owned content and isolates the acceptance fixture.
- Use `skip_specs: true` rather than inventing a behavioral specification for a static document.
- Verify exact bytes with a Node assertion retained in the evidence output, not new production test code. Compare repository file hashes against the initial snapshot because this disposable workspace has no Git metadata.
- Run the policy's installation, repository verification and strict OpenSpec commands. No UI changes are involved, so screenshots, visual acceptance and backend checks are not applicable.

## Risks / Trade-offs

- Accidental whitespace changes could invalidate the fixture → compare the entire file against the exact expected string.
- Installation or verification could modify unrelated files → compare all pre-existing file hashes and allow only the fixture and this planning directory as additions, excluding generated dependency and build outputs.
- Static fixture checks do not prove runtime dispatch → leave that later operator evidence explicitly outside this stage.
