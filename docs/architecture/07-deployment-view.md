---
title: Deployment view
arc42-section: "07"
description: Current build, package and static-site deployment boundaries.
---

# 7. Deployment view

Lighthouse has three local delivery surfaces:

| Surface | Input | Output | Runtime |
| --- | --- | --- | --- |
| CLI package | `src/packages/cli/` | Private npm tarball or workspace package | Node.js |
| Lighthouse .NET profile | `src/dotnet/` | Reference assemblies and test output | .NET SDK |
| Public site | `src/public-site/`, assets and CSS packages | `dist/public-site/` | Static host such as Cloudflare Pages |

GitHub Actions runs repository, .NET and visual checks. The workflow does not publish npm packages or deploy the public site.

The .NET example uses disposable in-memory storage and development settings. Production persistence, hosting, secrets, telemetry and recovery belong to the adopting project.
