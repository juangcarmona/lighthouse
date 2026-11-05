---
"@juangcarmona/lighthouse-sdlc": patch
---

# Retain safe GitHub denial reasons

Include a bounded, redacted plain-text GitHub denial message in issue-stage API failures when available. Preserve the HTTP status, terminal failure and status-only fallback without retrying or changing permissions.
