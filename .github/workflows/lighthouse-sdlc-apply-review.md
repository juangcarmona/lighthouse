---
# Owned by lighthouse-sdlc. Regenerate the lock with gh aw v0.93.2.
name: apply review
description: Apply authorized feedback to the existing proposal or implementation PR.
run-name: "apply-review #${{ inputs.issue }} · request ${{ inputs.dispatch-request }}"
concurrency:
  group: lighthouse-issue-${{ inputs.issue }}
  cancel-in-progress: false
  queue: max
  job-discriminator: ${{ github.run_id }}
on:
  # The required preparation job authenticates the originating owner request.
  roles: all
  workflow_dispatch:
    inputs:
      issue:
        description: Source issue
        required: true
        type: string
      dispatch-request:
        description: Authenticated router receipt comment ID
        required: true
        type: string
  needs: [prepare]
if: needs.prepare.outputs.eligible == 'true'
runs-on: [self-hosted, linux, lighthouse-workflow]
runs-on-slim: ubuntu-24.04
timeout-minutes: 55
env:
  LIGHTHOUSE_RECOVERY_ENABLED: ${{ vars.LIGHTHOUSE_RECOVERY_ENABLED }}
  LIGHTHOUSE_WORKER: apply-review
  LIGHTHOUSE_DISPATCH_REQUIRED: "true"
permissions:
  contents: read
engine:
  id: opencode
  command: node
imports:
  - shared/lighthouse-opencode.md
# Subscription authentication runs inside the operator's Docker engine sandbox.
# This profile does not claim AWF network isolation or API-proxy credential isolation.
strict: false
features:
  dangerously-disable-sandbox-agent: true
sandbox:
  agent: false
tools:
  github: false
safe-outputs:
  create-issue: false
  report-incomplete: false
  threat-detection: false
  report-failure-as-issue: false
  report-missing-tool: false
  report-missing-data: false
  noop:
    report-as-issue: false
network:
  allowed: []
steps:
  - name: Check out the authorized product revision
    uses: actions/checkout@v5
    with:
      persist-credentials: false
      ref: ${{ needs.prepare.outputs.source_revision }}
  - name: Load the pinned harness package
    uses: actions/checkout@v5
    with:
      repository: juangcarmona/lighthouse
      ref: cee9f62f8161771ea16366c6360b82e0efad045c
      path: tools
      persist-credentials: false
  - name: Load the authorized issue context
    uses: actions/download-artifact@v8
    with:
      name: lighthouse-${{ needs.prepare.outputs.artifact_prefix }}input-${{ inputs.issue }}-${{ github.run_attempt }}
      path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
post-steps:
  - name: Validate the Lighthouse result
    run: node tools/src/packages/sdlc/src/issue-actions.mjs validate
  - name: Preserve the result and runtime receipt
    if: always()
    uses: actions/upload-artifact@v7
    with:
      name: lighthouse-${{ needs.prepare.outputs.artifact_prefix }}result-${{ inputs.issue }}-${{ github.run_attempt }}
      path: |
        ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/envelope.json
        ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/runtime.json
        ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/changes.json
        ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/checks.json
      if-no-files-found: error
      retention-days: 14
  - name: Preserve implementation evidence
    if: always()
    uses: actions/upload-artifact@v7
    with:
      name: implementation-evidence-${{ inputs.issue }}-${{ github.run_attempt }}
      path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/evidence/
      if-no-files-found: ignore
      retention-days: 30
  - name: Preserve OpenCode diagnostic events
    if: always()
    uses: actions/upload-artifact@v7
    with:
      name: opencode-implement-events-${{ inputs.issue }}-${{ github.run_attempt }}
      path: ${{ runner.temp }}/gh-aw/opencode-events-${{ github.run_id }}-${{ github.run_attempt }}.jsonl
      if-no-files-found: ignore
      retention-days: 14
jobs:
  prepare:
    outputs:
      eligible: ${{ steps.prepare.outputs.eligible }}
      source_revision: ${{ steps.prepare.outputs.source_revision }}
      artifact_prefix: ${{ steps.prepare.outputs.artifact_prefix }}
    name: Authorize and reserve issue
    runs-on: ubuntu-24.04
    permissions:
      actions: read
      contents: read
      issues: write
      pull-requests: write
    env:
      LIGHTHOUSE_ISSUE: ${{ inputs.issue }}
    steps:
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: cee9f62f8161771ea16366c6360b82e0efad045c
          persist-credentials: false
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Collect verified owner intent and reserve the issue
        id: prepare
        env:
          GH_TOKEN: ${{ github.token }}
        run: node src/packages/sdlc/src/issue-actions.mjs prepare
      - name: Preserve the execution request
        if: steps.prepare.outputs.eligible == 'true'
        uses: actions/upload-artifact@v7
        with:
          name: lighthouse-${{ steps.prepare.outputs.artifact_prefix }}input-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/
          if-no-files-found: error
          retention-days: 14
      - name: Release reservation if preparation failed
        if: failure()
        env:
          GH_TOKEN: ${{ github.token }}
        run: node src/packages/sdlc/src/issue-actions.mjs cleanup
  publish:
    name: Validate, publish and release
    needs: [prepare, agent]
    if: always() && needs.prepare.result == 'success' && needs.prepare.outputs.eligible == 'true'
    runs-on: ubuntu-24.04
    permissions:
      actions: write
      contents: write
      issues: write
      pull-requests: write
    env:
      LIGHTHOUSE_ISSUE: ${{ inputs.issue }}
    steps:
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: cee9f62f8161771ea16366c6360b82e0efad045c
          persist-credentials: false
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Load the execution request
        uses: actions/download-artifact@v8
        with:
          name: lighthouse-${{ needs.prepare.outputs.artifact_prefix }}input-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
      - name: Load the candidate result
        if: needs.agent.result == 'success'
        uses: actions/download-artifact@v8
        with:
          name: lighthouse-${{ needs.prepare.outputs.artifact_prefix }}result-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
      - name: Require an executed agent
        if: needs.agent.result != 'success'
        run: |
          echo 'The authorized agent did not complete successfully; inspect its execution.' >&2
          exit 1
      - name: Recheck authority and publish the validated result
        if: needs.agent.result == 'success'
        env:
          GH_TOKEN: ${{ github.token }}
        run: node src/packages/sdlc/src/issue-actions.mjs publish
      - name: Release the issue reservation
        if: always()
        env:
          GH_TOKEN: ${{ github.token }}
        run: node src/packages/sdlc/src/issue-actions.mjs cleanup
---

# Apply the owner feedback

Read `/input/context.json` and execute its supplied lifecycle skill and envelope contract. The stage remains `propose` or `implement`; this worker performs only the authorized correction on the existing PR. Read the full bounded conversation in `context.proposalReview` or `context.review`. Distinguish already-satisfied feedback from outstanding requests and preserve unrelated work. Ambiguous or conflicting requests require a precise question and a blocked result.

For a proposal, return the complete revised OpenSpec artifacts using the supplied provider instructions and keep implementation tasks pending. For implementation, update only the configured paths in the disposable workspace, run the configured checks, and retain evidence under `/output/evidence/`. The host independently verifies the candidate and rechecks the PR head and discussion before updating the same branch. It cannot merge through this worker.

Write `/output/envelope.json` with the supplied stage and identity. Report successful correction only when the required checks and decisions are satisfied. Stop after producing the candidate; publication belongs to the trusted host.
