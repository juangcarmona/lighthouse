---
# Owned by lighthouse-sdlc. Regenerate the lock with gh aw v0.93.2.
name: product-change
description: Prepare and publish an authenticated Product Change candidate for an authorized issue idea.
run-name: "product change #${{ inputs.issue }} · request ${{ inputs.dispatch-request }}"
concurrency:
  group: lighthouse-issue-${{ inputs.issue }}
  cancel-in-progress: false
  queue: max
  job-discriminator: ${{ github.run_id }}
on:
  roles: all
  workflow_dispatch:
    inputs:
      issue:
        description: Source issue containing the product idea
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
timeout-minutes: 30
env:
  LIGHTHOUSE_STAGE: propose
  LIGHTHOUSE_WORKER: product-change
  LIGHTHOUSE_DISPATCH_REQUIRED: "true"
  LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: "true"
permissions:
  contents: read
engine:
  id: opencode
  command: node
imports:
  - shared/lighthouse-opencode.md
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
      ref: __LIGHTHOUSE_REF__
      path: .lighthouse-harness
      persist-credentials: false
  - name: Load the authorized product request
    uses: actions/download-artifact@v8
    with:
      name: lighthouse-input-${{ inputs.issue }}-${{ github.run_attempt }}
      path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
  - name: Load ProductShape inspection evidence
    uses: actions/download-artifact@v8
    with:
      name: lighthouse-product-evidence-${{ inputs.issue }}-${{ github.run_attempt }}
      path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/product-evidence
post-steps:
  - name: Validate the Lighthouse result
    run: node .lighthouse-harness/src/packages/sdlc/src/issue-actions.mjs validate
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
jobs:
  prepare:
    outputs:
      eligible: ${{ steps.prepare.outputs.eligible }}
      source_revision: ${{ steps.prepare.outputs.source_revision }}
    name: Authenticate and checkpoint the idea
    runs-on: ubuntu-24.04
    permissions:
      actions: read
      contents: read
      issues: write
      pull-requests: read
    env:
      LIGHTHOUSE_ISSUE: ${{ inputs.issue }}
      LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: "true"
    steps:
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: __LIGHTHOUSE_REF__
          persist-credentials: false
      - name: Check out the adopter's current product source
        uses: actions/checkout@v5
        with:
          ref: ${{ github.event.repository.default_branch }}
          path: .lighthouse-product-source
          persist-credentials: false
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Install provider integration when the adopter configured it
        run: |
          npm ci --ignore-scripts
          npm install --no-save --package-lock=false --ignore-scripts @prodshape/integration-openspec@0.6.6
      - name: Collect verified intent and reserve the issue
        id: prepare
        env:
          GH_TOKEN: ${{ github.token }}
        working-directory: .lighthouse-product-source
        run: node "$GITHUB_WORKSPACE/src/packages/sdlc/src/issue-actions.mjs" prepare
      - name: Preserve the execution request
        if: steps.prepare.outputs.eligible == 'true'
        uses: actions/upload-artifact@v7
        with:
          name: lighthouse-input-${{ inputs.issue }}-${{ github.run_attempt }}
          path: |
            ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/admission.json
            ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/request.json
            ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/issue.json
            ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/context.json
            ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/reserved
          if-no-files-found: error
          retention-days: 14
      - name: Preserve ProductShape inspection evidence
        if: steps.prepare.outputs.eligible == 'true'
        uses: actions/upload-artifact@v7
        with:
          name: lighthouse-product-evidence-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/product-evidence/
          if-no-files-found: error
          retention-days: 14
      - name: Release reservation if preparation failed
        if: failure()
        env:
          GH_TOKEN: ${{ github.token }}
          LIGHTHOUSE_PREPARE_FAILED: "true"
        run: node src/packages/sdlc/src/issue-actions.mjs cleanup
  publish:
    name: Validate and publish the product candidate
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
          persist-credentials: false
          ref: ${{ needs.prepare.outputs.source_revision }}
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: __LIGHTHOUSE_REF__
          path: .lighthouse-harness
          persist-credentials: false
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Install the repository and optional product provider
        working-directory: .lighthouse-harness
        run: |
          npm ci --ignore-scripts
          npm install --no-save --package-lock=false --ignore-scripts @prodshape/integration-openspec@0.6.6
      - name: Load the request and candidate
        uses: actions/download-artifact@v8
        with:
          name: lighthouse-input-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
      - name: Load the product result
        if: needs.agent.result == 'success'
        uses: actions/download-artifact@v8
        with:
          name: lighthouse-result-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
      - name: Require a completed worker
        if: needs.agent.result != 'success'
        run: exit 1
      - name: Recheck authority and publish the candidate
        if: needs.agent.result == 'success'
        env:
          GH_TOKEN: ${{ github.token }}
        run: node .lighthouse-harness/src/packages/sdlc/src/issue-actions.mjs publish
      - name: Release the execution reservation
        if: always()
        env:
          GH_TOKEN: ${{ github.token }}
          LIGHTHOUSE_AGENT_RESULT: ${{ needs.agent.result }}
          LIGHTHOUSE_PUBLISH_STATUS: ${{ job.status }}
        run: node .lighthouse-harness/src/packages/sdlc/src/issue-actions.mjs cleanup
---

# Prepare a product change from an idea

Read the authenticated context and follow `/harness/skills/product-change/SKILL.md`. Use the installed ProductShape schema instructions included in `context.productChange`. The issue title and body define the idea and the host's `context.productChange.parent` defines the scope and authorization. Compare it with the accepted product model, then return one of `aligned`, `candidate` or `blocked` in `result.output.productChange`.

For a candidate, return the complete provider-owned change files under `context.productChange.root`, the host-assigned `changeName`, CHG ID, baseline digest and pending provider validation. Copy `context.productChange.schemaPin` into `.openspec.yaml` and omit the proposal digest; the host calculates it after validation. Keep the manifest in draft status. Do not approve, apply, alter the accepted model, publish a branch or continue implementation. The trusted publisher rechecks the exact candidate, validates it against the current accepted model, publishes the PR and requests an explicit product decision. Product approval, apply, implementation, merge and release are separate effects.

Return the supplied stage result identity and keep the enclosing lifecycle stage as `propose`. A product idea does not grant implementation authority. The host owns all GitHub effects and releases execution resources when the decision request is durable.
