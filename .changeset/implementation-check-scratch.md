---
"@juangcarmona/lighthouse-sdlc": patch
---

# Sufficient scratch for implementation checks

Increase the isolated `/tmp` mount for implementation agents and host checks from 1 GiB to 2 GiB. A Control Center requalification exhausted the previous mount during .NET restore and Release publish. The container memory limit and verification commands remain unchanged.
