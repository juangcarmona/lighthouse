---
"@juangcarmona/lighthouse-sdlc": patch
---

Preserve the original worker failure when workspace retention or resource cleanup also fails. Keep cleanup failures visible in runtime receipts and diagnostics, retain unsafe workspaces for reconciliation, and continue to fail attempts whose only failure is cleanup.
