---
# Owned by @juangcarmona/lighthouse-sdlc. Compile with `gh aw compile`; do not edit the lock file.
name: Lighthouse SDLC integrate
description: Execute only the Lighthouse integration stage and return its declared stage result.
private: true
runs-on: [self-hosted, linux, lighthouse-sdlc]
runs-on-slim: ubuntu-24.04
strict: true
env:
  LIGHTHOUSE_STAGE: integrate
  LIGHTHOUSE_SKILL: node_modules/@juangcarmona/lighthouse-sdlc/skills/integrate/SKILL.md
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
        default: implement
imports:
  - shared/lighthouse-sdlc-stage.md
---

# Lighthouse SDLC integrate worker

Execute only `integrate` by following `${{ env.LIGHTHOUSE_SKILL }}` and reading the implementation result from `/tmp/gh-aw/agent/previous/stage-result.json` when present; for a supervised run, use the predecessor context in `/tmp/gh-aw/agent/input.json`. Recheck Done evidence, dependencies, branch, pull request and required checks.

Prepare the configured merge or stacked-change action and leave protected or human decisions explicit. Do not merge unless the selected route and repository policy authorize it. Write one valid result to `/tmp/gh-aw/agent/stage-result.json` with `stage: integrate`, `gate: done`, the integration record in `output`, and separate evidence arrays. Do not invoke `review`; stop at the configured merge preparation, then call `noop` exactly once.
