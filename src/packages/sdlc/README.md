# Lighthouse SDLC

This package provides the provider-neutral delivery contract for Lighthouse adopters.

It owns the six lifecycle skills, their command entrypoints, route and gate descriptors, the triage schema and verifier, the control-plane schema and deterministic package check.

It does not run agents, store transcripts, dispatch work between repositories or replace ProductShape, ArcShape, OpenSpec or an agent host.

Install it with the Lighthouse CLI or run `lighthouse-sdlc verify` from the package installation to check the distributed contract.

Run `lighthouse-sdlc triage --input <file>` to validate one structured triage result and receive its proposed workflow and classification labels. The command is read-only by default; `--apply --labels-file <file>` writes only after the report is ready and the labels file still matches the input.

Evidence is explicit: an absent field appears in `missingEvidence`, a check that cannot run appears in `unavailableChecks`, and a judgement awaiting review appears in `pendingReview`. Only `provided` evidence can make a report ready to apply.

The package is a source of lifecycle instructions and contracts; an adopter's host adapter decides where provider-specific projections are installed.
