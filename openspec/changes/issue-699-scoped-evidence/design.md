<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:5ad51bbe6a7b8ed785cac7bc5ed1ab8d105c1541d873d3afcc65f82712cadab1" -->

# Evidence selection and resource accounting

Extract exact artifact IDs from the admitted issue and owner-answer context. Match them to the current provider graph, include their direct incoming/outgoing neighbours, and prioritize issue roots before neighbours in deterministic ID order. Record unmatched references separately; they do not prove missing product intent.

Each artifact keeps a report file and provider citation, preserving the existing installation inventory and read-only checks. Unselected reports explicitly mark detail unavailable. Selected reports retain provider inspection, impact and relevant lifecycle/behaviour definitions when they fit. Oversized impact or inspection is replaced as a whole with explicit unavailable metadata, preserving source discovery and every resource bound. Reserve the complete compact inventory before adding detail so later artifacts never disappear because earlier reports exhausted the aggregate budget.

Scope metadata records the selection and unavailable detail. Worker instructions direct further discovery to the accepted source model and preserve evidence limitations in the assessment. Missing context cannot grant product approval or establish model absence. Callers without an issue scope retain complete-report behavior and its existing failures.

Per-model-file and aggregate model fingerprints, 512 KiB report/index limits, 16 MiB prepared reports, 17 MiB installed files, safe identities and paths, baseline rechecks and complete inventory validation remain enforced. No new dependency, workflow, credential or scheduler is introduced.

Extract text values from structured context before matching artifact references. JSON escape sequences are transport syntax: matching directly against serialized JSON can consume a leading `ACT` or `UC` after an escaped newline and leave only a shortened identifier. Keep the existing whole-ID matcher and text byte bound.
