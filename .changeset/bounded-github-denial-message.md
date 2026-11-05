---
"@juangcarmona/lighthouse-sdlc": patch
---

# Retain safe GitHub denial reasons

Include a bounded, redacted GitHub denial message in issue-stage API failures when safe. Preserve the original HTTP status and failure outcome, with status-only fallback for unsafe or unavailable diagnostics.
