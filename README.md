# Lighthouse

Lighthouse is a small engineering baseline with a CLI, the Lighthouse Modular Backend profile, a CSS theme, native CSS recipes and a static public site.

ProductShape owns product intent, ArcShape owns architecture documentation and Lighthouse owns its packages, checks and adoption guidance. The current CLI supports `init` and `verify`; the broader delivery flow remains a product proposal rather than an implemented command surface.

## Adopt and verify

Start with the route that matches your task:

| Task | Entry point |
| --- | --- |
| Create a .NET backend | [Lighthouse Modular Backend](docs/profiles/dotnet/README.md) |
| Improve an existing backend | [Assessment and gradual adoption](docs/profiles/dotnet/adoption.md#existing-backend) |
| Implement a command/query | [Minimal API and single-file slice contract](docs/profiles/dotnet/use-cases.md) |
| Understand hard guardrails | [Implemented diagnostics and exceptions](docs/profiles/dotnet/guardrails.md) |
| Build a consistent interface | [Lighthouse UI design contract](src/packages/ui/DESIGN.md) |
| Work as an agent | [Repository/adopter instructions](AGENTS.md) |

Create a self-contained backend in a new or empty target:

```sh
npm run create:dotnet -- /tmp/Workshop --name Workshop
cd /tmp/Workshop
dotnet restore Workshop.slnx
npm run verify
```

An adopting repository owns its `lighthouse.json`. `LIGHTHOUSE.md` is its managed projection. Starter source belongs to the product after creation; updates are explicit and reviewed. See [file ownership and upgrades](docs/profiles/dotnet/adoption.md#file-ownership-and-upgrades).

## Develop Lighthouse

Requires Node.js 22 and the .NET SDK in `src/dotnet/global.json`. From this checkout:

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run verify:all
npm run gallery
```

The gallery opens at `/gallery/` on port 4173. Build the public site with `npm run build:public-site`; preview it with Wrangler Pages. The deployment commands are in [the public site guide](docs/public-site-deployment.md). `npm run verify` runs the repository checks, `npm run verify:dotnet` runs the backend profile, and `npm run test:visual` runs the browser checks.

## Repository layout

`src/` contains implementation code, packages, tests, the gallery, the public site and the optional .NET profile. `scripts/` contains repository automation. `docs/` contains maintained documentation. Root tool directories and package metadata stay where their tools discover them. Build and browser output is ignored.

## Scope

The implemented baseline covers repository checks, package boundaries, the Lighthouse Modular Backend profile, a visual theme and adoption guidance. The product proposal also describes a future delivery harness around ProductShape, ArcShape and OpenSpec; it is not presented here as implemented functionality.

## Identity

Lighthouse's visual direction and conversational voice are described in the [identity guide](docs/brand.md), with a compact icon and GitHub banner in `assets/`.

Artifacts are local and unpublished. The repository uses the decisions in [docs/adr](docs/adr/README.md), the architecture in [docs/architecture](docs/architecture/README.md), and the product definition in [docs/product](docs/product/README.md).
