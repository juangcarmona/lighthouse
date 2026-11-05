# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation. The initialization route runs both providers with captured pipes but unconditionally prints their output. Provider resolution currently throws before a result can be projected. The existing adoption route already supports JSON previews and rejects JSON apply.

## Goals / Non-Goals

**Goals:** Project actual evidence in one document; keep provider execution and conflict detection authoritative; preserve text output and preview immutability.

**Non-Goals:** New provider policy, adoption behavior, initialization choices, JSON apply, workflow activation or merge authority.

<!-- pdac:cite id="FR-AUTHORITY-INITIALIZATION" digest="sha256:7c5a19c8c532b9725eeef1c037e7b604a799ed51f7ee5f2ef470f3770815ff4d" -->
<!-- pdac:cite id="BR-OWNED-AUTHORITY" digest="sha256:927ca94ef20deb83a84734978c82c5647cd1cd41eeaed9935eda7f4a6c61f611" -->

## Decisions

- Add a quiet option to the existing provider runner rather than duplicate command execution. Default text execution remains unchanged. Only quiet previews convert executable-resolution exceptions into unsuccessful results, allowing both providers to be reported.
- Emit `schemaVersion`, `command`, `dryRun`, overall `status`, `authorities` and `apply`. Each authority contains label, package identity, exact installed version (null when unavailable), initializer command including `--dry-run`, repair command and `preflight` with `ok`, process `status` and captured `output`. Retain raw provider diagnostics rather than infer a second provider plan.
- Use existing conflict detection and process status, not output parsing or optimistic defaults, to calculate success. Emit JSON before the existing failure error so failed previews remain parseable and nonzero.
- Reject `--apply --format json` before preflights. Default no-apply JSON remains a preview, consistent with existing authority adoption. Both accepted format spellings use the shared parser.

<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

## Risks / Trade-offs

- Provider output is unstructured → retain it as a JSON string and preserve existing conflict detection.
- Missing providers could hide the other provider outcome → collect both results in quiet mode, with null process status for unavailable execution.
- Text compatibility could regress → assert current headings, commands and byte/mode/config preservation with real providers and isolated provider fixtures.

## Migration Plan

Ship a CLI patch. No data migration is needed; rollback reverts the formatting change. Provider-owned files are never modified by the preview. Integration and installed-runtime acceptance remain separately authorized later work.
