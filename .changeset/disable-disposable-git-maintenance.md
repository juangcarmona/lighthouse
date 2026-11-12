---
"@juangcarmona/lighthouse-sdlc": patch
---

# Keep disposable Git metadata stable

Disable automatic maintenance and garbage collection in newly created validation repositories before their first commit. This prevents background Git tasks from removing lock files while the host prepares workspace permissions. Candidate history, branch checks and source validation continue normally.
