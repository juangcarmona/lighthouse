# CHG-INITIAL refinement working memory

## Sitting scope and authority

This sitting checked the package boundary, initialization route, UI contract, SDLC assets, skills, commands, meta-commands and the risk of adding unnecessary concepts. The Product Change was approved and applied as the initial product baseline.

## Evidence

- The current `change.md` and all 115 proposed artifacts in this change.
- The current package manifests under `src/packages/`.
- The current distributed visual contract under `src/packages/ui/DESIGN.md`, the UI package and the Lighthouse gallery and public site.
- A reference `DESIGN.md` and architecture guide used as structural input, adapted to Lighthouse's framework-neutral CSS contract.
- The current .NET profile, creator, Aspire AppHost example and Roslyn analyzer fixtures under `docs/profiles/dotnet/` and `src/dotnet/`.
- The current initialization and verification implementation under `src/packages/cli/`.
- The maintainer's decisions recorded in this conversation.
- `npm exec -- prodshape change validate CHG-INITIAL`, which currently reports zero errors and zero warnings for the live overlay.

## Graph-guided integrity pass

| Changed or checked area | Classification | Reason |
| --- | --- | --- |
| `UC-INITIALIZE-PROJECT`, `FR-INITIALIZE-FOUNDATION`, `SB-INITIALIZE` | Affected | Initialization installs the selected harness, SDLC and UI packages, records managed paths and reports what it created or preserved. |
| `FR-SDLC-LIFECYCLE`, `UC-RUN-SDLC`, `SB-SDLC-GATES`, `BR-STAGE-GATES` | Affected | The SDLC package owns its skills, commands, meta-commands and stage contract; Lighthouse installs the package and does not duplicate its definitions. |
| `FR-PACKAGE-DELIVERY`, `TERM-PACKAGE-ARTIFACT`, `UC-ADOPT-CONSUMER` | Affected | The adoption release contains the harness, SDLC assets and the selected visual contract with independent ownership and verification. |
| `src/packages/cli` manifest schema and .NET creator | Implementation drift | The current code still emits an `agenticSdlc` integration field and the old `dotnet-backend` and `visual-theme` profile identifiers; the next implementation change must replace them with selected package/profile declarations and installation evidence. |
| `FR-AGENT-CONTROL-PLANE`, `FR-AGENT-MEMORY`, `FR-AGENT-LAUNCH`, `FR-WORKFLOW-STATE` | Checked and bounded | These remain product capabilities, but they are contracts and optional profiles rather than a second runtime platform or a new command family. |
| `FR-TRIAGE-WORK-ITEM`, `FR-LABEL-STATE`, `FR-LABEL-ROLES`, `FR-DECOMPOSE-WORK-ITEM`, `FR-HOTFIX-ROUTE`, `FR-STACKED-CHANGES` | Checked and retained | Triage, simple labels, hotfixes, decomposition and stacked changes are explicit delivery capabilities already requested by the maintainer. |
| `TERM-PROFILE`, the visual package work and current CSS packages | Affected | UI is one independent package containing tokens, native recipes and the design guide; framework-specific behavioural components remain adopter-owned until repeated use justifies promotion. |
| `FR-PROFILE-CONTRACT`, `UC-ADOPT-PROFILE`, `TERM-PROFILE` and the current .NET profile | Checked | The .NET backend is a candidate technical profile. Its public name, package boundary and frontend composition remain open decisions. |
| ProductShape, ArcShape and OpenSpec ownership | Checked and unchanged | These tools retain their own models, files and lifecycle contracts. Lighthouse installs or connects their supported routes. |

## Decisions recorded in this sitting

- “No configura agentic SDLC. El SDLC es uno de bursitis paquetes.” The product language now calls this the SDLC package and does not present it as a Lighthouse integration.
- “Eso lo hacemos al instalar skills, comandos y meta comandos.” The SDLC package owns and distributes those assets.
- “Es parte del init.” `lighthouse init` installs the selected SDLC package together with the harness and UI package.
- The UI contract is explicit: tokens and recipes are the reusable visual foundation, and `DESIGN.md` is the human and agent guide/template for applying it.
- During `init`, Lighthouse may ask for the adopter's desired colours. When no override is supplied, the default Lighthouse palette applies. A dedicated colour command is not required.
- During `init`, the adopter receives a soft guardrail skill that knows the design contract and, where the stack permits it, a deterministic hard hook/verifier that checks token use.
- The UI delivery is one independent package, separate from the Lighthouse harness package. It contains tokens, native recipes and `DESIGN.md`; it does not add a framework runtime.
- The baseline owns a predictable repository structure with `src/`, `docs/` and the conventional automation and integration surfaces.
- Aspire is always part of an initialized application as the composition and execution boundary, including frontend-only applications; Lighthouse does not create a Lighthouse-owned backend when the adopter did not select one.
- When an application has a Lighthouse-owned backend, the default full-stack profile is a feature-aligned modular monolith with a well-architected frontend, explicit bounded contexts and a clear feature-to-backend mapping.
- The full-stack profile carries the established engineering practices: red-green development, unit tests first, integration and other test layers after the unit slice, and end-to-end tests with evidence catalogued by bounded context; NSubstitute is the default .NET test double library where applicable.
- A microservice request selects a service profile instead of receiving the modular-monolith backend by default. Other stacks select their own profiles and conventions.
- Existing repositories provide implementation evidence and examples for templating and agent guidance. Lighthouse must describe the practices and allow adopter-configured exemplar references without embedding repository identities or private provenance in the product.
- The core lifecycle commands are `triage`, `refine`, `propose`, `implement`, `integrate` and `review`.
- `status` is a utility. `hotfix`, `decompose` and bounded `ff` are route or meta-command capabilities, not additional lifecycle stages.
- Skills, commands and meta-commands are package assets. They do not each become a separate product artifact or npm package.
- The refinement does not add `deep-review`, `backfill`, `archive` or `reconstruct-change` to the Lighthouse command surface.

## Simplification check

The product has one initialization entrypoint, one verification entrypoint and one six-stage delivery vocabulary. Routes compose those stages and do not create parallel lifecycles. Labels represent declared tracker state or transient route requests; they do not become a second workflow engine. Agent memory, workflow state and CodeGraph are bounded contracts or external services, not embedded platform subsystems. The public site is a projection and does not become another authority.

The initial implementation still has a broad product boundary because the maintainer wants the harness to cover triage, hotfixes, decomposition, stacked changes, agent runs, memory, CodeGraph and public documentation. The first adoption fixture can prove a smaller vertical slice while retaining those capabilities as optional package or profile surfaces. The UI package boundary is fixed; the application profile contract now determines backend composition and stack-specific delivery.

## Remaining questions and conscious deferrals

- The final npm name and adopter path for the SDLC package remain an adapter and packaging decision.
- The exact adopter paths for provider-specific skills and commands remain an adapter decision owned by the SDLC package and host integrations.
- The concrete hard UI checks remain stack-specific and should be created by initialization only where the selected stack can verify them deterministically.
- The public names and package boundaries of future stack profiles remain deferred; the first release may distribute them as profile assets of the Lighthouse installer.
- The smallest `.lighthouse/` state layout, memory persistence and CodeGraph checks remain implementation slices; they do not justify extra user-facing commands.
- The first fixture can prove the normal route and one expedited route before exercising every optional integration.

The current CLI code still contains the old `agenticSdlc` manifest field. This sitting records the product decision; removing that field belongs to the implementation change that updates the manifest schema and adopter projection.

## Readiness conclusion

This refinement cycle included the initialization profile contract and the application architecture baseline. The change is now applied and its accepted artifacts are the product model under `docs/product/model/`.
