---
title: Glossary
arc42-section: "12"
description: Architecture-specific terms used by the current Lighthouse workspace and adopter contracts.
---

# 12. Glossary

| Term | Meaning |
| --- | --- |
| Adopter | A project that consumes Lighthouse guidance, packages or profiles |
| Application shape | The shape recorded in an initialization plan or manifest, such as frontend, full-stack, service or mobile |
| Aspire composition boundary | The product-defined AppHost boundary for an initialized application; the current CLI does not generate it |
| Baseline | The versioned set of Lighthouse repository structure, checks, packages and guidance |
| Bounded context | A domain boundary used to organize behavior, modules and evidence |
| Feature alignment | A traceable relationship between a frontend feature, API boundary, backend behavior and tests |
| Hard guardrail | A deterministic check that can fail on a verifiable violation |
| Authority adoption | Read-only validation of existing ProductShape and ArcShape paths followed by recording exact provider versions in Lighthouse configuration |
| Capability catalog | Versioned SDLC package data that declares provider capabilities and their registered adapters |
| Lighthouse-owned backend | A backend generated or adopted through a selected profile; the current repository only supplies the .NET reference profile |
| Managed projection | A generated file whose source is another declared artifact, such as `LIGHTHOUSE.md` |
| Modular monolith | A single deployable application organized into bounded contexts and feature slices |
| Profile | A bounded set of stack-specific source, templates, examples, guidance and checks |
| ProductShape | The product-intent authority and validator when a project adopts it |
| ArcShape | The architecture-documentation authority when a project adopts it |
| OpenSpec | The change-artifact tool configured in this repository |
| Soft guardrail | Guidance, skill, template or example that explains an expected practice without deterministic enforcement |
| Reference profile | Example source and checks that demonstrate a contract without defining adopter infrastructure |
