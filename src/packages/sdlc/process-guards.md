# Verified process guards

Use this route during review when a real delivery failure suggests a recurring check. Retain the original claim, actual outcome and evidence first. Distinguish the code defect from the process gap; a bug fix does not automatically justify another process control.

Choose one owning source and maintainer. Sharpen an existing check before adding a mechanism. Reproduce the original behavior with that check and retain its failing revision, actual nonzero exit and evidence. Run the same behavioral assertion on the corrected revision and retain its passing exit and evidence. An unrelated infrastructure failure is not the required failing case. If the evidence is unavailable or the guard is still a proposal, keep it in the existing retrospective/backlog with its owner; do not call it verified.

For newly admitted review work, return `output.processGuards` with `schemaVersion: 1`, `outcome`, `reason` and `records`. Use `outcome: no-guard` with an empty array and a reason when existing controls suffice or no additional recurring control is justified. `outcome: recorded` requires at least one verified record with these fields:

| Field | Required content |
| --- | --- |
| `id`, `version` | Stable lowercase guard ID and semantic record version |
| `failure` | `claim`, `outcome`, `codeDefect`, `processGap` and nonempty `evidence` references |
| `owner`, `source` | Responsible maintainer and one canonical owning source |
| `check` | Owning `command`; `red` and `green` each with the actual full Git `revision`, `exitCode` and nonempty `evidence` references |
| `adoption` | Adopted `version`, affected `scope`, `rollback`, `retireWhen` and owned `followUp` |
| `observations` | `recurrence`, `falsePositives` and `maintenanceCost`, each with observed evidence or an explicit unavailable reason |

The host validates the record's shape and failing/passing dispositions. The review must authenticate the cited evidence; a record's assertions do not prove their own source. The durable stage result and its existing issue/PR review preserve the finding. Tests prove their exercised cases; they do not establish operational recurrence rates or pilot costs. The parent pilot retains those observations and their coverage gaps.

Change a provider-owned guard through its provider and verify generated drift; change project-owned checks in an ordinary reviewed candidate. A policy change follows its owning Product Change and approval process. This review cannot change its permissions, scope or acceptance criteria. Retain adopted version, rollback and retirement conditions with the follow-up owner, and reassess false positives and maintenance cost before expanding a guard. No general learning service or automatic policy mutation is introduced.
