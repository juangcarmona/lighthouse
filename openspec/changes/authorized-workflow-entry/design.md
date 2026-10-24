<!-- pdac-scope: cited -->

# Design

## Context

See [proposal](proposal.md) for the product drift. The current bridge recognizes two comments and the host admits supervised triage/refine; these implementations cannot become the authority for the expanded workflow.

## Goals / Non-Goals

The first executable slice proves direct authorized refinement through one shared decision contract. It does not enable a public ingress, implement a second engine or grant automatic merge.

## Decisions

The trusted adapter resolves identity and current repository permissions, then calls a deterministic Lighthouse router with normalized event, work-item state, capabilities and policy. For GitHub, engineer eligibility requires effective write/maintain/admin permission plus repository policy; requester admission and trusted App identity are separately configured. Unknown or unavailable permission evidence yields no execution. A label name, author association or bot suffix is insufficient authority.

The decision records workflow, authorization provenance, permitted effects, limits and the next required evidence. SoFa authenticates admission, persists the decision and enforces leases and publication fences. It rechecks current authority before external effects. Trusted continuation binds the prior result and grant; unrelated comments and closed work do not restart it.

Entry, supervision and merge are separate policy dimensions. Refine completes, asks a scoped question, or produces dependency-aware child work. An implementation workflow checks readiness and composes OpenSpec proposal, application and verification, retaining their artifacts and gate results. CI and reviewer feedback update the same PR within bounded repair attempts. Integration evaluates current-head evidence and its own grant.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->

## Risks / Trade-offs

- Event or permission drift: bind provider event identity and policy revision, reread before effects, and invalidate stale grants.
- Mixed package/host versions: refuse unsupported contract combinations before model execution; upgrade a packed consumer and host fixture together.
- Duplicate routing: replace bridge classification with the shared router; use one durable idempotency owner and one publisher per work item.
- Label-trigger delivery differences: prove continuation using the actual configured App or explicit dispatch; do not assume label changes generate another run.
- Approval inflation: distinguish an answer, entry authorization, gate evidence and integration decision in the request and persisted record.

## Migration Plan

Resolve and apply the proposed product delta through its owning workflow, then implement E1 with a versioned host contract and compatibility tests. Publish before consumer adoption. Roll out to the owner's engineering entry first; keep requester access and other capabilities disabled until separately configured and tested. Old consumers retain schema-1 behavior. Rollback stops new admission, drains or cancels affected work, restores the previously pinned contract and reconciles uncertain publications before restarting.
