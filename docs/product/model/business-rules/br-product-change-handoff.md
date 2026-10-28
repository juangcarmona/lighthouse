---
id: BR-PRODUCT-CHANGE-HANDOFF
type: business-rule
title: Product preparation, approval, apply and continuation remain separate
status: draft
applies-to: [UC-PREPARE-PRODUCT-CHANGE, UC-RUN-SDLC, UC-IMPLEMENT-CHANGE, UC-CONTINUE-AGENT-RUN]
uses-terms: [TERM-AUTHORITY-MAP, TERM-INTEGRATION, TERM-AGENT-RUN, TERM-WORKFLOW-STATE, TERM-GATE]
---

## Rule

ProductShape MUST own product meaning, Product Change artifacts, refinement, approval policy, overlay validation and deterministic apply. Lighthouse MUST own authorization, bounded execution, publication, attention requests and continuation evidence. A product-change worker MUST use the installed provider workflow and MUST NOT approve its own candidate or edit the accepted definition by hand. This interaction MUST preserve existing lifecycle stages and stage-result consumers.

An authorized idea request MAY initiate product preparation. A worker MAY prepare a product adjustment automatically only within its existing issue authorization. Accepted intent that already covers the work MUST be recorded without creating an unnecessary Product Change. Scope expansion MUST stop for an owner decision. Dependent work MUST checkpoint and preserve existing work until required human decisions, successful apply and applicable delivery prerequisites are satisfied.

A small issue adjustment MUST share the issue branch and PR with its engineering delivery, creating that issue's draft PR when none exists. Product and engineering artifacts MUST retain distinct identities. Independent product work MAY use its own PR. Publication MUST be serialized against the current branch head and MUST preserve another actor's work.

The product decision request MUST appear on the real PR and be linked from the issue. It MUST identify the problem, proposed outcome, affected areas, actual Product Change and proposed-artifact links, relevant diff, decisions and trade-offs, current validation evidence, unresolved questions, approval or requested-changes action, and what that action permits next. Product questions MUST be asked one at a time. Human answers and requested changes MUST be recorded in the same change and a revised proposal MUST return for review.

Product approval MUST be an explicit decision by an authenticated human authorized for that product. The host MUST bind it to the identified Product Change, reviewed delta and relevant product baseline. Silence, a clarification answer, a label, a green check, generic PR feedback or ambiguous praise MUST NOT grant product approval. A material proposal or baseline change MUST trigger revalidation and renewed approval where the approved meaning no longer holds.

Trusted apply MUST remain separate from candidate preparation. The host MUST recheck approval, authorization and publication freshness, use the provider-supported dry-run and apply, validate the resulting definition, report affected consumer citations and refresh dependent planning or evidence as needed. Archive MUST remain a separate provider-owned action. Applied intent on the issue branch MUST be identified as branch context whose canonical acceptance awaits merge; product approval MUST NOT grant merge or release authority.

A successful apply MAY unblock exactly one waiting parent continuation under its still-effective bounded authorization and applicable gates, without repeating an already-authorized implementation request. An idea request alone MUST NOT authorize delivery. Waiting MUST persist the checkpoint and release execution resources. Duplicate events MUST NOT duplicate changes, PRs, applies or parent continuations. Failed validation, failed or uncertain apply or publication, unresolved questions, conflicting branch updates and changed or revoked authority MUST preserve the checkpoint and stop dependent work with an actionable outcome.

## Rationale

Product decisions can unblock existing delivery without becoming implicit worker permissions. Separate evidence for preparation, approval, apply and continuation makes both the single-PR path and interrupted work reviewable.

## Examples

An authorized issue worker finds missing product intent, prepares a candidate on the issue PR and waits. The owner explicitly approves that identified candidate; trusted provider apply succeeds, and the parent resumes once using the applied branch context and its original delivery limits. The PR still awaits its separate merge decision.

An idea-only request produces a product proposal and approval request. It cannot start implementation until the applicable delivery authorization exists. A duplicated approval event creates no second apply or continuation.

## Exceptions

None. A broader product adjustment requires an explicit owner scope decision; it is not an exception inferred by the worker.
