---
# Owned by @juangcarmona/lighthouse-sdlc. Shared stage mechanics for the local gh-aw workers.
description: Shared runner, input, evidence and stage-result mechanics for Lighthouse SDLC workers.
engine: copilot
permissions: read-all
checkout:
  fetch-depth: 0
tools:
  bash: [cat, find, git, node, npm, npx, rg]
  edit:
  github:
    toolsets: [repos, issues, pull_requests]
safe-outputs:
  report-failure-as-issue: false
  create-issue: false
  noop:
    max: 1
    report-as-issue: false
steps:
  - name: Install the locked consumer packages
    run: npm ci --ignore-scripts
  - name: Check the installed SDLC version
    run: node node_modules/@juangcarmona/lighthouse-sdlc/src/installation.mjs
  - name: Materialize the host input
    shell: bash
    env:
      STAGE_INPUT: ${{ inputs.input }}
    run: |
      set -euo pipefail
      mkdir -p /tmp/gh-aw/agent
      printf '%s\n' "${STAGE_INPUT:-"{}"}" > /tmp/gh-aw/agent/input.json
  - name: Load the previous stage result
    if: inputs.previous-stage != ''
    uses: actions/download-artifact@v8
    with:
      name: lighthouse-sdlc-${{ inputs.run-id }}-${{ inputs.previous-stage }}
      path: /tmp/gh-aw/agent/previous
post-steps:
  - name: Preserve the stage result
    if: always()
    shell: bash
    run: |
      set -euo pipefail
      mkdir -p "$GITHUB_WORKSPACE/.lighthouse/gh-aw"
      result=/tmp/gh-aw/agent/stage-result.json
      if [ -f "$result" ]; then
        cp "$result" "$GITHUB_WORKSPACE/.lighthouse/gh-aw/stage-result.json"
      else
        echo "::error::The worker did not produce /tmp/gh-aw/agent/stage-result.json"
        exit 1
      fi
  - name: Require completion of the dispatched stage
    if: always()
    shell: bash
    env:
      EXPECTED_STAGE: ${{ env.LIGHTHOUSE_STAGE }}
      EXPECTED_RUN_ID: ${{ inputs.run-id }}
      RESULT_FILE: /tmp/gh-aw/agent/stage-result.json
    run: |
      set -euo pipefail
      node node_modules/@juangcarmona/lighthouse-sdlc/src/sdlc.mjs stage-result --input "$RESULT_FILE" \
        --require-complete --stage "$EXPECTED_STAGE" --run-id "$EXPECTED_RUN_ID" --format json
  - name: Upload stage evidence
    if: always()
    uses: actions/upload-artifact@v7
    with:
      name: lighthouse-sdlc-${{ inputs.run-id }}-${{ env.LIGHTHOUSE_STAGE }}
      path: ${{ github.workspace }}/.lighthouse/gh-aw/stage-result.json
      if-no-files-found: warn
      retention-days: 14
---

# Lighthouse SDLC worker mechanics

The host input is in `/tmp/gh-aw/agent/input.json`. If this worker has a previous stage, its validated result is in `/tmp/gh-aw/agent/previous/stage-result.json`.

Set `runId` to `${{ inputs.run-id }}`. A worker completes only with `status: passed`, the declared stage and gate, empty `missingEvidence`, `unavailableChecks` and `pendingReview` arrays, and evidence whose status is `passed` or `not-applicable`. Preserve unresolved work in a `ready`, `blocked` or `failed` result; it is uploaded for inspection and fails the worker. Worker completion does not approve a human gate.
