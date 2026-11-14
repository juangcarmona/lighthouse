---
"@juangcarmona/lighthouse-sdlc": patch
---

# Runner resource cleanup

Remove anonymous volumes during owned container phase cleanup, while preserving named volumes. Run the example runner image under Tini to reap orphaned child processes. Separate an operator-bounded host queue from the unchanged execution-step limits with a 180-minute agent job budget and a shared-host job-start hook.
