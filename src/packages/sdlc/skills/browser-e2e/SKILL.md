---
name: lighthouse-browser-e2e
description: Validate Playwright browser evidence for a selected product journey during integration or review.
---

# Browser E2E

Use this skill only when the selected application has a browser surface and the product definition names a journey to verify.

For human-facing reports, agent-facing test instructions or UI/visual review, read and apply [the audience policy](../audience-guidance/SKILL.md). Record the pinned helper or fallback review used; Taste does not replace browser evidence or required human visual acceptance.

Read the journey, bounded context and acceptance evidence before writing or changing a test. Keep the test in the adopter repository and use the project's existing Playwright configuration when one exists.

Run the narrowest useful journey first. Collect the report and any screenshot, trace or video needed to inspect a failure. Store relative paths in the browser evidence document and validate it with `lighthouse-sdlc browser-e2e --input <evidence.json>`.

Finish with one of `passed`, `failed`, `unavailable` or `pending-review`, plus a concrete `nextAction`. A missing artifact, unavailable browser or unresolved human judgement stays visible in the result.
