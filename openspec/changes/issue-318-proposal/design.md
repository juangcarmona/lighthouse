<!-- pdac-scope: cited -->

# Design

The host captures the implementation identity when authenticating owner feedback: the original implementation marker, or the product implementation's issue and apply intent. It compares that identity again with the current PR before publishing.
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->

The adapter permits an unchanged candidate only for an existing implementation correction. It still runs all independent checks in a fresh container. The publisher validates their run, source, candidate digest and commands, then rechecks current authority. The zero-diff publisher returns the existing PR without writing a tree, commit, ref or PR body. It records a new completion outcome and dispatches the adopted CI checks on the same head. Readiness accepts that receipt only for its original implementation identity.
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

A failed check, unavailable check, pending owner decision or source-changing race cannot produce completion. Repeated publication of an identical committed result is a no-op, including a lost response. Source-changing corrections retain the existing non-forced branch update.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
