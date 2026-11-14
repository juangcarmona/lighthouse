# Execution resource ownership and retention

The OpenCode adapter cleans each admitted attempt, not each issue. Its host engine slot serializes admission; its ownership journal binds the repository, run, workflow attempt and Linux process identity. Cleanup must prove absence, and an error remains visible in `runtime.json`. Historical resources without that proof are not cleanup targets.

## Resource boundary

| Resource | Owner and disposal boundary | Retained or excluded state |
| --- | --- | --- |
| `RUNNER_TEMP/lighthouse-engine-<owner digest>` | Adapter allocation, recorded before worker access with parent and root device/inode identity; removed only after runtime absence and successful local retention | A replaced root, unknown owner, incomplete allocation or failed collection is preserved and blocks admission |
| Snapshot `source`, validation `candidate`, workspace `node_modules` and `.cache` | Children of that exact disposable workspace; disposed with the workspace | The original checkout, manual checkouts, modified source outside the snapshot and other runs are never inferred owned |
| Container `/tmp`, npm command scratch and private cache tmpfs | Existing command/container lifecycle; unchanged by this correction | Inherited host caches, provider paths, NuGet state and caller-selected paths outside the workspace are not swept |
| Containers, anonymous volumes and private networks | Existing durable Docker ownership and inventory checks; container removal includes anonymous volumes | Named authentication/data volumes and foreign resources remain preserved; no host-wide prune |
| Child processes | Existing command process-group cleanup, container init and runner Tini | No process-name matching or host-wide process termination |
| Recovery baseline | Adapter-private, digest-bound copy of bounded original source, tracked paths and admitted policy | Never mounted writable into the worker; used only to retain diagnostic changes, not authorize publication |
| Local recovery bundles | `resources/retained/<owner digest>` beside ownership journals; candidate changes, bounded worker evidence and an ownership receipt | At most 32 bundles and 512 MiB of content; reaching either limit blocks admission rather than evicting source |
| Delivery outputs and event logs | Caller-owned `RUNNER_TEMP/lighthouse-<workflow>-<attempt>` and `gh-aw` outputs remain available to publication/artifact collection | Remote artifact lifetime does not delete local files; operators must explicitly archive and release local delivery outputs with their matching recovery bundle |
| Provider-owned state and historical unowned resources | Outside adapter disposal authority | Separate provider maintenance or migration; never inspect authentication data to decide disposability |

## Recovery and local retention

After taking the host slot, a new adapter first runs the existing stopped-owner Docker recovery. It then recovers journaled workspaces only when the original process is confirmed stopped and that owner's runtime receipt is clean. Active or unknown process identities stop admission. Journals from older releases without a workspace record remain Docker-only; directory names do not retroactively establish ownership.

Before disposal, the adapter collects candidate edits through its existing bounded source and scope validation and collects worker evidence under the existing 200-file/64-MiB limit. It seals and synchronizes the recovery bundle before recording retention, then removes the workspace and checks absence. A failed or unsafe collection leaves the workspace intact. An interrupted removal can retry from the sealed bundle without requiring the partially removed source tree to be readable. A changed retained bundle blocks removal.

Local retention has no automatic age-based eviction. The 32-bundle/512-MiB admission limit is deliberately conservative: preserving recoverable source is more important than admitting another attempt. An operator must first reconcile publication and candidate recovery, archive needed local diagnostics, and explicitly release only the matching stopped attempt's bundle and delivery outputs. Do not release a bundle still referenced by an incomplete workspace cleanup. Do not infer local deletion authority from a successful remote artifact upload. Unknown or unsafe state requires reconciliation, not additional allocation.

## Verification and adoption

The admitted unit and adapter tests cover normal/failure/cancellation paths, stopped and unknown owners, substituted paths, failed collection, interrupted removal and retention limits. Real-process filesystem tests retain five before/during/after byte and inode observations with test-owned dependencies and caches. Complete adapter repetitions use a Docker shim and remain source-level evidence, not native execution qualification.

After review and CI, publish the SDLC patch and adopt its released package or immutable source harness through the existing workflow installation route. This host-side change needs no new runner image; preserve the previously adopted Tini image. Confirm installed adoption separately, then qualify repeated complete native implementation workers on an appropriate operator host, retaining byte/inode/resource inventories and evidence-retention outcomes. Real-Docker scenarios require the existing test image and idle-host conditions; do not run global recovery against unrelated active work. Rollback must preserve the ownership journals and recovery bundles for reconciliation.
