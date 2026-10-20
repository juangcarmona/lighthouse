---
title: Risks and technical debt
arc42-section: "11"
description: Known limits of the current implementation and documentation.
---

# 11. Risks and technical debt

| Risk | Evidence | Response |
| --- | --- | --- |
| The proposed delivery harness is ahead of the CLI | The CLI only implements `init` and `verify` | Keep proposed behavior in the active Product Change until code and tests exist |
| The public site is hand-authored | `scripts/build-public-site.mjs` copies `src/public-site/` | Treat ProductShape and ArcShape projection as future work |
| Distribution is local | Package manifests are private and the workflow does not publish them | Prove one consumer before choosing a registry or release service |
| The Lighthouse .NET profile is a reference | Storage and deployment are intentionally development-only | Let each product choose persistence, hosting and operations |
| Provider ownership can drift | ProductShape, ArcShape and OpenSpec have separate managed paths | Run each provider's validator and keep Lighthouse integrations thin |

No hosted Lighthouse runtime, tracker adapter, agent memory store or CodeGraph integration is implemented here.
