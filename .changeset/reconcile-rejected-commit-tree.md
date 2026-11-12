---
"@juangcarmona/lighthouse-sdlc": patch
---

# Recover rejected implementation commits

Recover an implementation commit explicitly rejected because its tree is unavailable. Retry at most twice, using the same tree and parents, only after reading that exact tree and rechecking delivery authority. Other refusals and uncertain write failures still stop publication.
