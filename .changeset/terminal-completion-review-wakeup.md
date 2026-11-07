---
"@juangcarmona/lighthouse-sdlc": patch
---

# Wake final review when integration completes

Reconcile retained final-review continuations on successful integration and adopted CI completion, keeping the periodic fallback. Delegated delivery retains the same confirmed status and pending-review identity. Review context records the authenticated CI and recovery trigger so a scheduled continuation can be distinguished from a manual replay.
