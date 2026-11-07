---
"@juangcarmona/lighthouse-sdlc": patch
---

# Preserve the original early CI signal

Wait briefly for retained integration to become terminal when its original bot CI signal arrives early. The existing router then rechecks the original grant and evidence before dispatch; a missing workflow completion event no longer discards that signal.
