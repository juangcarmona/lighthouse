# Design

<!-- pdac-scope: cited -->

The publisher removes `ready` when implementation starts. A new implementation PR starts in draft and its result comment records the exact PR, head, run and whether the candidate passed host checks. The issue projects `pr-draft`. A CI completion for that head checks the repository's required checks, verifies the bot-owned PR and published result, then marks the PR ready and projects `pr-ready`. Repeated events make the same projection. A manual ready event on an incomplete or unchecked PR restores draft and reports why.

<!-- pdac:cite id="FR-LABEL-STATE" digest="sha256:754d81137a03d3679e7213068b36a5377dd5aa02fe479be14ad720973bf2d705" -->
<!-- pdac:cite id="QR-LABEL-DETERMINISM" digest="sha256:73569634bd1ef7f981ded88c9567f96f2c128fc03cf494c6bb179f48d550fc6d" -->

Owner feedback keeps the existing PR branch and returns it to draft while corrections run. A manual conversion to draft is respected for that head. Missing link metadata, a foreign PR or a stale head cannot grant readiness. A closed unmerged PR leaves the issue open with a next action. Merge remains an owner decision; the final review remains the issue-closing action.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
<!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:bf1ff365ec01cf2d4ced18899e1fbd86ffcd406b15b1f07b626ffab41a80f674" -->

Issue comments link to the exact PR and run. The PR body links to the issue with `Refs #...`, states the candidate result and next action, and links to evidence. The packaged writing skill keeps the worker's public result brief; detailed receipts stay in Actions.

<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

## Risks

- A CI event can race with publication cleanup. Reservation blocks readiness; cleanup rechecks after release.
- PR or issue metadata can change between events. Recheck current head, bot identity, marker and checks before each projection; stop or return to draft when they no longer match.
- The GitHub adapter uses a PR draft mutation. The package keeps that mutation in the host publisher, outside the agent container.
