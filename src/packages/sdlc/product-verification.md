# Product-derived verification

Every adopter requires explicitly configured PDaC `v1alpha2`; record its serialization version separately from the installed ProductShape provider version. A provider-valid v1alpha1 model is a migration input, not compliant adoption. Follow the installed Lighthouse `upgrades/pdac-v1alpha2.md` guide for existing content. ProductShape owns schemas, product artifacts, citations and external evidence validation.

During refinement, proposals, implementation and review, read the accepted model revision. When the host supplies `context.productEvidence`, read its `evidenceRoot/index.json` and reports; lifecycle and behaviour reports include provider-parsed definitions. Otherwise, inspect the provider-owned product sources and obtain current inspect/citation reports through ProductShape. Inspect the affected `LC-`, `SB-`, `UC-`, `BR-`, `FR-` and `QR-` artifacts and their neighbours, including governing rules and other relevant meaning. A source revision, baseline digest and provider citation identify the context consumed. A proposed model is awaiting its product decision and apply.

## Derive scenarios

For each applicable domain lifecycle, identify its subject, initial and terminal states, valid transitions, governing rules and invariants. Derive scenarios for accepted transitions, forbidden transitions, operations on terminal states and invariant violations. Distinguish these domain states from Lighthouse delivery stages. Record a reason when no lifecycle applies. A missing rule or observable outcome enters the Product Change process before dependent work continues.

Read each structured behaviour's context (`given`), single stimulus (`when`) and conjunctive outcomes (`then`). Keep its required `illustrates` links. For transition coverage, preserve `covers-transition.lifecycle` and `covers-transition.transition`; use separate behaviours for materially different outcomes. ProductShape validates those relationships. Lifecycle coverage alone supplies no execution result.

For each affected behaviour, record:

| Evidence | Required detail |
| --- | --- |
| Model coverage | SB ID and current provider citation; applicable lifecycle/transition, rule and requirement IDs |
| Executable coverage | Test ID and source path, scenario, level and reason for that level; explicitly missing tests |
| Execution | Run ID, source revision, model revision/digest, exact command, completed exit status and observed result; explicitly unexecuted scenarios |
| Acceptance | Required reviewer and actual decision, or pending review |

Use domain or integration tests when they prove the observable outcome. Use end-to-end tests when the outcome crosses the application boundary or a user journey requires them. Browser checks require a browser surface; command-line adopters can prove their actual command boundary without inventing a browser journey. An implementation report must retain failures, unavailable checks, uncovered behaviours and unexecuted scenarios.

## Verify external evidence

Use the installed ProductShape `evidence verify --help` and its verification-evidence schema. Emit the supported `pdac-verification-evidence/v1alpha1` document format even when model serialization is v1alpha2: those are independent version dimensions. Its run identifies the provider, `run-id`, source `revision` and results containing `test-id`, `level`, `outcome` and provider-generated `citations`. Keep the model revision or digest in the adjacent run receipt; preserve the provider's closed schema.

Run `prodshape evidence verify <evidence.json> --format json` against the current model and retain its completed result and diagnostics. A zero exit status can still accompany stale-citation warnings; inspect each citation status before claiming current applicability. Supported evidence targets are SB, FR and QR artifacts. Link a lifecycle transition through its SB rather than invent a direct LC evidence target. A valid evidence document with a failed test still records failed execution; schema or citation validation does not turn it into a passing test or acceptance.

When a citation becomes stale, retain the original run, outcome and revisions. Report its changed applicability and required revalidation separately. Re-run relevant tests against the changed source/model and produce a new evidence document; do not rewrite historical outcomes or replace historical digests to make an old run appear current.

During review, follow each behaviour through these four evidence dimensions. Confirm the supplied tests could catch the relevant forbidden transition, terminal-state operation or invariant violation. Require missing proof or an authorized, explicit deferral; passing tests do not grant product approval, merge, release or deployment authority.
