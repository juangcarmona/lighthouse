---
"@juangcarmona/lighthouse-sdlc": patch
---

# Recover transient GitHub reads

Retry transient read-only GitHub responses at most twice within the original thirty-second request budget, respecting Retry-After. Mutations, permanent refusals and uncertain publication effects retain their existing handling.

Discover worker reports within the bot-owned issue history so unrelated repository activity cannot exhaust the report reconciliation bound.
