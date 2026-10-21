---
name: lighthouse-sdlc-integrate
description: Use when an implemented slice is ready for dependency checks, pull request coordination, tracker synchronization and merge preparation.
---

# Integrate

Prepare a completed slice for the project's forge and branch policy.

## Steps

1. Recheck the Done evidence and the declared dependency order.
2. Verify the branch, commit, pull request and required CI checks against project policy.
3. Synchronize the work item and pull request state using the project's configured labels.
4. Prepare the merge or stacked change action and leave protected or human decisions explicit.
5. Return the integration record without merging unless the selected route and repository policy authorize it.

## Completion

The change is ready for its configured merge action, every required check is linked and unresolved decisions have an owner.
