---
"@juangcarmona/lighthouse-sdlc": patch
---

# Bound transient artifact download retries

Retry confirmed HTTP 502, 503 and 504 failures of the selected immutable artifact GET at most three times, preserving command limits, terminal errors and archive validation. Delivery effects are not retried.
