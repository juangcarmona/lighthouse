---
title: Crosscutting concepts
arc42-section: "08"
description: Repository-wide mechanisms that affect several Lighthouse blocks.
---

# 8. Crosscutting concepts

## Ownership

The source tree owns implementation. ProductShape owns product intent, ArcShape owns architecture documentation and provider tools own their generated files. The package manifests define the files delivered by each npm package.

## Deterministic checks

The workspace pins dependencies in `package-lock.json`. The verification scripts fail on lint, test, link, package-boundary and public-site errors. The Lighthouse .NET profile uses a pinned SDK, locked restore and warnings-as-errors.

## Managed projection

`LIGHTHOUSE.md` is generated from a consuming project's `lighthouse.json`. The CLI compares the generated content and refuses to overwrite an existing file during `init`.

## Visual accessibility

The theme exposes semantic tokens. Components use native HTML and the gallery checks keyboard behavior, contrast, light and dark appearance and narrow viewports.
