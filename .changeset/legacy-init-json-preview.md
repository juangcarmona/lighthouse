---
"@juangcarmona/lighthouse": patch
---

# Honor JSON output for legacy initialization previews

Emit one machine-readable plan for name-based initialization with `--dry-run --format json`, preserving conflicts and local context without writes. Reject JSON apply requests; use text mode to apply initialization.
