---
"@juangcarmona/lighthouse-sdlc": patch
---

# Runner resource cleanup

Remove anonymous volumes during owned container phase cleanup, while preserving named volumes. Run the example runner image under Tini to reap orphaned child processes.
