# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AGENT-LAUNCH" digest="sha256:892d98b8746f9267d258ba1fc01447ed9354908c9af168f7269a5d21317d54ce" -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:c07c375e4fa1788978ca5d900bc8f0ea9bc009bc71a1fff5d7602ebed6b00894" -->

## Context

See proposal.md for motivation. Both runtime phases already mount private 2 GiB scratch. The agent retains it across commands; the independent verifier receives a fresh mount for each command. npm downloads, NuGet packages, .NET state and other temporary files compete for those bytes. Existing process-group cleanup and the atomic workspace slot provide the safe disposal boundary.

## Goals / Non-Goals

**Goals:** Release disposable npm downloads between sequential managed commands, preserve downloads while commands and their children run, and retain truthful failure and cleanup evidence.

**Non-Goals:** Increase scratch or memory, share host caches, delete NuGet/.NET state, rewrite adopter commands, or guarantee arbitrary workloads fit within 2 GiB.

## Decisions

- Enable command-owned npm caches explicitly through shared runtime arguments. Allocate a fresh private directory beneath `/tmp` for every managed invocation and override both npm cache environment spellings for its child. Do not clean an inherited or repository-selected path. This avoids guessing whether a configured cache is private and avoids deleting files owned by other commands. Retaining one session cache or cleaning it with npm would require shared-path ownership and overlap reasoning.
- Keep the directory for the entire command group, including npx-launched tools and nested npm invocations. Remove only that allocated directory after existing descendant termination, before a terminal receipt and slot release. Nested managed commands allocate independent directories; the outer engine invocation retains its own until exit.
- Apply disposal on success, failure, spawn failure and handled cancellation. A cleanup failure cannot yield success. Abrupt SIGKILL cannot run cleanup; container teardown remains the final boundary.
- Sample filesystem capacity using filesystem statistics, not host storage or container internals. Preserve original command output and exit status. Failed commands receive available-byte diagnostics without asserting that every NU1301 means ENOSPC.
- Tests use small actual files and an explicit arithmetic budget to exercise sequential demand, plus process-boundary tests for cancellation, overlap, nested invocation and cleanup ownership. They are not a real limited-tmpfs/npm/.NET reproduction. Qualification must use a supported host, current 2 GiB mount, unchanged candidate and separate local/independent receipts.

## Risks / Trade-offs

- [Repeated downloads] → Cross-command npm reuse is deliberately traded for predictable reclamation; within-command reuse remains supported.
- [One command exceeds scratch] → Preserve failure output and capacity diagnostics; disposal only bounds cross-command accumulation. Split installation and verification into separate managed attempts when reclaiming between them is required.
- [Explicit `--cache` or npm configuration overrides] → Those paths remain caller-owned and are not cleaned. The supported default uses the runtime-provided cache environment.
- [SIGKILL or stopped container] → Final container removal reclaims private scratch; no shared mutable cache is introduced.
- [Unavailable native environment] → Record the missing limited-container npm/.NET sequence rather than infer acceptance from unit tests or hosted CI.

## Migration Plan

Ship with the SDLC package and update the adopter's immutable harness pin through the supported installer. No data migration or lockfile change is needed. Rolling back the harness restores session-long npm caching; it does not alter resource or isolation policy.
