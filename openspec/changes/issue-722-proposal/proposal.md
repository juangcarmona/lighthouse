# Fix retained Product Change preparation

<!-- pdac-scope: cited -->

## Why

Evidence selection rejects admitted retained drafts because it measures repeated document bodies instead of references. Workers also receive the same retained content through several context fields, obscuring current documents and decisions.

## What Changes

- Select provider evidence through a deterministic, bounded artifact-reference projection, without raising the existing scope limit.
- Present one current reference per retained path, with exact source, revision and hash provenance; retrieve bodies through existing read-only inspection.
- Preserve decision prose and the complete original authenticated context as read-only audit evidence. Do not infer decision supersession from comment order.
- Keep candidate validation, exhaustive composition selections, approval, apply and publication gates unchanged.

## Capabilities

### New Capabilities

- `retained-product-context`: Bounded evidence references and current retained-document views backed by original audit inputs.

### Modified Capabilities

None. This implements existing FR-PRODUCT-CHANGE-WORKFLOW and BR-PRODUCT-CHANGE-HANDOFF intent; no accepted product artifacts change.

<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:78a85b31789efb8160bb10d404f53aff4dca3a11f326088960904631ceddda78" -->

## Impact

SDLC preparation, retained composition inventory and the existing OpenCode adapter; focused synthetic regressions in issue-admitted test paths. No dependency, worker permission or downstream application changes. Installed-runtime qualification remains a separate follow-up after reviewed integration and publication.
