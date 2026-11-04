# Design

<!-- pdac-scope: cited -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-HOTFIX" digest="sha256:90546f4b1d108ddeea834851f0399ec600c261cd9f70186b144f315b515f039e" -->
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->

## Context

The credential-free host checker and #100 command binding prove execution against a published tree. `collectChanges` already compares effective source bytes; Git index flags do not define write authority. The missing constraints are an admitted inventory of verification inputs, validation-time mutation enforcement in the common checker, and qualification of the existing semantic reviewer.

## Goals / Non-Goals

Protect the declared test entrypoints, transitive wrappers, configuration and assertions. Expose intentional corrections and reject a candidate that passes a weak test while violating the original criterion. Preserve provider ownership, source bounds, correction limits and separate merge authority. Automatic dependency-graph discovery and formal proof of arbitrary test adequacy are outside scope.

## Decisions

- Add optional `verification: { paths, corrections }` to implementation policy. Paths are explicit files/prefixes; corrections map exact files to owner-admitted reasons. The host compares complete bytes/modes, including additions/removals, before running checks. The existing receipt policy digest binds this declaration. The operator owns inventory completeness and includes transitive scripts, manifests and relevant runner configuration.
- Unattended admission requires that declaration and a checkout matching the admitted Git revision by content, independent of Git status. Supervised legacy policies remain readable with explicit unconfigured integrity evidence. The common checker compares all tracked source bytes after execution, so validation-time edits cannot hide in a commit or index flags. Dependency/generated output still follows the existing ignore contract.
- RED authoring gets only independently planned test paths and a host-recorded reason. Repair freezes the resulting test bytes. A necessary RED correction stops the attempt; the owner records the reason in the next authorized request and reproduction/independent verification runs again. Other explicitly admitted test corrections remain visible in the candidate receipt and renewed review binding.
- Candidate review receives the original issue, actual before/after files, execution receipts, correction reasons and RED/GREEN. Its existing read-only mount prevents edits. Missing checks, stale findings, unresolved criteria, unavailable required runtime evidence or exhausted corrections stop advancement. A passing test is execution evidence, not a behavioral oracle.

## Risks / Trade-offs

A declared inventory is not automatic transitive discovery. The adopter must include all verification wrappers/configuration. Existing unattended installations need the new declaration before upgrading execution. Distinct configured/resolved models do not establish provider-reported identity or billing; retain those unknowns. Reviewer qualification is one bounded experiment, not proof for every future behavior.
