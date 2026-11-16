# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation. FR-PRODUCT-CHANGE-WORKFLOW and UC-PREPARE-PRODUCT-CHANGE already require bounded resumable preparation. BR-PRODUCT-CHANGE-HANDOFF separates preparation from approval/apply; BR-AGENT-LAUNCH and QR-AGENT-ISOLATION require explicit run scope. ADR-0007 keeps execution in the host and publication in the separate publisher.

## Goals / Non-Goals

**Goals:** Preserve selected UTF-8 bytes exactly, fail before replacing durable output on invalid input, and expose one deterministic capability to the pinned planning runtime.

**Non-Goals:** No general scripting, arbitrary filesystem selection, accepted-model writes, provider validation substitutes, approval, GitHub effects, lease management or changes to planning limits.

## Decisions

- Use a dependency-free local MCP server, configured only for Product Change workers through the existing adapter-owned configuration projection. Reuse the installed engine's local MCP mechanism instead of adding a scripting service or shell permission. Keep existing permissions unchanged except for the two named tool actions and their integration.
- Admit structured draft documents from JSON fences in the authenticated issue body and verified owner answers, plus an existing host-supplied candidate file array. A tagged document carries source revision, baseline digest, exact schema-pin hash, change name, revision and explicit path/content/hash objects. Source identities come from their location in admitted context, never from a claimed filesystem path. Limit retained inventory and every file; retain the existing 64-file, 64-KiB-file and 512-KiB-candidate bounds.
- Inspection returns measured inventory metadata and current binding without echoing all content. An optional exact object reference returns one file for inspection. Composition names every path, selecting its latest revision or explicitly omitting it and acknowledging all superseded objects. Missing provenance, conflicting revisions, stale bindings, duplicate paths/IDs and invalid text fail closed.
- The caller supplies a normal stage envelope with no candidate files. The operation inserts only selected files and pending provider validation, validates the complete envelope using existing validators, then replaces `/output/envelope.json` atomically. It cannot create passing evidence, product approval or provider success. A successful write reports counts/bytes/digest, not a provider assessment.
- Align Product Change envelope transport with the existing 2-MiB Actions artifact-member limit; the generic 128,000-byte engine limit cannot carry a 276-KiB draft. Other workers retain their current envelope limit. This changes JSON transport capacity, not the 64-file/64-KiB-file/512-KiB-total candidate limits; composition also checks the encoded envelope before writing it.
- Keep provider-owned manifest semantics with the trusted validator. Regression fixtures independently verify exact manifest operation sets and all selected contents; composition only performs the existing candidate validator plus unambiguous artifact-ID checks.

## Risks / Trade-offs

- [Older engine policy cannot expose local MCP] → Return an actionable unsupported-capability outcome and retain native qualification as a separate authorized follow-up; never widen shell permissions.
- [Untrusted content contains instructions or executable text] → Treat all objects as inert text; accept no command, URL, input path or output path parameters.
- [Multiple retained revisions obscure omission] → Require exhaustive explicit selection/omission and latest revision checks; never infer a replacement from prose.
- [Source and shim tests cannot prove installed execution] → Report package/source, transport execution and native-engine qualification separately.

## Migration Plan

Release the SDLC patch through the protected package route, update adopter package/workflow pins through the owning installer, and qualify the exact pinned engine with a synthetic complete candidate. Rebuild/repin an image only if its local-MCP policy is incompatible. Roll back by restoring the previous package/workflow pin; retained source drafts and prior durable outputs remain untouched. Integration, npm publication, clean-consumer installation, native qualification and merge/release decisions remain separate receipts.

<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->
<!-- pdac:cite id="QR-AGENT-ISOLATION" digest="sha256:731985a0bf28b2715a594b54342c254017eabe0e41fc14e3d12144b82240208b" -->
