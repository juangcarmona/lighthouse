<!-- pdac-scope: cited -->

# Persist and selectively recall scoped agent learnings across runs

## Why

Issue #272 requests reuse of one useful project learning between isolated executions without retaining transcripts or promoting memory to accepted product truth. The verified owner reply resolves the earlier retention-policy question within the same issue-272-product-change lifecycle.

## Requested Product Intent

An explicitly operator-approved project policy may authorize automatic retention of eligible, non-sensitive project findings without approval of each learning. Authorized runs in that project can selectively recall relevant findings with their provenance; other projects cannot obtain those project records. Records remain reviewable, correctable and invalidatable, and disabled or unavailable optional memory does not prevent ordinary work.

The accepted definition already provides typed run, project and optional shared memory, but does not define this automatic-retention policy, selective durable recall, correction or invalidation. Its memory-rule exception incorrectly couples disabling shared memory to loss of all cross-run recall. This is a product-semantic delta, not merely implementation of an already-complete obligation.

## Impacted Product Areas

- BR-MEMORY-BOUNDARY: modify retention authorization, eligibility, selective access and disabled-memory policy; distinguish project cross-run recall from shared cross-project recall.
<!-- pdac:cite id="BR-MEMORY-BOUNDARY" digest="sha256:0d7131052668df1c8212a67d4daf5fb6167e30611f5dcbf3c92a4e9df6ddcf0f" -->
- FR-AGENT-MEMORY: modify the existing provider-neutral obligation to include durable project reuse, provenance binding, correction/invalidation and bounded recall acceptance.
<!-- pdac:cite id="FR-AGENT-MEMORY" digest="sha256:f5e1ab48267f899e412c90a39cbca5b1e67986c10b5c8faf46b51f1034354b7e" -->
- TERM-AGENT-MEMORY: depends on the existing typed scoped record definition; unchanged because reviewed policy-eligible findings remain context, not authority.
<!-- pdac:cite id="TERM-AGENT-MEMORY" digest="sha256:5da14158ed73f214d7c4aee585845738ea707631a0a6d65ebd96f92e4fbd8349" -->
- QR-AGENT-ISOLATION: depends on existing visibility enforcement; unchanged because authorized project visibility does not grant access to private run memory.
<!-- pdac:cite id="QR-AGENT-ISOLATION" digest="sha256:731985a0bf28b2715a594b54342c254017eabe0e41fc14e3d12144b82240208b" -->

## Neighbours Checked and Left Out

- UC-RUN-AGENT: its existing fresh-context launch and scope-allowed record step remain valid; no new stage or launch authority is needed.
- UC-CONTINUE-AGENT-RUN: scope-visible loading and failure only for required unavailable memory remain valid; recall is not workflow state or permission to continue.
- FR-AGENT-CONTROL-PLANE and UC-CONFIGURE-AGENT-CONTROL-PLANE: already declare project memory policy, provider boundaries and optional shared capabilities; no new configuration product surface is needed.
- BC-FOUNDATION: provider-neutral memory contracts remain within its responsibility; operating the persistent provider remains outside Lighthouse runtime ownership.
- TERM-AGENT-RUN, TERM-AUTHORITY-MAP and TERM-GUARDRAIL: identities, authority mapping and owned checks retain their meanings.
- BR-HUMAN-AUTHORITY and BR-AUTHORITY-BOUNDARIES: explicit bounded delegation is already allowed and upstream authority is preserved; memory retention does not delegate product approval.
- TERM-AGENT-MEMORY and QR-AGENT-ISOLATION: checked dependencies described above; neither needs a proposed artifact.

## Clarification Report

Proportional pass grounded in the supplied baseline graph, performed for intent and reconsidered immediately before this first delta. Graph edges identify review candidates, not authorization to change them. Priority reflects retention authority first, then isolation and continuity.

| Priority | Changed node | Neighbour candidate | Relationship | Impact polarity | Classification and mechanical reason |
| --- | --- | --- | --- | --- | --- |
| 1 | BR-MEMORY-BOUNDARY | FR-AGENT-MEMORY | incoming derived-from | dependency | Affected: the derived obligation must express the new policy and recall guarantees. |
| 1 | FR-AGENT-MEMORY | BR-MEMORY-BOUNDARY | outgoing derived-from | dependency | Affected: authorization and the shared-disabled exception must agree with project recall. |
| 2 | BR-MEMORY-BOUNDARY | UC-RUN-AGENT, UC-CONTINUE-AGENT-RUN | applies-to and incoming governed-by | governance/dependency | Checked and unaffected: current scope-bounded record/load steps inherit the refined rule without new lifecycle authority. |
| 2 | FR-AGENT-MEMORY | UC-RUN-AGENT, UC-CONTINUE-AGENT-RUN | derived-from | dependency | Checked and unaffected: durable project recall fits existing bounded execution and required-memory failures. |
| 2 | BR-MEMORY-BOUNDARY | FR-AGENT-CONTROL-PLANE, UC-CONFIGURE-AGENT-CONTROL-PLANE | incoming derived-from / governed-by | dependency | Checked and unaffected: already expose project policy and provider limits without owning provider data. |
| 3 | BR-MEMORY-BOUNDARY | BC-FOUNDATION | applies-to | governance | Checked and unaffected: a provider-neutral contract does not create hosted runtime ownership. |
| 3 | Both modified nodes | TERM-AGENT-MEMORY, TERM-AGENT-RUN, TERM-AUTHORITY-MAP | uses-terms | semantic dependency | Checked and unaffected: typed context, bounded identities and authority meanings are unchanged. |
| 3 | BR-MEMORY-BOUNDARY | TERM-GUARDRAIL | uses-terms | semantic dependency | Checked and unaffected: scope enforcement remains an owned check. |

The transitive isolation neighbour QR-AGENT-ISOLATION applies to the same run/control-plane use cases: checked and unaffected because project reuse must preserve private run isolation. The wider graph reaches entry authority, product handoff and human authority through continuation; those contracts remain unchanged. No uncertain candidate remains within authorized scope. Actors, journeys, other domain categories, profiles, distribution, tracker state and lifecycle gates gain no changed outcome from this bounded memory refinement, so no artifacts are added there.

## Refinement pass

Resumed the exact host-assigned change name. No existing change directory is mounted; the authenticated continuation supplies the previous question and answer, so this proposal records the resumable state without inventing a previous delta or CHG identity.

Resolved question: For issue #272, must an authorized human approve each learning before it is retained in durable project memory, or may an explicitly operator-approved policy authorize retention of eligible non-sensitive findings without per-learning human approval?

Verbatim verified owner answer:

> I choose the second option: an explicitly operator-approved project policy may retain eligible, non-sensitive findings without asking a human to approve each learning. Keep this simple and automatic within the repository/project scope. Exclude credentials and sensitive or personal data; retain source/provenance and allow correction or invalidation. Shared cross-project memory remains disabled unless separately enabled. This is my answer to the product-policy question, not approval of a Product Change or implementation.

Source: https://github.com/juangcarmona/lighthouse/issues/272#issuecomment-6571559182

Ambiguity pass compared per-record approval with policy-authorized retention: the owner selected the latter. Compared project cross-run recall with cross-project shared recall: the issue selects the former and leaves shared recall disabled by default. Compared optional provider failure with mandatory provider failure: ordinary work continues unless the adopter explicitly requires memory. These choices are represented in the delta, not silently combined into broader authority.

Current queue: trusted provider overlay validation, then explicit product decision. Recommendation: review the two existing-artifact modifications as one draft. Parked questions: none. Excluded items: provider selection and storage design, shared-memory enablement, generalized learning infrastructure, implementation and delivery. Coordinate later design with #100 and #104; neither issue grants authority here. No material product decisions remain unresolved for preparing this candidate; product approval has not occurred. Recheck integrity against the current baseline before requesting approval.

## Open Questions for the Product Owner

None. The retained owner answer resolves the policy choice; approval of the exact candidate remains a separate decision.
