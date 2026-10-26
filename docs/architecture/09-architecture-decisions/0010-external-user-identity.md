---
name: external-user-identity
description: Delegate application sign-in to external OIDC providers and keep shared identity lifecycle operator-owned.
status: Accepted
date: 2026-10-26
deciders: [repository-owner]
tags: [identity, security, adoption]
---

# ADR-0010: Delegate user identity to an external OIDC provider

## Context

The web BFF profile already requires a server-side token boundary and the .NET example validates bearer tokens. Neither establishes who owns user credentials or how applications consume shared identity infrastructure. Without that guidance, adopters can implement account management repeatedly or couple a shared provider to one application's lifecycle.

## Decision

Applications requiring user sign-in consume an external OIDC provider through maintained middleware. Recommend Keycloak for self-hosting and reuse an existing provider when available. The operator owns provider deployment, accounts, backups and recovery. Each application has its own client registrations and owns domain authorization. Record exceptions to the external identity default as product and architecture decisions.

Ship the contract in the harness package, reference it from generated baseline instructions and authenticated application skills, and retain the application's existing configuration mechanism. This clarifies existing application profiles; it adds no identity runtime, mandatory provider dependency or new manifest schema.

## Consequences

- Applications can share sign-in without sharing credentials or resource permissions.
- Shared identity becomes an operational dependency; operators must plan outages and recovery independently of applications.
- Provider replacement requires identity mapping and session migration analysis, not just a new issuer URL.
- Foundation checks establish adoption and file integrity. Each product must supply provider integration and authorization evidence before claiming secure runtime behavior.

## Alternatives considered

- Build an authorization server in each application: adds credential and account lifecycle maintenance to each product.
- Require one specific provider: prevents reuse of existing identity infrastructure.
- Install Keycloak with every application: couples identity availability and teardown to application deployments.
- Add a Lighthouse identity configuration schema now: duplicates application and provider configuration without an executable consumer.

## References

- [External identity contract](../../../src/packages/cli/assets/profiles/identity.md)
- [Issue #116](https://github.com/juangcarmona/lighthouse/issues/116)
