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
      step-name: Execute OpenCode CLI
      write-timestamp: true
    log-parser: |
      function parseLog(logContent) {
        return require("./parse_opencode_log.cjs").parseOpenCodeLog(logContent);
      }
---
