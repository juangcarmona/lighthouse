<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:90af94bb73cab9bf61e3a4c6eb7d44f68b42513063adadaa629ba72e69150f69" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:404ea1496978d61bee268ee8dbd95709620c12725b2f65e8cd44bb450878e403" -->

# Show product views during delivery

## Why

Issue #642 needs concrete proposed examples before experience decisions and actual running-product captures when reviewing implementation. Existing evidence collection retains implementation files locally but does not publish those images on the work item. Read-only planning cannot run browser commands.

## What Changes

- Assess visual applicability in refinement, proposal and implementation, with an explicit reason when not applicable or unavailable.
- Render bounded proposed HTML examples in an isolated browser; retain agent-declared Playwright captures for actual implementations.
- Validate PNG dimensions, paths, sizes, hashes and request/candidate binding. Publish immutable images and their report through the adopted protected evidence branch and embed them in the same issue and delivery PR.
- Preserve existing approval, correction, merge and release boundaries. Missing current-stage visual evidence blocks completion.

## Capabilities

### New Capabilities

- `product-visual-evidence`: Concrete stage-specific examples and retained candidate captures.

### Modified Capabilities

None. This supplies the reviewable evidence required by FR-CHANGE-EVIDENCE without changing product acceptance authority.

## Impact

The SDLC skills, trusted engine adapter and publisher change. Refinement's separate publisher needs contents write access for the adopted evidence branch. No new npm dependency, agent credential, shell permission, service installation or compiler upgrade is introduced. Package/workflow adoption and native qualification remain separate from source implementation.
