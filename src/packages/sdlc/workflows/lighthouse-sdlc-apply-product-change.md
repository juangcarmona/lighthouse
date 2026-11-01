---
# Owned by lighthouse-sdlc. Regenerate the lock with gh aw v0.93.2.
name: apply-product-change
description: Recheck an explicit owner decision, apply the provider delta without GitHub credentials, and publish its verified result.
run-name: "apply product change #${{ inputs.issue }} · PR #${{ inputs.pull-request }}"
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
        description: Linked issue
        required: true
        type: string
      dispatch-request:
        description: Authenticated router receipt comment ID
        required: true
        type: string
      pull-request:
        description: Product Change PR
        required: true
        type: string
      head:
        description: Approved full PR head SHA
        required: true
        type: string
  needs: [prepare]
if: needs.prepare.outputs.eligible == 'true'
runs-on: [self-hosted, linux, lighthouse-workflow]
runs-on-slim: ubuntu-24.04
timeout-minutes: 30
env:
  LIGHTHOUSE_STAGE: propose
  LIGHTHOUSE_WORKER: apply-product-change
  LIGHTHOUSE_DISPATCH_REQUIRED: "true"
  LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: "true"
permissions:
  contents: read
strict: false
tools:
  bash: [cat, git, node, npm, npx]
safe-outputs:
  create-issue: false
  report-failure-as-issue: false
  report-incomplete: false
  threat-detection: false
  noop:
    report-as-issue: false
network:
  allowed: []
jobs:
  prepare:
    outputs:
      eligible: ${{ steps.prepare.outputs.eligible }}
      head: ${{ steps.prepare.outputs.head }}
    name: Recheck product approval
    runs-on: ubuntu-24.04
    permissions:
      actions: read
      contents: read
      issues: write
      pull-requests: read
    env:
      LIGHTHOUSE_ISSUE: ${{ inputs.issue }}
      LIGHTHOUSE_WORKER: apply-product-change
      LIGHTHOUSE_STAGE: propose
      LIGHTHOUSE_DISPATCH_REQUIRED: "true"
      LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: "true"
    steps:
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: __LIGHTHOUSE_REF__
          persist-credentials: false
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Recheck the explicit current owner decision
        id: prepare
        env:
          GH_TOKEN: ${{ github.token }}
        run: node src/packages/sdlc/src/issue-actions.mjs product-apply-prepare
      - name: Preserve the approval checkpoint
        if: steps.prepare.outputs.eligible == 'true'
        uses: actions/upload-artifact@v7
        with:
          name: lighthouse-product-apply-input-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/product-apply.json
          if-no-files-found: error
          retention-days: 14
  apply:
    name: Apply with the pinned ProductShape provider
    needs: [prepare]
    if: needs.prepare.outputs.eligible == 'true'
    runs-on: ubuntu-24.04
    permissions: {}
    steps:
      - uses: actions/checkout@v5
        with:
          persist-credentials: false
          ref: ${{ needs.prepare.outputs.head }}
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: __LIGHTHOUSE_REF__
          path: .lighthouse-harness
          persist-credentials: false
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Install provider packages without credentials
        working-directory: .lighthouse-harness
        run: |
          npm ci --ignore-scripts
          npm install --no-save --package-lock=false --ignore-scripts @prodshape/integration-openspec@0.6.6
      - name: Load the approval checkpoint
        uses: actions/download-artifact@v8
        with:
          name: lighthouse-product-apply-input-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
      - name: Run provider dry-run, apply and validation
        run: node .lighthouse-harness/src/packages/sdlc/src/issue-actions.mjs product-apply
      - name: Preserve the provider output and apply receipt
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: lighthouse-product-apply-result-${{ inputs.issue }}-${{ github.run_attempt }}
          path: |
            ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/apply-result.json
            ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/affected-citations.json
          if-no-files-found: error
          retention-days: 30
      - name: Preserve the bounded apply proof
        uses: actions/upload-artifact@v7
        with:
          name: lighthouse-product-apply-proof-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/apply-proof.json
          if-no-files-found: error
          retention-days: 30
  publish:
    name: Recheck and publish provider output
    needs: [prepare, apply]
    if: always() && needs.prepare.outputs.eligible == 'true'
    runs-on: ubuntu-24.04
    permissions:
      actions: write
      contents: write
      issues: write
      pull-requests: write
    env:
      LIGHTHOUSE_ISSUE: ${{ inputs.issue }}
      LIGHTHOUSE_WORKER: apply-product-change
      LIGHTHOUSE_STAGE: propose
      LIGHTHOUSE_DISPATCH_REQUIRED: "true"
      LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: "true"
    steps:
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: __LIGHTHOUSE_REF__
          persist-credentials: false
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Load the approved checkpoint
        uses: actions/download-artifact@v8
        with:
          name: lighthouse-product-apply-input-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
      - name: Load provider output
        if: needs.apply.result == 'success'
        uses: actions/download-artifact@v8
        with:
          name: lighthouse-product-apply-result-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
      - name: Load the bounded apply proof
        if: needs.apply.result == 'success'
        uses: actions/download-artifact@v8
        with:
          name: lighthouse-product-apply-proof-${{ inputs.issue }}-${{ github.run_attempt }}
          path: ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}
      - name: Stop when the provider apply did not complete
        if: needs.apply.result != 'success'
        run: exit 1
      - name: Publish only the verified applied delta
        env:
          GH_TOKEN: ${{ github.token }}
        run: node src/packages/sdlc/src/issue-actions.mjs product-apply-publish
  finalize:
    name: Report an interrupted product apply
    needs: [prepare, apply, publish]
    if: always()
    runs-on: ubuntu-24.04
    permissions:
      actions: read
      contents: read
      issues: write
      pull-requests: write
    env:
      LIGHTHOUSE_ISSUE: ${{ inputs.issue }}
      LIGHTHOUSE_PREPARE_RESULT: ${{ needs.prepare.result }}
      LIGHTHOUSE_APPLY_RESULT: ${{ needs.apply.result }}
      LIGHTHOUSE_PUBLISH_RESULT: ${{ needs.publish.result }}
    steps:
      - uses: actions/checkout@v5
        with:
          repository: juangcarmona/lighthouse
          ref: __LIGHTHOUSE_REF__
          persist-credentials: false
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - name: Publish the authenticated outcome
        env:
          GH_TOKEN: ${{ github.token }}
        run: node src/packages/sdlc/src/issue-actions.mjs product-apply-cleanup
---

# Apply an approved Product Change

This workflow has no agent job. Its prepare job authenticates and rechecks the explicit product decision. The apply job has no GitHub token and performs only the pinned ProductShape dry-run, apply and resulting-model validation. The publisher rechecks the same PR head and decision before writing the provider-generated model delta to the issue branch. A failed or uncertain apply needs owner recovery; it is never retried automatically.
