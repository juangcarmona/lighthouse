# Compose retained Product Change drafts

Use this contract only in an admitted `product-change` worker when existing draft text is already present in the task inputs. It avoids retranscribing files; it does not validate product meaning or grant approval.

## Discover and inspect

Read `context.productChange.composition`. The adapter configures `productcomposition_inspect` and `productcomposition_compose` as local MCP tools on the pinned planning runtime. `configured` means configuration was projected, not that the engine connected or invoked a tool.

Call `productcomposition_inspect` with `{}` for the catalog and current binding. It returns measured object/path/UTF-8 byte counts and, for each path, source/hash references, revision, bytes and artifact ID where applicable. To inspect one object's exact content, call it with `reference: { path, source, sha256 }` from the catalog. Do not invent filesystem references or reread another run.

Supported inputs are the host-supplied `context.productChange.files` array and tagged JSON fences in `context.issue.body` or verified `context.issue.ownerAnswers[].body`. The host identifies these sources by their field location. A tagged document has exactly these fields:

```json
{
  "kind": "lighthouse-retained-product-draft/v1",
  "revision": 1,
  "binding": {
    "sourceRevision": "<current full source SHA>",
    "baselineDigest": "<current baseline SHA-256>",
    "changeName": "<host-assigned change name>",
    "schemaPinSha256": "<SHA-256 of the exact host schemaPin UTF-8 text>"
  },
  "files": [
    {
      "path": "openspec/changes/<change-name>/product-change/proposed/example.md",
      "content": "---\nid: FR-EXAMPLE\ntype: functional-requirement\n---\n\nExact retained text.\n",
      "sha256": "<SHA-256 of content UTF-8 text>"
    }
  ]
}
```

This is a shape example, not a valid bound input. A file can also carry an existing regular mode (`100644` or `100755`). Provider artifact IDs must be unambiguous plain `id: UPPERCASE-ID` fields in Markdown frontmatter or YAML, or a JSON `id` string. Unsupported forms require ordinary literal drafting or a truthful blocker, not guessed conversion. The trusted provider still owns full artifact and manifest validation.

Split large drafts across admitted documents rather than enlarging a prompt. At most eight documents, 64 files per document, 128 retained objects and 512 KiB of retained content are admitted. The final candidate remains at most 64 files, 64 KiB per file and 512 KiB total. Issue and answer text together are bounded to 2 MiB. A revision is a positive integer; an existing host candidate has revision zero. Multiple objects for the same path at the same revision are ambiguous and rejected.

## Select and compose

Author the normal stage envelope and candidate metadata yourself, but omit `files` and `proposalDigest`. Keep `providerValidation` exactly `{ "status": "pending", "diagnosticCount": 0 }`. Do not add successful validation evidence, approval or apply claims.

Call `productcomposition_compose` with exactly `binding`, `plan` and `envelope`:

- Copy the entire current binding returned by inspection; it additionally binds the run ID and task digest.
- Include one plan entry for every catalog path: `{ path, selected: { source, sha256 }, omitted: [...] }`.
- Select only that path's highest revision. Put every superseded reference in `omitted`.
- To omit a path entirely, set `selected` to `null` and list all its references in `omitted`. Omitting a required file fails candidate validation. This acknowledges omission; it is not an accepted-model removal operation.
- Supply the caller-authored envelope as `envelope`. The operation preserves the assessment and inserts only the complete selected file array after validating all inputs.

On success, the operation atomically replaces only `/output/envelope.json` and returns measured file/byte counts and the candidate digest, with provider validation pending. The encoded envelope must fit the existing 2-MiB artifact-member bound; content limits remain unchanged. Read the resulting envelope if needed. Do not replace it with a truncated or retranscribed array. The host still performs trusted ProductShape/OpenSpec validation before publication and a separate exact-delta product decision before apply.

## Unsupported capability or refusal

If the capability is unavailable, undiscoverable or fails, preserve source and prior output. Report a technical `blocked` Product Change outcome with a concise `blocker` and `recovery`, without candidate files. Name the workflow maintainer's concrete action: install the released package/update the workflow pin through its owning installer, qualify the pinned image's local MCP support, and retry only with fresh admission. Do not ask for product approval to fix an installation failure, enable shell access, change model/deadline/concurrency, or repair installed modules/live policy.
