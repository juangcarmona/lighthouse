---
title: Quality requirements
arc42-section: "10"
description: Quality goals that the current checks can observe.
---

# 10. Quality requirements

| Quality | Current evidence |
| --- | --- |
| Reproducibility | Locked npm and NuGet dependencies, pinned Node and .NET toolchains |
| Package isolation | Package `files` and export declarations plus package tests |
| Documentation hygiene | Markdownlint and local link checks |
| Backend correctness | Release build, analyzer tests, architecture tests and HTTP tests |
| Visual accessibility | Playwright and axe checks for the gallery |
| Adoption safety | Creator tests preserve occupied targets and verify a generated product |

The repository does not currently measure delivery throughput, tracker state, agent runs or public-site synchronization with ProductShape and ArcShape.
