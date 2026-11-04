# Owned execution cleanup

Qualification for [#219](https://github.com/juangcarmona/lighthouse/issues/219). [Retained receipts](evidence.tar.gz) contain the disposable Docker fault matrix and exact local image identity; no provider credentials or production resources were used.

| Host case | Observed cleanup |
| --- | --- |
| Success, agent failure, timeout and cancellation | Owned resources absent |
| Successful response without removal | Failed; resources still visible |
| Lost create or remove acknowledgement | Reconciled from authenticated resource inventory |
| Runtime outage | Unknown; no successful cleanup claim |
| Abrupt process kill, then fresh reconciliation | Owned container discovered and removed |

The matrix preserves an unrelated live container/network and a shared named volume with unchanged sentinel content. Repeated reconciliation is idempotent. Deterministic tests additionally cover active attempts, missing journals, changed ownership, incomplete inventory and an unobserved pending create. Timeout and cancellation use an actual timer and abort signal against running containers and retain the resulting process exits; adapter regressions separately exercise worker cancellation and failed execution. This does not claim a physical host reboot or model acceptance.

Repository verification passed: 660 checks, nine optional skips. The real Docker matrix passed separately. Containerized operators must persist `<lock path>.resources` before adopting the updated adapter; workflow pins and native rollout remain distinct from these local proofs.

The [native rollout probe](https://github.com/juangcarmona/lighthouse/actions/runs/41911290800) retained passed engine execution, clean termination of nine owned resources and a separately observed empty Docker inventory. Its publisher rejected a moved source revision after #386 merged; the workflow failed and published no stale stage result. The archive keeps these outcomes separate.
