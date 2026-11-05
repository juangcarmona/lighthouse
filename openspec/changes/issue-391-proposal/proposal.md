# Proposal

<!-- pdac-scope: cited -->

## Why

Issue #391 reports that `lighthouse authorities --dry-run --format json` prints prose instead of a parseable plan. Correct the accepted output flag without changing provider initialization authority or commands.

## What Changes

- Emit one JSON document with both provider identities, exact installed versions, commands, repair actions and actual preflight outcomes.
- Capture provider chatter inside JSON rather than interleaving stdout; missing providers and unsuccessful preflights remain failures.
- Reject JSON apply before running providers. Preserve default and explicit text previews, text apply and no-write previews.
- Add CLI regressions and one CLI patch changeset alongside this plan.

## Capabilities

### New Capabilities

- `authority-initialization-preview`: machine-readable projection of the existing authority initialization plan and preflight evidence.

### Modified Capabilities

None. `openspec list --specs` returned no specs; this contract documents the bounded output correction, not new product intent.

## Impact

Only the authorized CLI module, existing CLI tests, `.changeset/authority-init-json-preview.md` and this proposal root change. No dependencies, provider files, policies or version declarations change.

### Product context

The product inventory and provider-related requirements identify initialization, ownership and honest failures as preservation dependencies. Provider-generated citation payloads bind the plan to these unchanged artifacts:

<!-- pdac:cite id="FR-AUTHORITY-INITIALIZATION" digest="sha256:7c5a19c8c532b9725eeef1c037e7b604a799ed51f7ee5f2ef470f3770815ff4d" -->
<!-- pdac:cite id="BR-OWNED-AUTHORITY" digest="sha256:927ca94ef20deb83a84734978c82c5647cd1cd41eeaed9935eda7f4a6c61f611" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

Impact discovery widened these artifacts through provider impact reports. Checked neighbours `UC-INITIALIZE-AUTHORITIES`, `BR-AUTHORITY-BOUNDARIES`, `FR-AUTHORITY-ADOPTION` and the authority/integration/managed-projection terms remain unchanged: adoption validation, independent authority progress and generated-path ownership are outside this correction. Delivery, public-site and profile neighbours introduce no additional implementation scope. No product-definition drift or Product Change is proposed; draft baseline text is context, not approval of broader delivery work.

## Verification

Run dependency installation, focused CLI tests, full repository verification, citation verification and strict OpenSpec validation. Preserve workspace receipts separately from future independent host checks, CI, authorized integration and post-integration review. No visual decision is required for this CLI-only correction.
