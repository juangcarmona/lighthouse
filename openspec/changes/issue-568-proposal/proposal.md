# Wait for CI within the admitted delivery deadline

<!-- pdac-scope: cited -->

## Why

A required check may take more than ten minutes while the owner-delegated route still has time available. The current adapter stops that delivery early because it adds a separate ten-minute CI ceiling.

## What Changes

Establish one deadline at route admission and propagate it to provider execution, authority rechecks and CI/mergeability waiting. Keep current check-origin validation, draft holds, head binding and final merge checks. Extract the polling loop only to exercise its real behavior with a virtual clock.

## Capabilities

### New Capabilities

- `unattended-ci-wait`: wait for verified CI within the already admitted route window.

### Modified Capabilities

None; no accepted OpenSpec capability exists for this internal polling path.

## Product authority and impact

BR-BOUNDED-WORKFLOW, QR-BOUNDED-AUTOMATION and BR-STAGE-GATES govern the declared limit and advancement gates. The ProductShape model tree is unchanged from the prior reviewed engineering baseline. Structural impact of the bounded-workflow rule was checked: foundation, change-flow evidence and implementation are relevant; product preparation, profile delegation and human authority retain their existing contracts. No product-definition drift or new product decision is proposed.

## Impact

Owning implementation: `unattended-actions.mjs` and `completion-state.mjs`; deterministic polling tests and `unattended.md`. Per-command limits, resources, models, correction rounds and merge permissions are unchanged. Installation/release and adopter budget configuration remain separate.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->
