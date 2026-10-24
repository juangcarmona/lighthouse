---
# Owned by @juangcarmona/lighthouse-sdlc. Compile with `gh aw compile`; do not edit the lock file.
name: Lighthouse SDLC review
description: Execute only the Lighthouse review stage and return its declared stage result.
private: true
runs-on: [self-hosted, linux, lighthouse-sdlc]
runs-on-slim: ubuntu-24.04
strict: true
env:
  LIGHTHOUSE_STAGE: review
  LIGHTHOUSE_SKILL: src/packages/sdlc/skills/review/SKILL.md
on:
  workflow_call:
    inputs:
      route:
        description: Lighthouse route selected by the host.
        required: true
        type: string
      run-id:
        description: Stable Lighthouse run identifier.
        required: true
        type: string
      input:
        description: Compact JSON input for this stage.
        required: false
        type: string
        default: '{}'
      previous-stage:
        description: Previous stage artifact name.
        required: false
        type: string
        default: integrate
imports:
  - shared/lighthouse-sdlc-stage.md
---

# Lighthouse SDLC review worker

Execute only `review` by following `${{ env.LIGHTHOUSE_SKILL }}` and reading the integration result from `/tmp/gh-aw/agent/previous/stage-result.json` when present; for a supervised run, use the predecessor context in `/tmp/gh-aw/agent/input.json`. Preserve ProductShape and ArcShape citations in the delivery evidence.

Classify findings, record the outcome and learning, and write one valid result to `/tmp/gh-aw/agent/stage-result.json` with `stage: review`, `gate: null`, the review record in `output`, and separate evidence arrays. Do not open another delivery gate or invoke another stage. Call `noop` exactly once after recording the closing result.
