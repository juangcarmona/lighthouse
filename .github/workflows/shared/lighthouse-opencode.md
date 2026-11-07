---
engine:
  id: opencode
  runtime-id: opencode
  version: "2.1.0"
  display-name: OpenCode
  description: OpenCode in an operator-provisioned Docker sandbox
  behaviors:
    capabilities:
      tools-allowlist: true
    execution:
      command-name: node
      args: [.lighthouse-harness/src/packages/sdlc/src/opencode-execute.mjs]
      step-name: OpenCode progress and result
      write-timestamp: true
    log-parser: |
      function parseLog(logContent) {
        const fs = require("fs");
        const events = require("path").join(process.env.RUNNER_TEMP, "gh-aw", `opencode-events-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}.jsonl`);
        return require("./parse_opencode_log.cjs").parseOpenCodeLog(fs.existsSync(events) ? fs.readFileSync(events, "utf8") : logContent);
      }
post-steps:
  - name: Observe agent workflow telemetry
    if: always()
    continue-on-error: true
    env:
      GH_TOKEN: ${{ github.token }}
    run: node .lighthouse-harness/src/packages/sdlc/src/telemetry-workflow.mjs
  - name: Preserve agent telemetry
    if: always()
    continue-on-error: true
    uses: actions/upload-artifact@v7
    with:
      name: lighthouse-telemetry-agent-${{ github.run_attempt }}
      path: |
        ${{ runner.temp }}/gh-aw/telemetry/*.jsonl
        ${{ runner.temp }}/gh-aw/telemetry/????????-????-????-????-????????????.json
        ${{ runner.temp }}/gh-aw/telemetry/export-health.json
        ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/evidence/host/telemetry*
        ${{ runner.temp }}/lighthouse-${{ github.run_id }}-${{ github.run_attempt }}/evidence/host/native-events.jsonl
      if-no-files-found: ignore
      retention-days: 14
---
