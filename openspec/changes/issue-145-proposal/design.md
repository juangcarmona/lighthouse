# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation. The native adapter already authenticates owner events, binds dispatch receipts to source and intent, reserves issues and rechecks publication. Its triage workflow predates that adapter. The classifier accepts legacy size labels, and no accepted OpenSpec capabilities exist.

## Goals / Non-Goals

**Goals:** Reuse the native dispatch and read-only agent boundary; admit external-authored issues only through verified owner requests; validate explained estimates before publishing passed triage.

<!-- pdac:cite id="BR-TRIAGE-CONTRACT" digest="sha256:35458afe1b482e22633da9638f2e1ea824c8ba1a1d2370596926b98dad4a969b" -->

**Non-Goals:** Automatic admission on issue opening, requester-authorized continuation, implicit refinement, hour estimates, historical calibration claims, decomposition or aggregate PR delivery.

## Decisions

- Use the existing owner label/manual entry and matching owner reply rules for triage, rather than introducing a second authorization store. An external author is permitted only for triage; later direct entry retains existing restrictions. The dispatcher and publisher still authenticate source and task digest.
- Reuse the refinement worker structure for native triage, excluding its implementation continuation. Install it alongside refinement through the existing opt-in installer. Preserve any existing issue form rather than overwriting it.
- Add an independent estimate object with numeric points, rationale for scope/dependencies/verification, confidence, uncertainty and provisional/confirmed state. Keep legacy classifier labels separate to avoid inventing S/M/L/XL conversions. Native passed triage requires the estimate and request analysis; old classifier inputs remain supported.
- Preserve the exact original issue body in the triage output. Record each inference with a source and every unknown separately; questions require an explanation of the outcome they block. The agent supplies semantic reasoning; deterministic validation enforces structure and prevents incomplete reports from passing.
- Refinement rechecks a supplied estimate and retains the prior estimate and reason for revision. Direct engineering entry does not fabricate a prior triage estimate.

## Risks / Trade-offs

- [Initial anchors lack historical calibration] → State that they are initial relative anchors; calibrate with early completed stories, never imply time conversion.
- [Legacy classification differs from numeric estimation] → Keep both explicitly independent; numeric estimates do not silently change configured labels.
- [External content contains instructions] → Continue treating issue bodies as untrusted data and retain owner-only admission and replies.
- [Native workflow compilation needs the pinned external compiler] → Validate sources and compile with gh-aw v0.93.2 when available; report missing compilation evidence rather than editing generated locks by hand.
- [The current publisher excludes `.github` paths even under wildcard implementation scope] → Deliver package-owned form and workflow sources; leave self-adoption explicitly incomplete and do not weaken publisher scope enforcement. The older compiled triage lock remains unchanged and must be regenerated before release or installation.

## Migration Plan

Ship a minor SDLC release with schemas, skills, templates and upgrade instructions. Adopters preview installer output, review workflow changes, compile with the pinned compiler and explicitly apply installation. Do not alter an adopter's form or workflow implicitly. Roll back via the reviewed prior package/workflow revision; original issue bodies are never rewritten.
