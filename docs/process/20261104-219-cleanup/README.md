# Owned execution cleanup

Qualification for [#219](https://github.com/juangcarmona/lighthouse/issues/219). The [readable summary](cleanup-summary.json) binds tested source hashes and observed outcomes to the [original receipts](evidence.tar.gz). The disposable Docker matrix uses no provider credentials or production resources.

| Host case | Observed cleanup |
| --- | --- |
| Success, agent failure, timeout and cancellation | Owned resources absent |
| Successful response without removal | Failed; resources still visible |
| Lost create or remove acknowledgement | Reconciled from authenticated resource inventory |
| Runtime outage | Unknown; no successful cleanup claim |
| Foreign container/network substituted at an owned name | Deletion refused; foreign IDs preserved |
| Phase deletion no-op or lost response | Further allocation blocked, or absence reconciled without repeating deletion |
| Abrupt process kill, then fresh reconciliation | Owned container discovered and removed |

The matrix preserves an unrelated live container/network and a shared named volume with unchanged sentinel content. Repeated reconciliation is idempotent. Deterministic tests additionally cover active attempts, missing journals, changed ownership, incomplete inventory and an unobserved pending create. Timeout and cancellation use an actual timer and abort signal against running containers and retain the resulting process exits; adapter regressions separately exercise worker cancellation and failed execution. This does not claim a physical host reboot or model acceptance.

Repository verification and the separate thirteen-case Docker matrix pass. Containerized operators must persist `<lock path>.resources` before adopting the adapter. Every native phase removal now checks ownership, uses immutable IDs and independently verifies absence; unrelated container churn is excluded from scoped observations.

Earlier native probes retained clean execution-resource termination; one [rejected a moved source](https://github.com/juangcarmona/lighthouse/actions/runs/41911290800), and the [next identified a phase-removal ownership gap](https://github.com/juangcarmona/lighthouse/actions/runs/41915997334). The archive preserves both outcomes. Acceptance of the corrected native rollout remains pending its updated workflow pin.
