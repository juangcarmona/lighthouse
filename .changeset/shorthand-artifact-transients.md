---
"@juangcarmona/lighthouse-sdlc": patch
---

# Retain bounded recovery for shorthand artifact failures

Retry confirmed shorthand GitHub 502/503/504 artifact-download failures within the existing three-attempt limit, while preserving terminal failures and evidence validation.
