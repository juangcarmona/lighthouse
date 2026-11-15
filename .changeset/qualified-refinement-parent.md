---
"@juangcarmona/lighthouse-sdlc": patch
---

# Bind repository-qualified refinement parents

Accept a decomposition parent ID such as `owner/repo#123` when it matches the admitted repository and issue, without requiring a redundant parent number. Preserve legacy IDs and reject another repository, another issue or a conflicting explicit number.
