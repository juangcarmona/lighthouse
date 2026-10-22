# Lighthouse PWA capability

Use this capability when a React web application has a real installability or offline requirement.

## Start here

| Need | Read |
| --- | --- |
| Public installable web app | [adoption](adoption.md) → [guardrails](guardrails.md) |
| Authenticated PWA | [adoption](adoption.md) → [offline policy](offline.md) |
| Diagnose an update problem | [guardrails](guardrails.md) → [testing](testing.md) |

## Defaults

Declare the manifest, icons, service worker, asset cache, update strategy and offline behavior as part of the product surface.

Cache assets separately from navigation and private data. Do not cache private APIs automatically and do not store tokens in browser storage.

An authenticated PWA keeps the `web-bff` session boundary; installability does not change authentication ownership.
