---
id: ADR-0006
name: public-package-release
title: Publish validated Lighthouse packages through protected release automation
description: Publish the CLI and UI package after the initial adoption contract is validated, with a one-time manual bootstrap and OIDC for later releases.
status: Accepted
date: "2026-10-21"
deciders: [juangcarmona]
tags: [distribution, packaging, release]
---

<!-- markdownlint-disable-next-line MD025 -->
# ADR-0006: Publish validated Lighthouse packages through protected release automation

## Context

The CLI and UI package boundaries are now explicit and their tarballs are checked by the repository test suite. The packages need a reproducible installation route for adopters, while npm Trusted Publishing can only be configured after each package exists.

ADR-0002 records the earlier private bootstrap. The decision below changes the distribution outcome after that validation without changing the ownership boundary in ADR-0001.

## Decision

Publish `@juangcarmona/lighthouse` and `@juangcarmona/lighthouse-ui` as public npm packages. Publish version `0.1.0` once from a clean checkout as maintainer bootstrap, then use Changesets and the protected `npm-publish` GitHub environment with npm OIDC and provenance for later versions.

Keep the root workspace private. Keep package contents constrained by each package manifest; the public site, gallery, profiles, tests and provider-owned integrations remain outside the runtime artifacts.

## Alternatives considered

- **Keep local tarballs as the distribution route:** rejected because adopters need a stable package identity and repeatable installation without a source checkout.
- **Publish from developer workstations for every release:** rejected because credentials, review and provenance would be tied to one machine.
- **Publish one package containing the whole repository:** rejected because the CLI and UI have different consumers and ownership boundaries.

## Consequences

- **Positive:** Adopters can install versioned CLI and UI artifacts from npm.
- **Positive:** Normal publication is reviewed through a Version Packages pull request and a protected environment.
- **Negative:** npm package names and versions are immutable, so a bad release requires a new version or deprecation.
- **Neutral:** The first publication remains a deliberate maintainer setup step because npm has no pending trusted publisher for an unknown package.

## References

- [Release runbook](../../releasing.md)
- [Initial private distribution](0002-distribution.md)
- [Source packages and adopter projections](0005-source-packages-and-adopter-projections.md)
