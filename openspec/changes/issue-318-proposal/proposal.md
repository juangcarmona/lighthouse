<!-- pdac-scope: cited -->

# Same-PR verification without source edits

## Why

Issue #318 records a correction that passed independent checks but was blocked because it returned no source changes. An existing candidate needs fresh evidence for its current head without a dummy commit.

## What Changes

Allow zero-diff completion only through an authenticated owner correction of an existing implementation PR. Recheck the issue intent, policy, feedback, branch, head and original implementation identity before publication. Keep failed checks and unresolved decisions blocked; reject an initial empty implementation.
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

## Capabilities

### New Capabilities

- `same-pr-verification`: repair the existing correction path so a verified unchanged candidate receives a fresh completion receipt.

### Modified Capabilities

None.

## Impact

The adapter, trusted publisher, review identity and readiness receipt reader change together. Existing initial implementation and source-changing correction routes remain supported. No dependencies or runtime configuration change.

## Product definition

The model tree is unchanged from the #320 review. BR-BOUNDED-WORKFLOW, BR-FAIL-CLOSED and FR-CHANGE-EVIDENCE govern this repair. Structural impact was checked; UC-IMPLEMENT-CHANGE and FR-CHANGE-FLOW retain their existing gates. FR-PRODUCT-CHANGE-WORKFLOW and FR-PROFILE-DELEGATION retain their provider and adopter boundaries. This fixes validation and publication of existing authorized work; it introduces no product decision or merge delegation.
