---
"@juangcarmona/lighthouse-sdlc": patch
---

# Recover engine-owned files after abrupt adapter loss

Restore filesystem ownership before retaining and removing a stopped execution's verified workspace. Register the recovery helper under the new execution so failed helpers remain recoverable, and preserve active, unknown or substituted workspaces.
