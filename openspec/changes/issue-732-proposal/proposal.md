# Repair retained composition inspection

<!-- pdac-scope: cited -->

## Why

The local composition server rejects valid MCP request metadata, and a native line-limited read cannot expose exact answer bodies from a long single-line audit. Workers need bounded access to the original decisions without retranscribing retained files or weakening their authority.

## What Changes

- Validate supported MCP request envelopes and inert progress metadata separately from strict tool arguments; refuse unknown or malformed fields.
- Extend the existing inspection operation to retrieve indexed original answer bodies in UTF-8-safe bounded chunks, bound to the exact audit digest, request identity and whole-answer source/hash/byte identity.
- Preserve current and historical document separation, all existing limits, exhaustive composition and atomic refusals.
- Add synthetic source, adapter and packed-server regressions and a patch changeset. Keep installed-native qualification distinct from source verification.

## Capabilities

### New Capabilities

- `retained-product-context`: Exact bounded inspection of original indexed decisions through the existing retained context boundary. Reuses the name in the unarchived #722 plan; the current main-spec inventory has no retained-context capability.

### Modified Capabilities

None. The four main capabilities concern unrelated issue control, command scratch, source links and CI waiting. Accepted product intent does not change.

## Impact

SDLC composition server, working-context guidance and issue-admitted verification paths. No dependencies, permissions, provider-owned accepted artifacts or downstream source changes. FR-PRODUCT-CHANGE-WORKFLOW and BR-PRODUCT-CHANGE-HANDOFF remain the authorities.

<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:78a85b31789efb8160bb10d404f53aff4dca3a11f326088960904631ceddda78" -->
