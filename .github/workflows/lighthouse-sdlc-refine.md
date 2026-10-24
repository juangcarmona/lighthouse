---
# Owned by @juangcarmona/lighthouse-sdlc. Compile with `gh aw compile`; do not edit the lock file.
name: Lighthouse SDLC refine
description: Execute only the Lighthouse refinement stage and return its declared stage result.
private: true
runs-on: [self-hosted, linux, lighthouse-sdlc]
runs-on-slim: ubuntu-24.04
strict: true
env:
  LIGHTHOUSE_STAGE: refine
  LIGHTHOUSE_SKILL: node_modules/@juangcarmona/lighthouse-sdlc/skills/refine/SKILL.md
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
        default: triage
imports:
  - shared/lighthouse-sdlc-stage.md
---

# Lighthouse SDLC refine worker

Execute only `refine` by following `${{ env.LIGHTHOUSE_SKILL }}` and reading the triage result from `/tmp/gh-aw/agent/previous/stage-result.json` when present; for a supervised run, use the predecessor context in `/tmp/gh-aw/agent/input.json`. Use the current ProductShape and ArcShape citations supplied by the host; keep them in evidence and do not replace either authority.

Do not invoke `propose` or any later stage. Return one valid result in `/tmp/gh-aw/agent/stage-result.json` with `stage: refine`, `gate: ready`, the bounded problem in `output`, and separate evidence arrays. Stop at the ready gate, then call `noop` exactly once. If a prerequisite or check fails, return the declared failure or blocked status with the evidence preserved.
