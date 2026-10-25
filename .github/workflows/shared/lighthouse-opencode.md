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
      args: [tools/src/packages/sdlc/src/opencode-execute.mjs]
      step-name: OpenCode progress and result
      write-timestamp: true
    log-parser: |
      function parseLog(logContent) {
        const fs = require("fs");
        const events = require("path").join(process.env.RUNNER_TEMP, "gh-aw", `opencode-events-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}.jsonl`);
        return require("./parse_opencode_log.cjs").parseOpenCodeLog(fs.existsSync(events) ? fs.readFileSync(events, "utf8") : logContent);
      }
---
