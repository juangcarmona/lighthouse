---
id: FR-WORKFLOW-HANDOFFS
type: functional-requirement
title: Make lifecycle handoffs actionable and chronological
status: draft
derived-from: [UC-RUN-SDLC, UC-CONTINUE-AGENT-RUN, BR-WORKFLOW-STATE, BR-LABEL-STATE, BR-ENTRY-AUTHORITY, BR-HUMAN-AUTHORITY]
uses-terms: [TERM-WORKFLOW-STATE, TERM-WORKFLOW-STAGE, TERM-LABEL-STATE, TERM-AGENT-RUN, TERM-GATE]
verification:
  - scenario: A controlled issue or PR shows a request, complete question, accepted answer, authorized continuation and terminal failure in chronological order without a phantom review target.
  - scenario: Every lifecycle handoff states observed status, stage, result, responsible actor, exact action and next trigger; a review links an existing accessible result and names the decision required.
  - scenario: Host-observed failure or cancellation before a valid agent result produces a fresh outcome without fabricating an agent result or stage success; unknown execution remains unknown.
  - scenario: Correlated label changes precede the explanatory handoff, interrupted publication is reconciled, and duplicate or delayed attempts cannot produce a duplicate or misleading current status.
  - scenario: A matching answer remains associated with its question through authorized continuation and retry without approving a separate gate; changed scope, conflicting information or expired evidence makes any renewed question explicit.
---

## Requirement

Lighthouse MUST provide one human-facing handoff structure across installed lifecycle stages and applicable issue and PR interactions. It MUST identify the observed status and stage, what happened and which result exists, the responsible person's exact next action and response location or that no action is needed, and what event or decision triggers the next workflow action. It MUST link an existing result when review is requested and state the decision needed. Execution identifiers, source revisions and diagnostics MAY remain in collapsed details; they MUST NOT replace the visible outcome and action.

A question handoff MUST repeat the complete outstanding question, identify who can answer and where, and explain how the answer is evaluated before continuation. Operational blockers MUST name the missing condition and responsible actor rather than invent a question. Accepted answers MUST remain associated with their questions across authorized continuation and retry. A question MAY be repeated only when scope changes, information conflicts or evidence expires, with the reason stated. An answer MUST NOT grant product, design, integration, merge or release approval.

Handoffs MUST distinguish requested or queued, active, waiting for an answer, ready for review, failed, cancelled and completed observations. Unknown or unconfirmed execution MUST remain explicit. A host MUST use trusted execution observations to report a failure or cancellation when no valid agent result exists; it MUST NOT fabricate a result, a passed gate, a review target or an automatic retry. Recovery instructions MUST reflect the configured policy and the actual responsible actor.

The configured tracker projection MUST use its declared vocabulary and legal transitions. An unanswered question uses the configured question state; review state requires an identified accessible review target. The default failure state MUST be `execution-failed`, declared and reconciled through the existing capability adoption contract. Existing installations MUST receive an explicit adoption or compatibility outcome before the host relies on that label; a missing label MUST NOT silently grant authority or create a review state. Reservations and other independent overlays MUST survive unrelated transitions and labels MUST NOT grant authority.

For each transition the host MUST apply correlated status-label changes before the explanatory handoff and publish a fresh visible handoff when a person must act or an attempt terminates. It MUST preserve requests, questions, answers and outcomes; editing an older receipt cannot replace a later terminal notice. Correlation MUST include the work item, stage and execution attempt. Duplicate events MUST NOT duplicate handoffs, and older attempts MUST NOT overwrite or append a misleading current status after a newer attempt takes over.

Label and message publication are separate operations. The host MUST detect and reconcile partial publication, interrupted cleanup and missing outcome notices within existing bounded recovery and authorization, without adding a scheduler or granting retry authority. If the host cannot establish the current outcome or publish consistently, it MUST retain the uncertainty and identify the next responsible recovery action.

## Rationale

A person can act on a current handoff without reconstructing earlier comments or interpreting logs. Correlated, recoverable publication keeps the visible conversation aligned with observed execution while preserving existing authority boundaries.
