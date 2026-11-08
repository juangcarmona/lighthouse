# Opaque source-link tree binding

## Trusted input

Extract sorted `{path, mode: '120000', sha}` records from the exact admitted Git revision. Existing `committedSource`/source-file checks authenticate checkout bytes and link metadata; this change keeps links out of the executable source map. A versioned request field binds revision and entries, with safe bounded unique paths, exact keys and SHA validation. No target bytes belong in the request or model context. The source host alone supplies this field.

## Provenance production and independent reconstruction

Use one canonical projection of a complete admitted Git tree: select exactly the tracked `120000` blob entries, sort by path, and bind them to the revision. The local producer reads `git ls-tree` for that exact revision and authenticates working link metadata through the existing source-file validation before constructing the host request. Normal native preparation and unattended entry use this producer; model output is never an input to it. The unattended child receives this host-owned descriptor because its synthetic executable snapshot deliberately omits links.

The retained command-evidence reader independently fetches the immutable source commit and its complete bounded Git tree from the authenticated repository API. It applies the same canonical projection and compares exact revision/path/mode/blob-SHA entries with the retained request/evidence descriptor, before accepting its command binding or published tree. A descriptor matching its own artifact digest alone is insufficient. Missing descriptor data when the source has links, a partial/truncated tree, changed path/SHA/mode or another source revision fails closed. Empty source inventories keep the legacy binding shape. Add negative tests where an attacker updates both artifact descriptor and its claimed digest: reconstruction from the admitted commit must still reject it.

## Checked tree

Keep `prepareImplementationWorkspace` and regular-file checks unchanged. When opaque entries exist, create a private temporary index based on the candidate HEAD index, insert only those absent source-link entries, and call Git's `write-tree --missing-ok`. The original index, HEAD and filesystem remain unchanged. Reject collisions with checked regular files or directories, missing/invalid metadata, and unsupported modes. A successful result represents the checked regular files plus the admitted opaque links that publication preserves. Empty metadata uses the existing HEAD tree directly.

Bind the metadata digest into schema-2 command evidence when present. Propagate it from normal native preparation and unattended requests; preserve it in retained evidence and reconstruct it in current evidence validation. Model output cannot choose the field, mutate its entries or request a weaker comparison. The publisher's exact checked/published-tree guard stays unchanged.

## Verification and rollback

Create an isolated repository with a tracked ignored skill link and a regular file. The pre-fix validation tree must differ from the Git overlay; the corrected tree must match exactly while the checked workspace contains no symlink and its original index/HEAD stays unchanged. Reject forged revision/mode/hash/duplicate/collision data and changed evidence bindings; verify unchanged behavior without links. Exercise both caller paths and existing source-link exclusion, scope and publication regressions, then run full verification and independent final-head review.

Rollback restores the prior workflow source/package/configuration together. Previously failed deliveries and draft candidates remain negative evidence; neither a repaired helper nor a local passing check retroactively qualifies them.
