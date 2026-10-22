# Adopt the Lighthouse .NET profile

## New backend

From a Lighthouse checkout:

```sh
npm run create:dotnet -- /tmp/Workshop --name Workshop
cd /tmp/Workshop
dotnet restore Workshop.slnx
npm run verify
```

The creator accepts a new directory or an existing empty directory. It validates the C# product name and refuses a populated target. It seeds a self-contained original backend, analyzer/CQRS source, tests, manifest, SDK/package policy and CI definition. No remote repository or external service is created.

Keep one command and one query before adding a second module or persistence. Change example domain behavior through product requirements, add the real identity configuration, then select persistence, tenancy and deployment only when needed. Follow [the layout](architecture.md) and [single-file contract](use-cases.md).

## Existing backend

1. Inventory framework/SDK, layout, domain seams, data ownership, authentication, analysis, tests, CI and local startup. Preserve existing work.
2. Map current code to profile defaults. Document valuable differences before changing paths or public APIs.
3. Add pinned analyzer/CQRS source from an accepted Lighthouse revision in an isolated change. Keep a repository snapshot/version record. Adapt a rule if the product uses different handler contracts or assembly naming; prove the adapter with compiler fixtures.
4. Enable one module at a time. Establish positive tests and inspect every new diagnostic; use narrow expiring exceptions during migration.
5. Choose one low-risk command/query and adopt the file contract without moving unrelated features. Add functional authorization/validation tests.
6. Run local checks, then wire them into CI. Make checks required through the product's hosting policy only after runtime and flakiness are understood.

The creator is for new products; never run it over an existing checkout.

## File ownership and upgrades

| Content | Owner after creation | Upgrade path |
| --- | --- | --- |
| Application, tests, build policy, analyzer/CQRS source and workflow | Product | Seeded snapshot, then editable; manually review Lighthouse changes, adapt and rerun verification |
| `lighthouse.json` | Product | Select baseline/profile/integration pins explicitly |
| `LIGHTHOUSE.md` | Lighthouse projection | Generate/check through the pinned local verifier |
| Lockfiles | Package manager, committed by product | Intentional restore/update, inspect resolved diff |
| `bin`, `obj`, reports | Disposable build output | Regenerate; never hand-edit |

The current creator is a source starter, not a synchronized framework installer. Drift detection covers the declared managed projection; application/tooling changes are product-owned and are not silently overwritten. There is no automatic bulk upgrade. For repeatable adoption, retain the accepted Lighthouse commit or distributed source bundle in the product's tooling record.
