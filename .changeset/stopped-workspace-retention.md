---
"@juangcarmona/lighthouse-sdlc": patch
---

# Preserve interrupted execution workspaces until recovery is retained

Journal disposable adapter workspaces, retain bounded candidate changes and diagnostics before disposal, and recover stopped owners after runtime cleanup. Preserve uncertain ownership and failed collection, and stop admission when local recovery storage reaches its explicit limits. Existing Docker volume cleanup, Tini and command-owned npm scratch remain unchanged.
