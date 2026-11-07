# Lighthouse

[![Lighthouse engineering baseline](assets/github-banner.svg)](https://juangcarmona.github.io/lighthouse/)

Lighthouse provides the engineering baseline and agent workflows for taking a GitHub issue through refinement, implementation, independent verification and integration. It combines repository guardrails, delivery contracts and retained evidence in packages that adopters install and configure in their own repositories.

ProductShape owns product intent, ArcShape owns architecture evidence and Lighthouse owns the delivery baseline. Each product keeps its own decisions, infrastructure and credentials.

## What you can use

| Surface | Available behavior | Guide |
| --- | --- | --- |
| Repository harness | Initialize or adopt a repository, select profiles, verify guardrails and preview managed-file upgrades without overwriting customizations. | [CLI](src/packages/cli/README.md) |
| Agent delivery | Route owner requests to refinement, proposal, implementation and review workers; update the same PR after feedback; integrate when the configured checks and approvals permit it. | [SDLC](src/packages/sdlc/README.md) |
| Validation and recovery | Run independent checks, bind evidence to the candidate, retain blocked and failed outcomes, reconcile interrupted work and optionally attempt bounded CI repair. | [Operator guide](src/packages/sdlc/github-actions.md), [completion](src/packages/sdlc/completion.md) |
| Unattended delivery | Opt into bounded fast-forward and test-first hotfix routes, or serial delivery of dependent epic children. | [Unattended routes](src/packages/sdlc/unattended.md), [epics](src/packages/sdlc/epic-delivery.md) |
| Application profiles | Generate a .NET backend with Minimal APIs, CQRS and analyzer checks; adopt guidance for React, BFFs, PWAs, Expo and MAUI. | [Profiles](src/packages/cli/assets/profiles/catalog.json), [.NET](src/dotnet/profile/README.md) |
| Visual contract | Reuse semantic CSS tokens, native component recipes and the design guide through a separate package. | [UI](src/packages/ui/README.md) |

## Start with a repository

Requires Node.js 22 or later. In the repository you want to adopt:

```sh
npm install --save-dev --save-exact @juangcarmona/lighthouse
npx --no-install lighthouse init --name MyProduct --dry-run
npx --no-install lighthouse init --name MyProduct
npx --no-install lighthouse verify
```

Review the initializer's preview before writing. Existing files are preserved and reported as conflicts. Verification reports missing integrations and adoption gaps; follow the [CLI guide](src/packages/cli/README.md) to configure the relevant authorities and checks. Commit the package lock and selected configuration.

For an existing repository, start with the [adoption steps](src/packages/cli/README.md#existing-repository). To create a backend in a new directory, use `lighthouse create-dotnet <empty-target> --name MyProduct`; the [.NET profile](src/dotnet/profile/README.md) describes SDK requirements and verification.

## Enable agent workflows

Workflow installation is a separate opt-in. The [SDLC guide](src/packages/sdlc/README.md#install-or-update-workflows) covers the installer, labels and immutable source or published-package pins. Configure the runtime, credentials, independent verification commands and completion policy through the [operator guide](src/packages/sdlc/github-actions.md) before enabling automation.

With the corresponding workers enabled, the owner can request `refine`, `propose` or `implement` through issue labels. The router checks the request and current state before dispatching work. Implementation publishes a draft PR with its plan and verification evidence; eligible feedback updates that PR. Completion can merge and review delivery when current authorization and required checks permit it.

Unattended routes, maintenance, CI repair and epic delivery each require explicit configuration. Product decisions, protected environments and required human approvals remain stops. Successful installation or a green Actions run alone does not prove an accepted delivery; inspect the result and its evidence links. The [delivery guide](src/packages/sdlc/README.md) describes supported events and continuation rules.

## Explore

- [Public site](https://juangcarmona.github.io/lighthouse/)
- [Product snapshot](https://juangcarmona.github.io/lighthouse/model/)
- [Architecture snapshot](https://juangcarmona.github.io/lighthouse/architecture/)
- [Harness package guide](src/packages/cli/README.md)
- [Delivery guide](src/packages/sdlc/README.md)
- [Architecture source](docs/architecture/README.md)

## Develop

Requires Node.js 22 and the .NET SDK for backend profile work.

```sh
npm ci --ignore-scripts
npm run verify
```

Build the public site locally with `npm run build:public-site`; preview it with `npm run preview:public-site`.

## License

Lighthouse-authored code, documentation, profiles and templates are licensed under [Apache-2.0](LICENSE). Commercial use and modification are permitted under its terms. Using Lighthouse does not require opening the source of your own application; copies of Lighthouse material retain their applicable license and notice obligations.

See [reuse and distribution](docs/reuse.md), [NOTICE](NOTICE) and [third-party notices](THIRD_PARTY_NOTICES.md) for scope, attribution and exceptions. Provider-managed material retains its own terms, including the CC BY-SA 4.0 arc42 references.
