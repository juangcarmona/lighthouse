---
"@juangcarmona/lighthouse-sdlc": patch
---

# Keep workflow failures in their source context

Disable failed-job issue creation in native workflow templates as well as agent failure reports. Keep failed Actions checks and source-bound stop receipts, without creating a backlog item for each execution or retry. Existing adopters must regenerate their workflow locks.
