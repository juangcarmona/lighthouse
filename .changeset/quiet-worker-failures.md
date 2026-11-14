---
"@juangcarmona/lighthouse-sdlc": patch
---

# Keep workflow failures in their source context

Disable failed-job issue creation in native workflow templates as well as agent failure reports. Keep failed Actions checks and source-bound stop receipts, without creating a backlog item for each execution or retry. Agent preparation, execution and publication refuse job-only reruns of consumed authorizations; recovery keeps using a fresh authenticated dispatch. Existing adopters must regenerate their workflow locks.
