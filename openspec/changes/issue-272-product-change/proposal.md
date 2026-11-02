<!-- pdac-scope: cited -->

# Persist and selectively recall scoped agent learnings across runs

## Why

Issue #272 asks for two isolated executions to reuse a useful project learning without storing transcripts or treating memory as accepted product truth. The owner has selected an explicitly operator-approved project policy that can retain eligible findings automatically, rather than requiring a human decision for each finding.

## Requested Product Intent

Eligible, non-sensitive findings can survive an execution and be recalled with provenance by another explicitly authorized execution in the same project. The host enforces read and write scope, relevance and a bounded result; operators can correct or invalidate records. Run-private information remains private, shared memory stays disabled by default, and optional memory failure does not prevent ordinary work. Memory never changes product, architecture, delivery or approval authority.

## Impacted Product Areas

- FR-AGENT-MEMORY (modify): retain its provider-neutral contract and stable identity while adding durable project recall, record binding, correction, invalidation and optional-provider outcomes.
<!-- pdac:cite id="FR-AGENT-MEMORY" digest="sha256:f5e1ab48267f899e412c90a39cbca5b1e67986c10b5c8faf46b51f1034354b7e" -->
- BR-MEMORY-BOUNDARY (modify): define policy-approved retention, explicit recall authority and privacy exclusions; remove the implication that disabling shared scope necessarily disables project cross-run recall.
<!-- pdac:cite id="BR-MEMORY-BOUNDARY" digest="sha256:0d7131052668df1c8212a67d4daf5fb6167e30611f5dcbf3c92a4e9df6ddcf0f" -->
- TERM-AGENT-MEMORY (dependency, unchanged): typed scoped context is not a transcript or authority; persistence does not require a new competing memory concept.
<!-- pdac:cite id="TERM-AGENT-MEMORY" digest="sha256:5da14158ed73f214d7c4aee585845738ea707631a0a6d65ebd96f92e4fbd8349" -->
- QR-AGENT-ISOLATION (dependency, unchanged): existing visibility enforcement still governs persistent providers; no lease or run-isolation relaxation is proposed.
<!-- pdac:cite id="QR-AGENT-ISOLATION" digest="sha256:731985a0bf28b2715a594b54342c254017eabe0e41fc14e3d12144b82240208b" -->

### Product definition drift

The accepted model specifies typed memory, not the full durable and selective learning policy. Its shared-memory exception currently implies that disabling shared memory disables all cross-run recall, which conflicts with project-scoped persistence. This candidate proposes the explicit correction; it does not alter the accepted definition.
<!-- pdac-drift ids="FR-AGENT-MEMORY,BR-MEMORY-BOUNDARY" summary="Define policy-approved durable project learning and distinguish project cross-run recall from shared cross-project recall." -->

## Neighbours Checked and Left Out

- UC-RUN-AGENT: fresh context, bounded declared inputs and recording permitted memory already accommodate selective recall; no new launch or lifecycle flow.
- UC-CONTINUE-AGENT-RUN: visibility-bounded memory loading and failure when required memory is unavailable remain valid; project recall is not permission to continue a paused stage.
- UC-CONFIGURE-AGENT-CONTROL-PLANE and FR-AGENT-CONTROL-PLANE: existing memory-policy and provider declarations accommodate this policy; no new runtime or configuration ownership.
- BC-FOUNDATION: provider-neutral memory remains a harness contract; infrastructure operation remains outside Lighthouse ownership.
- TERM-AGENT-RUN and TERM-AUTHORITY-MAP: existing execution identity and authority meanings are preserved.
- BR-HUMAN-AUTHORITY, BR-OWNED-AUTHORITY and BR-PRODUCT-CHANGE-HANDOFF: bounded policy delegation is already permitted, but retention eligibility is not product approval, apply, implementation or publication authority.

## Clarification Report

The host supplied the pinned provider graph at baseline 0cd131ed5ffa4196ca8163d8ae05fda4fca55a19bdc19b273e0431db940cd405. The inventory was compared with the idea and the relevant accepted texts were read. The following proportional pass was reconsidered immediately before the first delta; no new nodes or wider scope were introduced. Graph evidence selects review candidates, never authority to change them.

| Priority | Changed node | Neighbour and relationship | Polarity | Classification and mechanical reason |
| --- | --- | --- | --- | --- |
| 1 | BR-MEMORY-BOUNDARY | FR-AGENT-MEMORY derived-from rule | dependency | Affected: the requirement must express the new eligibility, persistence and retrieval obligations. |
| 1 | FR-AGENT-MEMORY | BR-MEMORY-BOUNDARY through derived-from | governance | Affected: durable recall must inherit privacy and host-enforced scope; the shared-memory exception needs correction. |
| 2 | Both modified nodes | TERM-AGENT-MEMORY through uses-terms | dependency | Checked and unaffected: its typed context and non-transcript definition already permits bounded lessons across runs. |
| 2 | Both modified nodes | UC-RUN-AGENT and UC-CONTINUE-AGENT-RUN through derived-from, governed-by and applies-to | dependency / governance | Checked and unaffected: declared inputs and visible records can carry selected findings without changing stage transitions or continuation authorization. |
| 2 | BR-MEMORY-BOUNDARY | FR-AGENT-CONTROL-PLANE through derived-from; UC-CONFIGURE-AGENT-CONTROL-PLANE through governed-by | dependency | Checked and unaffected: existing project memory-policy declarations can name the operator policy and optional capability. |
| 3 | BR-MEMORY-BOUNDARY | BC-FOUNDATION through applies-to | governance | Checked and unaffected: memory infrastructure remains operator-owned rather than a hosted Lighthouse service. |
| 3 | FR-AGENT-MEMORY | TERM-AGENT-RUN and TERM-AUTHORITY-MAP through uses-terms | dependency | Checked and unaffected: repository/work-item/revision binding strengthens provenance without changing identity or authority ownership. |
| 3 | Both modified nodes | QR-AGENT-ISOLATION via shared use cases | governance | Checked and unaffected: existing isolation applies to persistent visibility; added functional acceptance tests make project separation observable. |

No uncertain candidates remain within this bounded idea. Actors, journeys, bounded contexts, other requirements and structured behaviours are unchanged: the same operators and hosts perform the same roles, while the two existing artifacts can state and verify the new memory obligation directly. Distribution, profile, tracker, factory and release capabilities have no changed product outcome.

## Refinement pass

Current queue: return this exact draft for host overlay validation and a product decision request. The source memory validator confirms existing run/project/shared scope validation and required metadata; it is not evidence of persistence or retrieval implementation. Reuse that contract rather than create a second one.

Policy alternatives examined: per-finding human approval would stop every automatic retention; explicit operator-approved project policy would allow eligible non-sensitive retention without those repeated stops. The verified owner selected the second alternative. Neither alternative grants recall outside declared authority. Disabled shared scope versus disabled project recall are distinct: the request selects project persistence without enabling shared access. Optional-provider absence versus adopter-required memory is explicitly selected by the issue. Provider selection remains delivery design, not an unresolved product decision.

Verbatim owner answer (https://github.com/juangcarmona/lighthouse/issues/272#issuecomment-6571559182):

> I choose the second option: an explicitly operator-approved project policy may retain eligible, non-sensitive findings without asking a human to approve each learning. Keep this simple and automatic within the repository/project scope. Exclude credentials and sensitive or personal data; retain source/provenance and allow correction or invalidation. Shared cross-project memory remains disabled unless separately enabled. This is my answer to the product-policy question, not approval of a Product Change or implementation.

Checked-and-excluded candidates are listed above. Parked product questions: none. Consciously excluded work: generalized learning platforms, shared-provider rollout, transcripts, mandatory embeddings, graphs, background learning, benchmark corpora and numeric savings targets. Coordinate later delivery with #100 and #104 without assuming their scope or approval. Evaluate an existing AgentMemory provider or local SQLite before inventing a service; no provider choice or implementation is made here.

Readiness: no material product decisions remain unresolved for this bounded candidate. Provider overlay validation remains pending with the trusted host; product approval is still required before trusted apply. Repeat the integrity pass against the current baseline before requesting approval. This idea grants no implementation authority.

## Open Questions for the Product Owner

None. The ambiguity pass found no remaining product-semantic choice within the authorized scope after the verified policy answer.
