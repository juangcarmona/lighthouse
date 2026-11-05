---
"@juangcarmona/lighthouse": patch
---

# Activate installed hooks in fresh Git repositories

Activate the installed baseline hooks after legacy or semantic initialization when the target is the Git worktree root and core.hooksPath is unset. Preserve explicitly empty, custom and inherited settings, non-Git initialization, parent repository configuration and write-free previews.
