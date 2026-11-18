---
id: FR-PROCESS-GUARDS
type: functional-requirement
title: Retain verified process guards
status: draft
derived-from: [UC-IMPLEMENT-CHANGE]
verification:
  - scenario: Review records a real claim and outcome, separates the code defect from the process gap and reuses one owning check with behavioral failing and corrected passing evidence.
  - scenario: A verified record retains its owner, source, version, adoption, rollback, retirement, follow-up and pilot observations or explicit unavailable reasons.
  - scenario: Review records a reasoned no-guard outcome when another recurring control is not justified and retains unqualified proposals in the existing retrospective and backlog.
uses-terms: [TERM-GUARDRAIL, TERM-AGENT-RUN]
---

## Requirement

Lighthouse MUST support an evidence-backed disposition of process-guard findings in its existing review stage. The record MUST distinguish the original claim, actual outcome and source evidence, code defects and process gaps. A proposed guard MUST identify one authoritative owner and source and prefer an existing check. A verified guard MUST demonstrate that its behavioral assertion fails on the original revision and passes on the corrected revision, retaining actual statuses and evidence. Unverified proposals MUST remain distinguishable from verified guards.

A guard record MUST retain its version, adoption scope and version, rollback or retirement conditions, follow-up ownership and recurrence, false-positive and maintenance-cost observations or explicit unavailable reasons. One incident and its retries MUST NOT establish an independent recurrence rate. Review MUST permit a reasoned no-guard outcome when an additional recurring control is not justified. Findings MUST remain discoverable through the existing durable review record and backlog.

Provider-owned sources MUST be changed through their provider and project-owned sources through ordinary reviewed changes. Policy changes MUST follow their owning product decision process; execution MUST NOT rewrite its own permissions or acceptance criteria. This route MUST reuse existing review and adoption mechanisms and MUST NOT introduce a general memory service or new lifecycle stage.

## Rationale

Demonstrated failures can improve an existing check while source ownership, evidence and retirement prevent an accumulation of unverified process rules.
