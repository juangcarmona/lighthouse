---
"@juangcarmona/lighthouse-sdlc": patch
---

# Stop engines when their controller exits

Stop queued and running engines when their originating controller exits, including abrupt workflow cancellation. Unattended stages pass their controller identity explicitly; existing workers monitor their identified parent. Cancellation preserves another engine's slot and uses the existing ownership cleanup.
