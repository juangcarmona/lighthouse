# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation. The source map already represents the admitted candidate. Preparation checks only active metadata, while finalization also assumes an active plan. Provider-owned archived metadata must not be rewritten or treated as a completion receipt.

<!-- pdac:cite id="FR-CHANGE-FLOW" digest="sha256:54e13b356ccefff812cd070c86511c6c2aba61499094e8f5b789e030fd5b5808" -->

## Goals / Non-Goals

**Goals:** Resolve exactly one issue-bound archive, validate it through pinned OpenSpec, preserve its source bytes and reject invalid evidence before agent execution or independent checks.

**Non-Goals:** Grant completion, synthesize historical review, relax checks, alter correction/deadline budgets, publish packages or retry remote continuations.

## Decisions

- Match the existing issue-derived change identity against provider archive names (dated or unchanged names). Reject multiple matches and active/archive coexistence rather than choosing the newest archive. Unrelated archives do not suppress new-plan scaffolding.
- Require provider-owned metadata and the three implementation planning documents. Copy only the matching plan and source OpenSpec configuration/specifications/schemas to a disposable provider workspace. Validate the copied plan under its original active identity there, using strict validation, planning status and apply progress. Never restore it in the candidate. This reuses provider semantics instead of maintaining a second YAML/schema/task parser.
- Recheck archived selection during final metadata materialization and require the archive to remain identical to the preparation baseline. Candidate edits cannot substitute new archived evidence or recreate an active plan.
- Keep normal active/new-plan metadata and skip-specs handling unchanged. The caller still performs exact-tree checks, independent review, forge qualification and publication under existing authority.

## Risks / Trade-offs

- [Provider archive conventions evolve] → Pin the provider, test real CLI behavior and fail explicitly on unsupported evidence.
- [Archive existence mistaken for delivery proof] → Validate planning only; retain all existing completion and independent-check contracts.
- [Extra provider calls on archived corrections] → Limit materialization to the applicable plan and use existing cancellation and provider timeout support.

## Migration Plan

Ship an SDLC patch through the existing Changesets release. Adopters install that published version and update their workflow source/package mode through the existing installer before requalification. Source checks alone do not demonstrate release or adoption. Rollback selects the prior package/workflow pin; no candidate migration is performed.
