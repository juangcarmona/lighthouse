---
"@juangcarmona/lighthouse-sdlc": patch
---

# Preserve failed candidates across runner jobs

Keep execution workspaces beside durable ownership journals so failed evidence collection cannot leave the only recovery checkpoint inside runner temporary storage. Existing ownership checks and retention limits remain in force.
