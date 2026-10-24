---
# Owned by @juangcarmona/lighthouse-sdlc. Compile with `gh aw compile`; do not edit the lock file.
name: Lighthouse SDLC propose
description: Execute only the Lighthouse proposal stage and return its declared stage result.
private: true
runs-on: [self-hosted, linux, lighthouse-sdlc]
runs-on-slim: ubuntu-24.04
strict: true
env:
  LIGHTHOUSE_STAGE: propose
  LIGHTHOUSE_SKILL: src/packages/sdlc/skills/propose/SKILL.md
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
        default: refine
imports:
  - shared/lighthouse-sdlc-stage.md
---

# Lighthouse SDLC propose worker

Execute only `propose` by following `${{ env.LIGHTHOUSE_SKILL }}` and reading the refine result from `/tmp/gh-aw/agent/previous/stage-result.json` when present; for a supervised run, use the predecessor context in `/tmp/gh-aw/agent/input.json`. ProductShape, ArcShape and OpenSpec remain their own authorities; preserve their citations and artifact references in evidence.

Do not invoke `implement` or any later stage. Return one valid result in `/tmp/gh-aw/agent/stage-result.json` with `stage: propose`, `gate: planned`, the change artifacts in `output`, and separate evidence arrays. Stop at the planned gate, then call `noop` exactly once. If a prerequisite or check fails, return the declared failure or blocked status with the evidence preserved.
