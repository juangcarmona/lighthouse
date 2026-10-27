---
# Owned by lighthouse-sdlc. Regenerate the lock with gh aw v0.93.2.
name: Lighthouse SDLC propose
description: Produce a validated OpenSpec proposal PR from an owner-authorized ready issue.
run-name: "propose #${{ inputs.issue }} · request ${{ inputs.dispatch-request }}"
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
  LIGHTHOUSE_STAGE: propose
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
      ref: 57d4e23da2831be5fad0331f1ba82326782943cc
      path: tools
      persist-credentials: false
  - name: Load the authorized issue context
    uses: actions/download-artifact@v8
    with:
      name: lighthouse-input-${{ inputs.issue }}-${{ github.run_attempt }}
      path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
post-steps:
  - name: Validate the Lighthouse result
    run: node tools/src/packages/sdlc/src/issue-actions.mjs validate
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
      source_revision: ${{ steps.prepare.outputs.source_revision }}
    name: Authorize and reserve issue
    runs-on: ubuntu-24.04
    permissions:
      actions: read
      contents: read
      issues: write
      pull-requests: read
    env:
      LIGHTHOUSE_ISSUE: ${{ inputs.issue }}
    steps:
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: 57d4e23da2831be5fad0331f1ba82326782943cc
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
          name: lighthouse-input-${{ inputs.issue }}-${{ github.run_attempt }}
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
      contents: write
      issues: write
      pull-requests: write
    env:
      LIGHTHOUSE_ISSUE: ${{ inputs.issue }}
    steps:
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: 57d4e23da2831be5fad0331f1ba82326782943cc
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
        run: node src/packages/sdlc/src/issue-actions.mjs publish
      - name: Release the issue reservation
        if: always()
        env:
          GH_TOKEN: ${{ github.token }}
        run: node src/packages/sdlc/src/issue-actions.mjs cleanup
---

# Propose the authorized change

Execute only `propose` using the trusted context in `/input/context.json` and the packaged `/harness/skills/propose/SKILL.md`. For an initial proposal, the host supplies the authenticated passed refinement. When `context.proposalReview` is present, revise its existing files using the verified owner feedback and discussion; the request authorizes revision of that candidate, not acceptance or implementation. Inspect the current read-only source under `/workspace`, including product and architecture policy, relevant existing specifications and active changes.

Write brief public progress before source inspection and when you choose an approach or find a blocker. Explain the decision and supporting evidence. Keep tool payloads out of progress messages.

Follow `context.proposal.instructions` from the pinned OpenSpec provider, in order: proposal, specifications and design, then tasks. Return the actual Markdown files in `result.output.files`, each with `path` and `content`, under the authorized `context.proposal.root`. Include a concise proposal, design alternatives and trade-offs, testable specification scenarios, dependency-ordered unchecked tasks, validation and visual evidence plans where applicable. Every refined acceptance criterion needs a corresponding task or specification. Preserve existing product authority. Keep unresolved product decisions explicit rather than inventing approval.

Write `/output/envelope.json` using the supplied schema and identity. A complete proposal returns `passed` with gate `planned`; it is a candidate for owner review, not approved implementation. Return `blocked` with the precise missing decision when the proposal cannot be completed. The separate publisher checks the file boundary, runs OpenSpec strict validation and opens a proposal PR or updates the existing PR identified by `context.proposalReview`. The engine writes no repository files and has no GitHub credentials. End after the envelope; the trusted adapter records gh-aw completion.
