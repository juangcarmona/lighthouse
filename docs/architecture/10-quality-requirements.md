---
title: Quality requirements
arc42-section: "10"
description: Current measurements and target quality outcomes for profile-aware initialization and delivery.
---

# 10. Quality requirements

| Quality | Current evidence | Target realization |
| --- | --- | --- |
| Predictable adoption | Manifest and managed projection tests | Baseline structure and first-use report selected by `init` |
| Profile fit | Current package and .NET profile checks | Stack and application-shape profiles own applicable guidance and checks |
| Reproducibility | Locked npm and NuGet dependencies and pinned toolchains | Profile assets and checks are versioned with the installer |
| Feature traceability | Reference modular profile and architecture tests | Frontend, API, backend modules and evidence map by bounded context |
| Testability | Node, .NET, analyzer, HTTP, gallery and axe checks | Red-green unit work followed by integration and evidence-backed E2E |
| Package isolation | Package `files` and export declarations | Each profile distributes only its owned templates, guidance and checks |
| Documentation hygiene | Markdownlint and local link checks | ArcShape keeps architecture canonical and ProductShape keeps product intent canonical |
| Adoption safety | Creator tests preserve occupied targets | `init` reports created, preserved, blocked and unsupported paths |

The target rows describe the draft product architecture and remain unimplemented until the initializer and profiles provide the corresponding evidence.
