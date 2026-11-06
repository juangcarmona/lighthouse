---
"@juangcarmona/lighthouse-sdlc": patch
---

# Engine image preflight

Validate the selected engine image before allocating runtime helpers, so a missing or invalid image reports its preflight error without leaving pending resource intents.
