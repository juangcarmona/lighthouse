---
title: Runtime view
arc42-section: "06"
description: Important local interactions implemented by Lighthouse.
---

# 6. Runtime view

## Verify the repository

```mermaid
sequenceDiagram
    accTitle: Repository verification
    participant User as Developer or CI
    participant NPM as npm scripts
    participant Checks as Tests and validators
    participant Site as Public-site verifier
    User->>NPM: npm run verify
    NPM->>Checks: markdownlint, Node tests and link check
    NPM->>Site: build and verify static output
    Checks-->>User: pass or failure evidence
    Site-->>User: pass or failure evidence
```

`npm run verify` runs Markdown linting, Node tests, local link checks and public-site verification. `npm run verify:dotnet` runs the backend profile. `npm run test:visual` runs the gallery browser checks.

## Initialize a consuming project

1. A consuming project provides `lighthouse.json`.
2. `lighthouse init` validates the manifest and creates `LIGHTHOUSE.md`.
3. `lighthouse verify` compares the projection with the manifest and fails on drift.

The CLI refuses to overwrite an existing projection. It does not initialize ProductShape, ArcShape, OpenSpec, a tracker or an agent runtime.
