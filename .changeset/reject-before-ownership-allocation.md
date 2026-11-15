---
"@juangcarmona/lighthouse-sdlc": patch
---

# Reject admission before ownership allocation

Avoid creating an ownership journal or Docker helper when recovery storage is full and no workspace recovery is needed. Interrupted workspace recovery still records helper ownership before allocation.
