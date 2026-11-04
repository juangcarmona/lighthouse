# Worker report acceptance — #143

Reports preserve original incidents separately from current execution, human waits and recovered effects. Safe CI diagnostics reach publication evidence, issue/PR handoffs and job logs. Existing reports migrate on update; discovering a previously unconfirmed run adds no occurrence.

| Check | Native evidence | Result |
| --- | --- | --- |
| Report lifecycle | [Final run](https://github.com/juangcarmona/lighthouse/actions/runs/41842321756) | Three new failures, replay +0, exhaustion, active/human wait, recovery, recurrence and lost-update reconciliation |
| Lost create response | [Initial stop](https://github.com/juangcarmona/lighthouse/actions/runs/41840223306), [reconciliation](https://github.com/juangcarmona/lighthouse/actions/runs/41840717201) | Stops while creation is absent from the API listing; later confirmation reuses the issue without another POST |
| Existing recovery chains | [Read-only observation](https://github.com/juangcarmona/lighthouse/actions/runs/41842327133) | Authenticates #341, #359 and #362 without admitting workers or repeating effects |
| CI diagnostics | [Surfaces](https://github.com/juangcarmona/lighthouse/actions/runs/41842779645) | Real HTTP 403 from a read-only token; safe operation, candidate and execution retained on all four surfaces |

[Incident #168](https://github.com/juangcarmona/lighthouse/issues/168) was a correctly refused stale-source publication after #166 merged. Its underlying #155 delivery was completed; the incident is diagnosed and closed.

The fixture supplies controlled request roots, retry ordinals and human waits around real native job outcomes. This does not requalify automatic worker delivery or the real retry delay. Initial API-visibility and fixture PR-permission failures remain retained.

Installed harness `c10969724e4add835f7f7bf4bb5f5bb62908e6d3` matches the final qualified SDLC package tree. Native revision/tree metadata correct the lifecycle artifact's stale initial `source` label. Adopter-specific Product Change recovery is preserved.

Temporary controls were removed. #366 and its reports are archived with retired qualification markers, preventing contamination of future incident counts. Repository variables retain only `LIGHTHOUSE_AUTOMATION_ENABLED=true`; global maintenance, recovery and reporting remain unconfigured.

Validation: 608 repository tests passed, seven optional skips; 70 focused tests, Markdown, package installation/compiled drift, strict OpenSpec and workflow lint passed. Two unrelated #272 citation warnings remain.

[Original evidence archive](evidence.tar.gz): native snapshots, 11 digest-verified artifact archives, before/after report states, fixture sources and checks. Internal `SHA256SUMS` covers retained files.
