<!-- pdac-scope: none reason="The owner explicitly requests a documentation-only dispatch fixture in issue 130, without product behavior changes." -->

# Design

## Context

See `proposal.md` for the purpose and scope. The issue supplies the exact document path and content; the remaining distinction is between delivering that artifact and independently verifying the dispatch infrastructure.

## Goals / Non-Goals

**Goals:** Keep the fixture minimal and directly checkable by exact content comparison.

**Non-Goals:** Modify or test dispatch infrastructure, application behavior, workflows or repository configuration; publish or merge from the worker; claim that the operator's dispatch checks passed.

## Decisions

- Use a static Markdown document containing only the requested heading and sentence. Adding runtime assertions or a persistent test would change code unnecessarily; verify the file directly and retain the receipt outside the repository.
- Use OpenSpec's documentation-only `skip_specs` metadata instead of inventing a behavior specification. Keep this short design to explain the verification boundary.
- Run the supplied repository checks unchanged. Capture their logs and a fixture/scope report in `/output/evidence/`; no screenshot is needed because no visual surface changes.

## Risks / Trade-offs

- [The sentence could be mistaken for proof of all dispatch guarantees] → Treat it as the requested fixture content, with operator-owned checks explicitly outside this implementation assessment.
- [Broad checks may expose unrelated failures] → Report failures without changing out-of-scope code or weakening checks.

## Migration Plan

No deployment or migration is needed. The owner can decline the evidence PR; it is not a request to merge the fixture into the product.
