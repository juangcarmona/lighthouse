# Repository delivery and factory integration

The implementation sequence below closes the gap between installing Lighthouse and delivering a real change through an external execution host. The ownership map is in [architecture section 03](../architecture/03-context-and-scope/README.md#delivery-authorities); the accepted host boundary is [ADR-0007](../architecture/09-architecture-decisions/0007-host-execution-boundary.md). This plan does not replace product intent or claim runtime completion.

## Evidence at reconciliation

Inspected baseline: commit `434dfab`, Lighthouse `0.9.0`, SDLC `0.8.0`, 2026-10-24. Local work on other branches is not part of this baseline. The package is implemented; execution of its complete workflow in a clean consumer remains unproved here.

| Gap | Evidence | Required outcome |
| --- | --- | --- |
| LH-01: consumer workflow resolution | Router and shared worker invoke `src/packages/sdlc/src/sdlc.mjs`; workers name source-tree skill paths. Those paths belong to this repository. | Resolve executable, descriptors and skills from the exact installed SDLC package; prove execution in a consumer without a Lighthouse source tree. |
| LH-02: completion and authorization | The shared post-step validates shape and stage/gate, but not successful status, empty blocking arrays, requested run identity or human decisions. Router `ff` advances on GitHub job success. | An explicit deterministic continuation decision checks all required evidence and authority. A valid blocked result never starts another stage. |
| LH-03: automatic intake | The router supports `workflow_dispatch` only. | Add narrowly authorized issue/comment events, deterministic classification, deduplication and bounded clarification before claiming automatic triage. |
| LH-04: host handoff | Shared workflow selects Copilot; no host admission call exists. | Deliver a versioned execution request and an opt-in external-host projection without changing lifecycle semantics. |
| LH-05: outward effects | Current safe outputs allow only `noop`; prompts and uploaded JSON do not publish a refined story or a PR. | Stage-specific proposed effects are validated and applied by a trusted publisher with explicit authority and idempotency. |
| LH-06: delivery state ownership | Labels, stage-result artifacts and workflow events are separate surfaces; no durable host integration binds them. | Publish correlated events and evidence; derive labels from accepted transitions and reread provider state before each write. |

These are engineering gaps, not new lifecycle stages. Preserve `integrate.gate = done` and `review.gate = null` from the installed descriptors. The former reuses the existing gate; neither authorizes a merge.

## Dependency order and proof

| Slice | Work | Exit evidence |
| --- | --- | --- |
| L1 | Repair package resolution and strict completion/continuation checks. | Packed-consumer fixture executes router preflight and result validation; blocked, failed, pending review, wrong run, missing predecessor and wrong revision cannot continue. |
| L2 | Publish the external-host request and effect contract plus a consumer adapter fixture. | Compatible package/contract versions are checked; invalid scope, unsupported schema and replayed requests are refused. A fake host proves transport only. |
| L3 | Add issue intake and deterministic effect publication for triage/refine. | A real issue produces a triage result and a refined story, or a precise question followed by one authorized resume. Duplicate events create no duplicate work. |
| L4 | Exercise propose/implement/integrate/review with the same boundary. | One real change reaches a PR, required checks and explicit integration approval; evidence identifies the final commit. |
| L5 | Expand accepted autonomy for a measured low-risk class. | Independent review, bounded correction, revocation and failed-run handling are demonstrated before unattended selection is enabled. |

L1 precedes L2. L3 needs L2 and an operational host; L4 needs L3 and that host's recovery proof. Generic planning fixtures may run earlier, but are not end-to-end acceptance. Release a compatible package before upgrading the pilot; record exact installed versions and ownership hashes. Change source workflows, compile with their owning tool and check projection drift; never repair generated locks in a consumer.

## First-consumer readiness

The operator selected a personal frontend repository whose published pilot preparation now records committed Lighthouse CLI `0.9.1` and SDLC `0.9.0`. Authorities, labels and evidence integration remain explicit adoption gaps; real supervised triage/refine is recorded in the host pilot evidence. The concrete repository inventory and pilot scenario belong to the factory's [pilot plan](https://github.com/juangcarmona/sofa/blob/main/docs/roadmap/first-pilot.md), where operator-specific details can evolve independently of this reusable baseline.

Before the next capability rollout, preserve the consumer's current work, recheck its verification command and authority requirements or exceptions, adopt label changes through the plan/apply route and verify its runner and host compatibility. A green `lighthouse verify` confirms configured guardrails; it does not establish runtime, event delivery or product acceptance.

## Acceptance of this design

The architecture accepted by the maintainer on 2026-10-24 keeps the existing product baseline intact. Implementation should turn each gap into a bounded work item. Any change to product scope, human decision substitution or supported engines goes through the owning product process. A package fixture, an installed runner and a successful model response are three different proofs; none alone proves delivery.

## Authorized entry and autonomy revision

The maintainer accepted the two-entry direction on 2026-10-24; [ADR-0008](../architecture/09-architecture-decisions/0008-separate-entry-and-autonomy.md) records it. [CHG-AUTHORIZED-WORKFLOW-ENTRY-001](../product/changes/active/chg-authorized-workflow-entry-001/change.md) proposes the product correction. This revision replaces mandatory triage as the entry for every actor and repeated human stops as the only progression model. It preserves required evidence and separately authorized integration.

The current host contract remains schema 1, supervised, triage/refine only, with comment publication. Its `refine` request requires an approved triage predecessor. The declared unattended route still contains supervised human gates. Those are migration gaps, not the intended two-entry behavior.

[OpenSpec delivery change](../../openspec/changes/authorized-workflow-entry/proposal.md) owns the implementation design, scenario matrix and ordered tasks for [#70](https://github.com/juangcarmona/lighthouse/issues/70). Product semantics remain in ProductShape. The first executable slice must prove direct authorized refinement through the shared decision contract and trusted host; it must not add another independently maintained command router. Later slices add requester intake and continuation, implementation with real OpenSpec artifacts and bounded PR correction, then separately authorized integration. Installation, fixture validation and live acceptance remain distinct evidence.
