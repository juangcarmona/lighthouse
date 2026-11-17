# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

## Context

See proposal.md for motivation. The server admits only `name` and `arguments` in tool calls. The existing whole-answer index identifies exact decoded bodies but its guidance relies on reading the entire audit; the reported native reader truncated a JSON line to 2000 characters. Neither observation establishes the original native wire fields.

## Goals / Non-Goals

**Goals:** Repair this compatibility boundary and expose exact indexed answers through the same two existing tools and read-only audit. Preserve original bytes, authority, independent bounds and host-owned gates.

**Non-Goals:** No arbitrary context/field/file reader, shell, imports, new tools, permissions, approval or runtime-policy changes. Source and packed stdio checks cannot establish installed-native acceptance.

## Decisions

1. Admit only standard JSON-RPC request fields and supported method-specific params. For tool calls allow `name`, optional object `arguments` and optional object `_meta`. Validate the supported progress token as a string or finite number; refuse unsupported metadata fields and never merge metadata into arguments. Unknown call-envelope fields and unsafe/malformed metadata refuse. Negotiate a supported MCP version, offering the original version when the requested version is unknown. Ignoring all unknown fields would conceal incompatible requests.
2. Add an exclusive `history` variant to the existing `inspect` arguments. Require current full binding, exact raw audit SHA-256, an existing whole-answer `{source, sha256, bytes}` reference, byte `offset` and `limit` (1–1024). Rebuild the existing working view to validate all input/history/reference bounds and confirm that whole-answer transport actually applies. No caller-supplied index or arbitrary selector is authoritative.
3. Return exact decoded text at UTF-8 byte boundaries, the chunk hash and next byte offset (null at end), together with the whole-answer and audit identity. Refuse offsets inside a code point, outside the body or limits too small to contain its next code point. A shorter final chunk is explicit, never silent truncation. Consumers concatenate in offset order and verify the whole decoded body hash/bytes before claiming inspection. Full-body responses risk another truncation; byte-bounded paging avoids relying on native line-reader behavior.
4. Keep the context file constructor-owned. Hash its raw bytes before parsing, preserving whitespace-sensitive audit identity. Inspection never writes; composition's validation and atomic write remain unchanged. Revalidate on every request instead of caching stale audit/authority.

## Risks / Trade-offs

- Revalidating the audit for each chunk costs CPU → keep requests sequential and chunks bounded; do not cache authority across changing inputs.
- A native client may send other fields or truncate tool results → record synthetic evidence honestly; capture the actual pinned request envelope and qualify exact reconstruction in the installed acceptance run before asserting native success.
- Whole-answer chunks contain untrusted instructions → return inert text only; guidance preserves unresolved decisions and approval boundaries.
- An unarchived #722 capability is not a main spec → reuse its capability name without editing its plan; this issue's delta specifies only this inspection correction.

## Verification and delivery

Run focused protocol, context, adapter and packed-server regressions, all policy checks, provider citations and strict plan validation. Retain original failures and unexecuted native cases. No domain lifecycle exists for this inspection boundary. SB-SDLC-GATES and SB-CHANGE-FLOW-VERIFIED govern evidence honesty and authorized continuation; source tests cover only preparation/refusal, not their entire journeys. Review/integration, protected release, managed installation and actual pinned OpenCode 2.1.0 catalog/document/answer/composition/provider qualification remain separate follow-up steps. Roll back through a reviewed source/package version, never live-module patches.
