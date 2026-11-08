# Deadline propagation and CI waiting

<!-- pdac-scope: cited -->

## Context

The adapter already creates a route-wide cancellation timer and passes a deadline to the OpenSpec provider. Its integration loop instead uses a fresh ten-minute ceiling. A pending check can therefore stop early even though the admitted route has time remaining.

## Decisions

Create one absolute deadline beside the existing cancellation controller. Reuse it for the provider and make `recheck` reject both cancellation and wall-clock expiry. Supply that deadline to the extracted integration-wait function; do not start another allowance at CI publication.

Move the existing polling logic into `completion-state.mjs` with the existing inspector/check validation and an injected promotion callback. Production uses the current GitHub inspector. Tests inject a deterministic clock, delay and source observations, exercising the real loop without sleeping. Each source read and promotion retains authority rechecks. Validate the expected PR head/state, preserve later owner draft holds and fail immediately on ineligible/unverified check origins. Return a mergeable, checked observation; `mergeAccepted` retains its fresh final reads and write guard.

CI becoming green after ten minutes may advance only before the original deadline. Expiry during a read must stop before promotion; cancellation and expiry never authorize merge. Keep the current behavior for failed/pending checks and uncertain promotion responses.

## Architecture and boundaries

This factors an internal polling function and propagates an existing time limit. No component, trust, persistence, deployment or runtime authority changes; common architecture documentation has no structural change. The owning package guide records the corrected waiting boundary. No package release or adopter policy increase is claimed by this source fix.

## Qualification correction

Hosted package validation exposed a shallow-checkout failure before tests: Changesets could not find its configured `main` merge base. The package job now obtains full history and establishes the local base ref before the unchanged release-plan validation. A clean shallow-clone negative control reproduces the original failure; restoring history and that ref makes the same command pass. This CI prerequisite preserves the validation rather than excluding the patch changeset.

## Risks and rollback

Clock and cancellation checks must agree; retain the controller as the hard cancellation path and check the absolute deadline before privileged effects. Keep all existing tests and exact-head verification. Revert the source change to restore the old polling behavior; preserve diagnostic evidence of the early stop.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->
