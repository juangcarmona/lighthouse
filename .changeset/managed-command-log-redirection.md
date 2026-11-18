---
"@juangcarmona/lighthouse-sdlc": patch
---

Keep managed commands usable when their caller redirects output to the same live log. Reuse that regular stdout descriptor without copying the log onto itself, preserve existing unrelated logs, and settle setup failures with a terminal failed receipt before releasing the command slot. Clarify the separate caller log path in the implementation guide.
