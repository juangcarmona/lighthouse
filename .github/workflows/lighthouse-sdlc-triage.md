---
# Owned by @juangcarmona/lighthouse-sdlc. Compile with `gh aw compile`; do not edit the lock file.
name: Lighthouse SDLC triage
description: Execute only the Lighthouse triage stage and return its declared stage result.
private: true
runs-on: [self-hosted, linux, lighthouse-sdlc]
runs-on-slim: ubuntu-24.04
strict: true
env:
  LIGHTHOUSE_STAGE: triage
  LIGHTHOUSE_SKILL: src/packages/sdlc/skills/triage/SKILL.md
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
        description: Previous stage artifact name; empty for triage.
        required: false
        type: string
        default: ''
imports:
  - shared/lighthouse-sdlc-stage.md
---

# Lighthouse SDLC triage worker

Execute only `triage` by following `${{ env.LIGHTHOUSE_SKILL }}` and the package contracts in `src/packages/sdlc/routes.json`, `src/packages/sdlc/stages.json` and `src/packages/sdlc/schemas/stage-result.schema.json`. Read ProductShape and ArcShape context when the host provides citations, and preserve those citations in evidence.

Do not invoke `refine` or any later stage. Do not invent route names, labels, gates, statuses or evidence fields. Assess the work item, route, owner and evidence as the skill requires. Write one valid result to `/tmp/gh-aw/agent/stage-result.json` with `stage: triage`, `gate: triaged`, the triage record in `output`, and separate `evidence`, `missingEvidence`, `unavailableChecks` and `pendingReview` arrays. Stop at the triaged gate, then call `noop` exactly once.
