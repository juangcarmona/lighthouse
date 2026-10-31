---
# Owned by lighthouse-sdlc. Regenerate the lock with gh aw v0.93.2.
name: review
description: Assess review with OpenCode and retain a verified delivery record.
run-name: "review #${{ inputs.issue }} · request ${{ inputs.dispatch-request }}"
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
timeout-minutes: 15
env:
  LIGHTHOUSE_RECOVERY_ENABLED: ${{ vars.LIGHTHOUSE_RECOVERY_ENABLED }}
  LIGHTHOUSE_STAGE: review
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
      ref: ${{ needs.prepare.outputs.revision }}
      persist-credentials: false
  - name: Load the pinned harness package
    uses: actions/checkout@v5
    with:
      repository: juangcarmona/lighthouse
      ref: 806223d06302628d25791e42e35b609ca6e1d32c
      path: tools
      persist-credentials: false
  - name: Load the authorized issue context
    uses: actions/download-artifact@v8
    with:
      name: lighthouse-input-${{ inputs.issue }}-${{ github.run_attempt }}
      path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
post-steps:
  - name: Validate the Lighthouse result
    run: node tools/src/packages/sdlc/src/completion-actions.mjs validate
  - name: Preserve the result and runtime receipt
    if: always()
    uses: actions/upload-artifact@v7
    with:
      name: lighthouse-result-${{ inputs.issue }}-${{ github.run_attempt }}
      path: |
        ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/envelope.json
        ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/runtime.json
      if-no-files-found: error
      retention-days: 14
  - name: Preserve OpenCode diagnostic events
    if: always()
    uses: actions/upload-artifact@v7
    with:
      name: opencode-events-${{ inputs.issue }}-${{ github.run_attempt }}
      path: ${{ runner.temp }}/gh-aw/opencode-events-${{ github.run_id }}-${{ github.run_attempt }}.jsonl
      if-no-files-found: ignore
      retention-days: 14
jobs:
  prepare:
    outputs:
      eligible: ${{ steps.prepare.outputs.eligible }}
      revision: ${{ steps.prepare.outputs.revision }}
    name: Verify accepted commit, checks and evidence protection
    runs-on: ubuntu-24.04
    permissions:
      actions: read
      checks: read
      contents: read
      pull-requests: read
      issues: write
    env:
      LIGHTHOUSE_ISSUE: ${{ inputs.issue }}
    steps:
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: 806223d06302628d25791e42e35b609ca6e1d32c
          persist-credentials: false
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Collect verified owner intent and reserve the issue
        id: prepare
        env:
          GH_TOKEN: ${{ github.token }}
        run: node src/packages/sdlc/src/completion-actions.mjs prepare
      - name: Preserve the execution request
        if: steps.prepare.outputs.eligible == 'true'
        uses: actions/upload-artifact@v7
        with:
          name: lighthouse-input-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/
          if-no-files-found: error
          retention-days: 14
      - name: Release reservation if preparation failed
        if: failure()
        env:
          GH_TOKEN: ${{ github.token }}
        run: node src/packages/sdlc/src/completion-actions.mjs cleanup
  publish:
    concurrency:
      group: lighthouse-process-publication
      cancel-in-progress: false
    name: Validate, publish and release
    needs: [prepare, agent]
    if: always() && needs.prepare.result == 'success' && needs.prepare.outputs.eligible == 'true'
    runs-on: ubuntu-24.04
    permissions:
      actions: write
      checks: read
      contents: write
      pull-requests: write
      issues: write
    env:
      LIGHTHOUSE_ISSUE: ${{ inputs.issue }}
    steps:
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: 806223d06302628d25791e42e35b609ca6e1d32c
          persist-credentials: false
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Load the execution request
        uses: actions/download-artifact@v8
        with:
          name: lighthouse-input-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
      - name: Load the candidate result
        if: needs.agent.result == 'success'
        uses: actions/download-artifact@v8
        with:
          name: lighthouse-result-${{ inputs.issue }}-${{ github.run_attempt }}
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
        run: node src/packages/sdlc/src/completion-actions.mjs publish
      - name: Preserve merge and publication receipts
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: lighthouse-completion-${{ inputs.issue }}-${{ github.run_attempt }}
          path: |
            ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/integration-receipt.json
            ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/publication-receipt.json
          if-no-files-found: warn
          retention-days: 30
      - name: Release the issue reservation
        if: always()
        env:
          GH_TOKEN: ${{ github.token }}
        run: node src/packages/sdlc/src/completion-actions.mjs cleanup
---

# Review the accepted delivery

Follow `/harness/skills/review/SKILL.md` using `/input/context.json`. The host supplies the accepted PR revision, intent and policy fingerprints, changed paths and authenticated GitHub check results. Source under `/workspace` is read-only. Inspect affected guidance and acceptance evidence; a green check alone does not establish intended behavior. Distinguish missing verification from a failed check.

Explain each decision and finding in public progress messages. Write `/output/envelope.json` with the supplied identity. Return `blocked` for unresolved current-stage evidence or decisions. For review, include `output.retrospective` as concise Markdown: what went well, what went wrong, start doing, stop doing and improvement candidates with evidence and an owner. Do not infer recurrence from retries of a single issue. Separate actual source defects from process gaps; proposed guards need their own review and regression proof.

The publisher rechecks current authority, GitHub checks and reservation. Only an explicit owner dispatch with `merge: true` can authorize integration, and GitHub still enforces merge rules. A passed assessment never proves a merge occurred. Review records learning without changing permissions, opening issues or starting another stage. The host validates the envelope and records the gh-aw completion signal.
