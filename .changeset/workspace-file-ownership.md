---
"@juangcarmona/lighthouse-sdlc": patch
---

# Fix container workspace installation

Give disposable implementation and verification workspaces to the container user so npm can install linked workspace executables. Allow execution from the temporary npm cache used by npx.
