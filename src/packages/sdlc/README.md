# Lighthouse SDLC

This package provides the provider-neutral delivery contract for Lighthouse adopters.

It owns the six lifecycle skills, their command entrypoints, route and gate descriptors, control-plane schema and deterministic package check.

It does not run agents, store transcripts, dispatch work between repositories or replace ProductShape, ArcShape, OpenSpec or an agent host.

Install it with the Lighthouse CLI or run `lighthouse-sdlc verify` from the package installation to check the distributed contract.

The package is a source of lifecycle instructions and contracts; an adopter's host adapter decides where provider-specific projections are installed.
