---
# Owned by @juangcarmona/lighthouse-sdlc. Compile with `gh aw compile`; do not edit the lock file.
name: Lighthouse SDLC implement
description: Execute only the Lighthouse implementation stage and return its declared stage result.
private: true
runs-on: [self-hosted, linux, lighthouse-sdlc]
runs-on-slim: ubuntu-24.04
strict: true
env:
  LIGHTHOUSE_STAGE: implement
  LIGHTHOUSE_SKILL: src/packages/sdlc/skills/implement/SKILL.md
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
        default: propose
imports:
  - shared/lighthouse-sdlc-stage.md
---

# Lighthouse SDLC implement worker

Execute only `implement` by following `${{ env.LIGHTHOUSE_SKILL }}` and reading the proposal result from `/tmp/gh-aw/agent/previous/stage-result.json` when present; for a supervised run, use the predecessor context in `/tmp/gh-aw/agent/input.json`. Change only the approved slice and paths. ProductShape and ArcShape remain external authorities; retain their citations in evidence.

Run the required checks, record changed paths and results, and write one valid result to `/tmp/gh-aw/agent/stage-result.json` with `stage: implement`, `gate: done`, implementation evidence in `output`, and separate evidence arrays. Do not invoke `integrate` or `review`. Stop at done, then call `noop` exactly once. A failed check stops the stage and preserves its evidence.
