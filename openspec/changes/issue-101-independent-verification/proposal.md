# Proposal

<!-- pdac-scope: cited -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-HOTFIX" digest="sha256:90546f4b1d108ddeea834851f0399ec600c261cd9f70186b144f315b515f039e" -->
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:fc65ab1eb13b9a5e66e3a7d7efd57bb1c3bd3e6ea92c092d4e40ee5856a40ee6" -->

## Why

Issue #100 authenticates executed commands. A candidate can still weaken the repository scripts or assertions those commands reach. #101 must qualify the existing independent reviewer against that failure and enforce the admitted verification scope.

## What changes

Declare verification input paths and narrowly reasoned corrections in implementation policy. Reject unadmitted changes before host checks; compare effective bytes before and after checks. Require an immutable, byte-matching source checkout and an explicit verification inventory for unattended routes. Reuse the existing read-only reviewer and bounded corrections.

## Capabilities

### New capabilities

- `verification-integrity`: protect admitted verification inputs and qualify independent behavioral review.

## Product scope

This enforces BR-BOUNDED-WORKFLOW, BR-HOTFIX and UC-IMPLEMENT-CHANGE. Existing route policy already selects independent review and hotfix regression proof. Supervised routes retain their human decisions and compatibility; no universal multi-agent requirement or new gate is introduced. Product meaning, runtime/user-journey requirements and approval remain with the adopted profile and original issue.

## Impact

SDLC implementation policy/runtime, unattended admission and reviewer context/skill, package guidance, regression tests and an installed-package feasibility experiment. The experiment must retain a weak-test false positive, an independent rejection, a legitimate correction, RED/GREEN and actual scope/model observations. Broader delivery pilots remain #185/#186.
